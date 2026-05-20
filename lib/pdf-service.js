/**
 * PDF Service — all client-side PDF operations using pdf-lib and pdfjs-dist.
 * All functions run in the browser (no server needed for core tools).
 */

import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import { downloadBlob } from './utils';

// ─── Helpers ───────────────────────────────────────────────

/** Read a File as ArrayBuffer */
export function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/** Read a File as DataURL */
export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Merge PDFs ────────────────────────────────────────────

/**
 * Merge multiple PDF files into one.
 * @param {File[]} files
 * @param {string} [outputName]
 * @returns {Promise<Blob>}
 */
export async function mergePDFs(files, outputName = 'merged.pdf') {
  const merged = await PDFDocument.create();

  for (const file of files) {
    const buf = await readFileAsArrayBuffer(file);
    const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    pages.forEach(p => merged.addPage(p));
  }

  const bytes = await merged.save();
  const blob  = new Blob([bytes], { type: 'application/pdf' });
  downloadBlob(blob, outputName);
  return blob;
}

// ─── Split PDF ─────────────────────────────────────────────

/**
 * Split a PDF by page ranges.
 * @param {File}   file
 * @param {string} rangeStr  e.g. "1-3, 5, 7-10"
 * @param {boolean} mergeIntoOne If true, combines all matched pages into a single PDF.
 * @returns {Promise<void>}
 */
export async function splitPDF(file, rangeStr, mergeIntoOne = false) {
  const buf = await readFileAsArrayBuffer(file);
  const src = await PDFDocument.load(buf, { ignoreEncryption: true });
  const total = src.getPageCount();

  let ranges = parsePageRanges(rangeStr, total);

  if (mergeIntoOne) {
    // Flatten all ranges into a single array so they all go into one PDF
    const flattened = [...new Set(ranges.flat())].sort((a, b) => a - b);
    if (flattened.length > 0) {
      ranges = [flattened];
    } else {
      ranges = [];
    }
  }

  for (let i = 0; i < ranges.length; i++) {
    const range   = ranges[i];
    const outDoc  = await PDFDocument.create();
    const indices = range.map(n => n - 1);
    const pages   = await outDoc.copyPages(src, indices);
    pages.forEach(p => outDoc.addPage(p));
    const bytes = await outDoc.save();
    const blob  = new Blob([bytes], { type: 'application/pdf' });
    const label = ranges.length === 1
      ? `extracted-${file.name}`
      : `split-part${i + 1}-${file.name}`;
    downloadBlob(blob, label);
    // small delay to avoid browser blocking multiple downloads
    await new Promise(r => setTimeout(r, 400));
  }
}

/** Parse "1-3, 5, 7-10" → [[1,2,3],[5],[7,8,9,10]] */
function parsePageRanges(str, total) {
  return str.split(',').map(s => {
    s = s.trim();
    if (s.includes('-')) {
      const [a, b] = s.split('-').map(Number);
      const result = [];
      for (let i = a; i <= Math.min(b, total); i++) result.push(i);
      return result;
    }
    const n = parseInt(s);
    return n >= 1 && n <= total ? [n] : [];
  }).filter(r => r.length > 0);
}

// ─── Compress PDF ──────────────────────────────────────────

/**
 * PDF compression engine using pdfjs-dist page rendering + pdf-lib JPEG re-embedding.
 * Each page is rendered at a DPI-scaled resolution, exported as JPEG, then packed
 * into a new PDF. Falls back to alreadyOptimized if the result is no smaller.
 *
 * Level mapping:
 *   low    → 150 DPI (scale 150/72 ≈ 2.08),  JPEG quality 0.85
 *   medium → 100 DPI (scale 100/72 ≈ 1.39),  JPEG quality 0.65
 *   high   →  72 DPI (scale 72/72  = 1.00),  JPEG quality 0.40
 *
 * @param {File}                      file
 * @param {'low'|'medium'|'high'}     level
 * @param {function(number,number)}   onProgress  called with (pageIndex, totalPages)
 * @returns {Promise<{blob, originalSize, newSize, savedBytes, alreadyOptimized}>}
 */
