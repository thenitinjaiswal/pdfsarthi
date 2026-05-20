/**
 * OCR Service — extract text from scanned PDFs/images using Tesseract.js.
 * Improvements over v1:
 *   - renderPageForOCR() renders at 2.5× scale for significantly better accuracy
 *   - runOCRAllPages() processes every page and reports per-page progress
 */

export const OCR_LANGUAGES = [
  { code: 'eng',     label: 'English' },
  { code: 'hin',     label: 'Hindi' },
  { code: 'fra',     label: 'French' },
  { code: 'deu',     label: 'German' },
  { code: 'spa',     label: 'Spanish' },
  { code: 'por',     label: 'Portuguese' },
  { code: 'ita',     label: 'Italian' },
  { code: 'jpn',     label: 'Japanese' },
  { code: 'chi_sim', label: 'Chinese (Simplified)' },
  { code: 'ara',     label: 'Arabic' },
  { code: 'rus',     label: 'Russian' },
  { code: 'kor',     label: 'Korean' },
];

// ── High-DPI canvas render for one PDF page ─────────────────────────────────

/**
 * Render a single PDF page to a canvas at OCR-optimal DPI (scale 2.5 = ~180 DPI).
 * @param {object} pdfPage  pdfjs page object
 * @returns {HTMLCanvasElement}
 */
async function renderPageForOCR(pdfPage) {
  const OCR_SCALE = 2.5;                          // 72 DPI × 2.5 ≈ 180 DPI
  const vp     = pdfPage.getViewport({ scale: OCR_SCALE });
  const canvas = document.createElement('canvas');
  canvas.width  = Math.floor(vp.width);
  canvas.height = Math.floor(vp.height);
  const ctx = canvas.getContext('2d');
  await pdfPage.render({ canvasContext: ctx, viewport: vp }).promise;
  return canvas;
}

// ── Single source OCR (image file / dataURL / canvas) ───────────────────────

/**
 * Run OCR on a single image source.
 * @param {File|HTMLCanvasElement|string} source
 * @param {string}   lang
 * @param {function} onProgress  (0–100)
 */
export async function runOCR(source, lang = 'eng', onProgress) {
  const Tesseract = (await import('tesseract.js')).default;
  const { data } = await Tesseract.recognize(source, lang, {
    logger: m => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });
  return data.text;
}

// ── Multi-page PDF OCR ───────────────────────────────────────────────────────

/**
 * OCR every page of a PDF file.
 * Renders each page at 2.5× scale for maximum accuracy, then runs Tesseract.
 *
 * @param {File}   file
 * @param {string} lang   Tesseract language code
 * @param {function(pageIndex: number, total: number, pageProgress: number)} onProgress
 * @returns {Promise<Array<{pageNumber: number, text: string}>>}
 */
/**
 * OCR every page of a PDF file (or a specific subset of pages).
 *
 * @param {File}        file
 * @param {string}      lang          Tesseract language code
 * @param {function}    onProgress    (pageIndex, totalToProcess, pageProgress%)
 * @param {number[]|null} pageNumbers  1-indexed pages to process (null = all pages)
 * @returns {Promise<Array<{pageNumber: number, text: string}>>}
 */
export async function runOCRAllPages(file, lang = 'eng', onProgress, pageNumbers = null) {
  // Load pdfjs
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  const buf    = await file.arrayBuffer();
  const pdfSrc = await pdfjsLib.getDocument({ data: buf }).promise;
  const total  = pdfSrc.numPages;

  // Build the list of pages to process (validated & sorted)
  const pagesToProcess = pageNumbers
    ? [...new Set(pageNumbers)].filter(n => n >= 1 && n <= total).sort((a, b) => a - b)
    : Array.from({ length: total }, (_, i) => i + 1);

  const Tesseract = (await import('tesseract.js')).default;
  const results   = [];

  for (let idx = 0; idx < pagesToProcess.length; idx++) {
    const pageNum = pagesToProcess[idx];
    const page    = await pdfSrc.getPage(pageNum);
    const canvas  = await renderPageForOCR(page);

    const { data } = await Tesseract.recognize(canvas, lang, {
      logger: m => {
        if (m.status === 'recognizing text' && onProgress) {
          // Report: which page we're on out of how many we're processing
          onProgress(pageNum, pagesToProcess.length, Math.round(m.progress * 100));
        }
      },
    });

    results.push({ pageNumber: pageNum, text: data.text.trim() });
  }

  return results;
}