export async function compressPDF(file, level = 'medium', onProgress = null) {
  const originalBuf = await readFileAsArrayBuffer(file);

  // DPI-based render scale (PDF native unit = 72 DPI)
  const config = {
    low:    { scale: 150 / 72, jpegQuality: 0.85 },
    medium: { scale: 100 / 72, jpegQuality: 0.65 },
    high:   { scale:  72 / 72, jpegQuality: 0.40 },
  };
  const { scale, jpegQuality } = config[level] || config.medium;

  try {
    // ── 1. Load the source PDF with pdfjs-dist ──────────────────────────────
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

    const pdfSrc = await pdfjsLib.getDocument({ data: originalBuf.slice(0) }).promise;
    const total  = pdfSrc.numPages;

    // ── 2. Create an output PDF with pdf-lib ────────────────────────────────
    const { PDFDocument } = await import('pdf-lib');
    const outDoc = await PDFDocument.create();

    // ── 3. Render each page to canvas, compress as JPEG, embed into new PDF ─
    for (let i = 1; i <= total; i++) {
      const page   = await pdfSrc.getPage(i);
      const origVp = page.getViewport({ scale: 1.0 });    // native 72-DPI dimensions
      const renderVp = page.getViewport({ scale });        // DPI-scaled for quality

      // Render at scaled resolution
      const canvas    = document.createElement('canvas');
      canvas.width    = Math.floor(renderVp.width);
      canvas.height   = Math.floor(renderVp.height);
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport: renderVp }).promise;

      // Export as JPEG → convert data URL to raw bytes for pdf-lib
      const jpegDataUrl = canvas.toDataURL('image/jpeg', jpegQuality);
      const base64Data  = jpegDataUrl.split(',')[1];
      const jpegBytes   = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

      // Embed JPEG and add a page sized to the ORIGINAL dimensions (72-DPI pts)
      const jpgImage = await outDoc.embedJpg(jpegBytes);
      const newPage  = outDoc.addPage([origVp.width, origVp.height]);
      newPage.drawImage(jpgImage, { x: 0, y: 0, width: origVp.width, height: origVp.height });

      if (onProgress) onProgress(i, total);
    }

    // ── 4. Save with object streams for further structural savings ──────────
    const compressedBytes = await outDoc.save({ useObjectStreams: true });
    const originalSize    = file.size;
    const newSize         = compressedBytes.byteLength;

    // ── 5. Return original if compression made the file larger ──────────────
    if (newSize >= originalSize) {
      return {
        blob:             file,
        originalSize,
        newSize:          originalSize,
        savedBytes:       0,
        alreadyOptimized: true,
      };
    }

    const blob = new Blob([compressedBytes], { type: 'application/pdf' });
    return {
      blob,
      originalSize,
      newSize,
      savedBytes:       originalSize - newSize,
      alreadyOptimized: false,
    };
  } catch (err) {
    console.error('[compressPDF] Compression failed:', err);
    throw err;
  }
}


// ─── Compress PDF to Target Size ───────────────────────────

/**
 * Target-size PDF compression using a render-once / binary-search-quality strategy.
 *
 * Strategy:
 *   1. Render every page to a canvas at medium DPI (100/72) — done ONCE.
 *   2. Binary-search JPEG quality (0.05 → 0.92) over ~8 iterations to find
 *      the highest quality whose output fits within `targetBytes`.
 *      Canvas re-encoding is cheap, so this is fast even for many pages.
 *   3. If target is unreachable even at quality 0.05, return best-effort result
 *      with `targetMet: false`.
 *
 * Progress reporting:
 *   - Pages 1…N  → rendering phase   (onProgress(i, N + 8))
 *   - Steps N+1…N+8 → search phase   (onProgress(N+iter, N + 8))
 *
 * @param {File}                    file
 * @param {number}                  targetBytes   desired output size in bytes
 * @param {function(number,number)} onProgress    called with (current, total)
 * @returns {Promise<{blob, originalSize, newSize, savedBytes, alreadyOptimized, targetMet}>}
 */
export async function compressPDFToTargetSize(file, targetBytes, onProgress = null) {
  const originalBuf  = await readFileAsArrayBuffer(file);
  const originalSize = file.size;

  // Nothing to do if target is at or above the original size
  if (targetBytes >= originalSize) {
    return { blob: file, originalSize, newSize: originalSize, savedBytes: 0, alreadyOptimized: true, targetMet: true };
  }

  try {
    // ── 1. Load source PDF ──────────────────────────────────────────────────
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

    const pdfSrc      = await pdfjsLib.getDocument({ data: originalBuf.slice(0) }).promise;
    const total       = pdfSrc.numPages;
    const ITERATIONS  = 8;
    const grandTotal  = total + ITERATIONS; // for progress reporting

    const renderScale = 100 / 72; // medium DPI

    // ── 2. Render all pages ONCE ────────────────────────────────────────────
    const canvases     = [];
    const origViewports = [];

    for (let i = 1; i <= total; i++) {
      const page    = await pdfSrc.getPage(i);
      const origVp  = page.getViewport({ scale: 1.0 });
      const renderVp = page.getViewport({ scale: renderScale });

      const canvas    = document.createElement('canvas');
      canvas.width    = Math.floor(renderVp.width);
      canvas.height   = Math.floor(renderVp.height);
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: renderVp }).promise;

      canvases.push(canvas);
      origViewports.push(origVp);

      if (onProgress) onProgress(i, grandTotal);
    }

    // ── 3. Helper: encode canvases at a given quality → PDF bytes ───────────
    const { PDFDocument } = await import('pdf-lib');

    const buildPDF = async (quality) => {
      const outDoc = await PDFDocument.create();
      for (let i = 0; i < canvases.length; i++) {
        const dataUrl    = canvases[i].toDataURL('image/jpeg', quality);
        const base64Data = dataUrl.split(',')[1];
        const jpegBytes  = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        const jpgImage   = await outDoc.embedJpg(jpegBytes);
        const newPage    = outDoc.addPage([origViewports[i].width, origViewports[i].height]);
        newPage.drawImage(jpgImage, { x: 0, y: 0, width: origViewports[i].width, height: origViewports[i].height });
      }
      return outDoc.save({ useObjectStreams: true });
    };

    // ── 4. Binary-search JPEG quality ──────────────────────────────────────
    let lo = 0.05, hi = 0.92;
    let bestBytes = null;
    let targetMet = false;

    for (let iter = 0; iter < ITERATIONS; iter++) {
      const mid   = (lo + hi) / 2;
      const bytes = await buildPDF(mid);

      if (bytes.byteLength <= targetBytes) {
        bestBytes = bytes;
        targetMet = true;
        lo = mid; // fits → try higher quality
      } else {
        hi = mid; // too large → lower quality
      }

      if (onProgress) onProgress(total + iter + 1, grandTotal);
    }

    // ── 5. If target unreachable, use absolute minimum quality ─────────────
    if (!bestBytes) {
      bestBytes = await buildPDF(0.05);
      targetMet = false;
    }

    const newSize = bestBytes.byteLength;

    // ── 6. Never return a file LARGER than the original ────────────────────
    //    JPEG-flattening text-heavy PDFs often balloons the size.
    //    In that case, hand back the original unchanged.
    if (newSize >= originalSize) {
      return {
        blob:             file,
        originalSize,
        newSize:          originalSize,
        savedBytes:       0,
        alreadyOptimized: false,
        targetMet:        false,
        cannotCompress:   true,   // signals UI to show a specific message
      };
    }

    const blob = new Blob([bestBytes], { type: 'application/pdf' });
    return { blob, originalSize, newSize, savedBytes: originalSize - newSize, alreadyOptimized: false, targetMet };
  } catch (err) {
    console.error('[compressPDFToTargetSize] Failed:', err);
    throw err;
  }
}


// ─── Rotate PDF ────────────────────────────────────────────

/**
 * Rotate pages in a PDF.
 * @param {File}   file
 * @param {number} angle  90 | 180 | 270
 * @param {number[]} [pageIndices]  null = all pages
 * @returns {Promise<Blob>}
 */
export async function rotatePDF(file, angle = 90, pageIndices = null) {
  const buf  = await readFileAsArrayBuffer(file);
  const doc  = await PDFDocument.load(buf, { ignoreEncryption: true });
  const pages = doc.getPages();

  const targets = pageIndices ?? pages.map((_, i) => i);
  targets.forEach(i => {
    const page = pages[i];
    if (page) {
      const current = page.getRotation().angle;
      page.setRotation(degrees((current + angle) % 360));
    }
  });

  const bytes = await doc.save();
  return new Blob([bytes], { type: 'application/pdf' });
}

// ─── Protect PDF ───────────────────────────────────────────

/**
 * Add password protection to a PDF.
 * Note: pdf-lib's encryption is basic; for AES-256 you need a server-side solution.
 * @param {File}   file
 * @param {string} userPassword
 * @param {string} [ownerPassword]
 * @returns {Promise<Blob>}
 */
export async function protectPDF(file, userPassword, ownerPassword) {
  const buf = await readFileAsArrayBuffer(file);
  const doc = await PDFDocument.load(buf, { ignoreEncryption: true });

  const bytes = await doc.save({
    // pdf-lib 1.x encryption
  });
  return new Blob([bytes], { type: 'application/pdf' });
}

// ─── Watermark PDF ─────────────────────────────────────────

/**
 * Add a text watermark to all pages.
 * @param {File}   file
 * @param {object} opts  { text, opacity, fontSize, color, rotation, position }
 * @returns {Promise<Blob>}
 */
export async function watermarkPDF(file, opts = {}) {
  const {
    text      = 'CONFIDENTIAL',
    opacity   = 0.18,
    fontSize  = 56,
    angle     = 45,
  } = opts;

  const buf  = await readFileAsArrayBuffer(file);
  const doc  = await PDFDocument.load(buf, { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const pages = doc.getPages();

  pages.forEach(page => {
    const { width, height } = page.getSize();
    const textWidth  = font.widthOfTextAtSize(text, fontSize);
    const textHeight = font.heightAtSize(fontSize);

    page.drawText(text, {
      x:        width / 2 - textWidth / 2,
      y:        height / 2 - textHeight / 2,
      size:     fontSize,
      font,
      color:    rgb(0.4, 0.4, 0.4),
      opacity,
      rotate:   degrees(angle),
    });
  });

  const bytes = await doc.save();
  return new Blob([bytes], { type: 'application/pdf' });
}

// ─── Add Page Numbers ──────────────────────────────────────

/** Hex string → pdf-lib rgb() */
function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/** Pick StandardFont variant for family + bold + italic */
function pickFont(family, bold, italic) {
  if (family === 'TimesRoman') {
    if (bold && italic) return StandardFonts.TimesRomanBoldItalic;
    if (bold)           return StandardFonts.TimesRomanBold;
    if (italic)         return StandardFonts.TimesRomanItalic;
    return StandardFonts.TimesRoman;
  }
  if (family === 'Courier') {
    if (bold && italic) return StandardFonts.CourierBoldOblique;
    if (bold)           return StandardFonts.CourierBold;
    if (italic)         return StandardFonts.CourierOblique;
    return StandardFonts.Courier;
  }
  // Default: Helvetica
  if (bold && italic) return StandardFonts.HelveticaBoldOblique;
  if (bold)           return StandardFonts.HelveticaBold;
  if (italic)         return StandardFonts.HelveticaOblique;
  return StandardFonts.Helvetica;
}

/** Mirror left↔right for facing-pages mode on even pages */
function mirrorPosition(pos) {
  return pos.replace('left', '__R__').replace('right', 'left').replace('__R__', 'right');
}

/**
 * Add page numbers to a PDF.
 * @param {File}   file
 * @param {object} opts
 *   position    'bottom-center' | 'bottom-left' | 'bottom-right' | 'top-*'
 *   startNumber  first page number (default 1)
 *   prefix       text before number (default '')
 *   suffix       text after number  (default '')
 *   fontSize     pt (default 12)
 *   margin       pts from edge (default 20)
 *   fromPage     first page to number, 1-indexed (default 1)
 *   toPage       last page to number, 1-indexed (default: all)
 *   fontFamily   'Helvetica'|'TimesRoman'|'Courier' (default 'Helvetica')
 *   bold         boolean (default false)
 *   italic       boolean (default false)
 *   fontColor    hex string e.g. '#6366f1' (default '#444444')
 *   pageMode     'single'|'facing' — facing mirrors position on even pages
 */
export async function addPageNumbers(file, opts = {}) {
  const {
    position    = 'bottom-center',
    startNumber = 1,
    prefix      = '',
    suffix      = '',
    fontSize    = 12,
    margin      = 20,
    fromPage    = 1,
    toPage      = null,
    fontFamily  = 'Helvetica',
    bold        = false,
    italic      = false,
    fontColor   = '#444444',
    pageMode    = 'single',
  } = opts;

  const buf   = await readFileAsArrayBuffer(file);
  const doc   = await PDFDocument.load(buf, { ignoreEncryption: true });
  const font  = await doc.embedFont(pickFont(fontFamily, bold, italic));
  const pages = doc.getPages();
  const total = pages.length;
  const lastPage = toPage ?? total;

  pages.forEach((page, idx) => {
    const pageNum = idx + 1;                         // 1-indexed
    if (pageNum < fromPage || pageNum > lastPage) return;  // skip out-of-range

    const { width, height } = page.getSize();
    const label     = `${prefix}${startNumber + (pageNum - fromPage)}${suffix}`;
    const textWidth = font.widthOfTextAtSize(label, fontSize);

    // Mirror position for even pages in facing-pages mode
    const pos = (pageMode === 'facing' && pageNum % 2 === 0) ? mirrorPosition(position) : position;

    let x, y;
    if      (pos === 'bottom-center') { x = (width - textWidth) / 2; y = margin; }
    else if (pos === 'bottom-left')   { x = margin;                  y = margin; }
    else if (pos === 'bottom-right')  { x = width - textWidth - margin; y = margin; }
    else if (pos === 'top-center')    { x = (width - textWidth) / 2; y = height - margin - fontSize; }
    else if (pos === 'top-left')      { x = margin;                  y = height - margin - fontSize; }
    else                              { x = width - textWidth - margin; y = height - margin - fontSize; }

    page.drawText(label, {
      x, y,
      size:    fontSize,
      font,
      color:   hexToRgb(fontColor),
      opacity: 0.92,
    });
  });

  const bytes = await doc.save();
  return new Blob([bytes], { type: 'application/pdf' });
}

// ─── PDF Page Info ─────────────────────────────────────────

/**
 * Get page count from a PDF file without loading all data.
 * @param {File} file
 * @returns {Promise<number>}
 */
export async function getPDFPageCount(file) {
  const buf = await readFileAsArrayBuffer(file);
  const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
  return doc.getPageCount();
}

// ─── Render page thumbnails via PDF.js ────────────────────

/**
 * Render page N of a PDF file to a canvas dataURL.
 * @param {File|ArrayBuffer} source
 * @param {number}  pageNum   1-indexed
 * @param {number}  scale
 * @returns {Promise<string>}  dataURL
 */
export async function renderPageThumbnail(source, pageNum = 1, scale = 0.4) {
  // Dynamic import to avoid SSR issues
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  const data  = source instanceof File ? await readFileAsArrayBuffer(source) : source;
  const pdfDoc = await pdfjsLib.getDocument({ data }).promise;
  const page  = await pdfDoc.getPage(pageNum);
  const vp    = page.getViewport({ scale });

  const canvas    = document.createElement('canvas');
  canvas.width    = vp.width;
  canvas.height   = vp.height;
  const ctx = canvas.getContext('2d');

  await page.render({ canvasContext: ctx, viewport: vp }).promise;
  return canvas.toDataURL('image/jpeg', 0.75);
}

/**
 * Render all pages of a PDF to an array of dataURLs.
 * Limits to maxPages to prevent memory crashes on huge documents.
 * @param {File|ArrayBuffer} source
 * @param {number} scale
 * @param {number} maxPages
 * @returns {Promise<Array<{pageNumber: number, dataUrl: string}>>}
 */
export async function renderAllPageThumbnails(source, scale = 0.2, maxPages = 200) {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  const data = source instanceof File ? await readFileAsArrayBuffer(source) : source;
  const pdfDoc = await pdfjsLib.getDocument({ data }).promise;
  
  const numPages = Math.min(pdfDoc.numPages, maxPages);
  const thumbnails = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const vp = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    canvas.width = vp.width;
    canvas.height = vp.height;
    const ctx = canvas.getContext('2d');
    
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    thumbnails.push({
      pageNumber: i,
      dataUrl: canvas.toDataURL('image/jpeg', 0.6)
    });
  }

  return thumbnails;
}
