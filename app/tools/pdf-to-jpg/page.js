'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ImageDown, Loader, Download, FileText, CheckCircle,
  BookOpen, LayoutGrid, Square, CheckSquare
} from 'lucide-react';
import ToolHeader from '@/components/tools/ToolHeader';
import UploadZone from '@/components/tools/UploadZone';
import { useToast } from '@/hooks/useToast';
import { renderAllPageThumbnails, readFileAsArrayBuffer } from '@/lib/pdf-service';
import { formatSize, downloadBlob } from '@/lib/utils';

// ─── Thumbnail card ─────────────────────────────────────────
function PageCard({ page, selected, isSelectMode, onSelect, onDownload, downloadingPage }) {
  const isDownloading = downloadingPage === page.pageNumber;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: Math.min(page.pageNumber * 0.02, 0.4) }}
      onClick={() => isSelectMode ? onSelect(page.pageNumber) : null}
      className={`relative rounded-xl overflow-hidden border-2 transition-all aspect-[3/4] group ${
        isSelectMode ? 'cursor-pointer' : ''
      } ${
        selected
          ? 'border-brand-500 ring-2 ring-brand-500/30'
          : 'border-white/10 hover:border-brand-500/40'
      }`}
    >
      <img src={page.dataUrl} alt={`Page ${page.pageNumber}`} className="w-full h-full object-contain block bg-white" />

      {/* Dimming overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />

      {/* Selection indicators */}
      {isSelectMode && selected && (
        <div className="absolute top-1.5 left-1.5 w-4 h-4 rounded-full bg-brand-500 flex items-center justify-center shadow">
          <CheckCircle size={10} className="text-white" />
        </div>
      )}
      {isSelectMode && !selected && (
        <div className="absolute top-1.5 left-1.5 w-4 h-4 rounded-full border border-white/40 group-hover:border-white/80 shadow bg-black/20" />
      )}

      {/* Page number */}
      <div className="absolute bottom-1.5 left-1.5 bg-black/60 text-[9px] font-bold text-white px-1.5 py-0.5 rounded backdrop-blur-sm">
        {page.pageNumber}
      </div>

      {/* Individual Download button */}
      <div className={`absolute bottom-1.5 right-1.5 transition-opacity ${isDownloading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        <button
          onClick={(e) => { e.stopPropagation(); onDownload(page.pageNumber); }}
          disabled={isDownloading}
          className="flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded bg-brand-500/90 text-white hover:bg-brand-500 shadow-lg backdrop-blur-sm transition-colors disabled:opacity-50"
        >
          {isDownloading ? <Loader size={10} className="animate-spin" /> : <Download size={10} />}
          JPG
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main Component ─────────────────────────────────────────
export default function PdfToJpgPage() {
  const [file, setFile] = useState(null);
  const [thumbnails, setThumbnails] = useState([]);
  const [thumbLoading, setThumbLoading] = useState(false);

  // Scope: 'all' or 'selected'
  const [scope, setScope] = useState('all');
  const [selected, setSelected] = useState(new Set());

  // Export settings
  const [quality, setQuality] = useState(0.92);
  const [scale, setScale] = useState(2.0); // 1=Standard, 2=High, 3=Ultra

  // Export state
  const [loading, setLoading] = useState(false);
  const [downloadingPage, setDownloadingPage] = useState(null); // tracking individual download
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const toast = useToast();

  // ── File Load & Thumbnails ──
  useEffect(() => {
    if (!file) {
      setThumbnails([]); setSelected(new Set()); setScope('all');
      return;
    }

    setThumbLoading(true);
    setThumbnails([]);
    setSelected(new Set());
    setScope('all');

    renderAllPageThumbnails(file, 0.25, 100)
      .then(pages => setThumbnails(pages))
      .catch(() => toast.error('Could not render PDF thumbnails.'))
      .finally(() => setThumbLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  // ── Selection Logic ──
  const toggleSelect = useCallback((num) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(num) ? next.delete(num) : next.add(num);
      return next;
    });
  }, []);

  const selectAll = () => setSelected(new Set(thumbnails.map(p => p.pageNumber)));
  const deselectAll = () => setSelected(new Set());

  // ── Conversion & Export Logic ──
  const convertAndDownload = async (pagesToConvert, isSingle = false) => {
    if (!file || pagesToConvert.length === 0) return;

    if (isSingle) {
      setDownloadingPage(pagesToConvert[0]);
    } else {
      setLoading(true);
    }

    setProgress({ current: 0, total: pagesToConvert.length });

    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

      const buf = await readFileAsArrayBuffer(file);
      const pdfDoc = await pdfjsLib.getDocument({ data: buf }).promise;

      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      for (let i = 0; i < pagesToConvert.length; i++) {
        const pageNum = pagesToConvert[i];
        const page = await pdfDoc.getPage(pageNum);
        const vp = page.getViewport({ scale });
        
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(vp.width);
        canvas.height = Math.floor(vp.height);
        
        const ctx = canvas.getContext('2d', { alpha: false });
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        const dataUrl = canvas.toDataURL('image/jpeg', quality);

        const res = await fetch(dataUrl);
        const blob = await res.blob();
        zip.file(`page-${pageNum}.jpg`, blob);

        setProgress({ current: i + 1, total: pagesToConvert.length });
      }

      const basename = file.name.replace(/\.pdf$/i, '');

      if (pagesToConvert.length === 1) {
        // Single file download
        const pageNum = pagesToConvert[0];
        const imgBlob = await zip.file(`page-${pageNum}.jpg`).async('blob');
        downloadBlob(imgBlob, `${basename}-page-${pageNum}.jpg`);
        toast.success(`Downloaded Page ${pageNum} as JPG!`);
      } else {
        // ZIP download
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(zipBlob, `${basename}-images.zip`);
        toast.success(`Downloaded ${pagesToConvert.length} images as ZIP!`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Conversion failed.');
    } finally {
      setLoading(false);
      setDownloadingPage(null);
    }
  };

  const handleMainConvert = () => {
    const pagesToConvert = (scope === 'selected' && selected.size > 0)
      ? [...selected].sort((a, b) => a - b)
      : thumbnails.map(p => p.pageNumber);

    if (scope === 'selected' && selected.size === 0) {
      toast.warning('Select at least one page first.');
      return;
    }

    convertAndDownload(pagesToConvert, false);
  };

  const handleSingleDownload = (pageNum) => {
    convertAndDownload([pageNum], true);
  };

  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
  const numPages = thumbnails.length;

  return (
    <div>
      <ToolHeader icon={ImageDown} title="PDF to JPG" description="Convert every page of your PDF into high-resolution JPG images." />

      <div className="grid lg:grid-cols-5 gap-6 items-start">
        {/* ── Left: File + Thumbnails ─────────────────────── */}
        <div className="lg:col-span-3 space-y-4">
          {!file ? (
            <UploadZone onFiles={([f]) => setFile(f)} accept=".pdf" label="Select PDF to Convert" />
          ) : (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-5">
              
              {/* File header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-brand-500/15 flex items-center justify-center shrink-0">
                  <FileText size={18} className="text-brand-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-dark-100 truncate">{file.name}</p>
                  <p className="text-xs text-dark-500 mt-0.5">{formatSize(file.size)}</p>
                </div>
                {numPages > 0 && (
                  <div className="flex items-center gap-1.5 bg-brand-500/15 border border-brand-500/25 rounded-lg px-3 py-1.5 shrink-0">
                    <BookOpen size={13} className="text-brand-400" />
                    <span className="text-xs font-bold text-brand-300">{numPages} pg</span>
                  </div>
                )}
                <button onClick={() => setFile(null)} className="text-xs text-dark-600 hover:text-red-400 transition-colors shrink-0 px-2 py-1 rounded-lg hover:bg-red-500/10">
                  Remove
                </button>
              </div>

              {/* Thumb loading */}
              {thumbLoading && (
                <div className="flex items-center justify-center h-48 rounded-xl bg-dark-900/60 border border-white/5">
                  <div className="flex flex-col items-center gap-3">
                    <Loader size={22} className="animate-spin text-brand-400" />
                    <p className="text-xs text-dark-500">Rendering pages...</p>
                  </div>
                </div>
              )}

              {/* Thumbnail grid */}
              {!thumbLoading && thumbnails.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] text-dark-500 uppercase font-bold tracking-widest flex items-center gap-1.5">
                      <LayoutGrid size={12} /> Document Pages
                    </p>
                    
                    {/* Scope toggle */}
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => { setScope('all'); setSelected(new Set()); }}
                        className={`text-[10px] px-2 py-1 rounded-lg border font-semibold transition-all ${
                          scope === 'all' ? 'border-brand-500/50 bg-brand-500/10 text-brand-300' : 'border-white/8 text-dark-600 hover:border-white/20'
                        }`}>
                        All
                      </button>
                      <button onClick={() => setScope('selected')}
                        className={`text-[10px] px-2 py-1 rounded-lg border font-semibold transition-all ${
                          scope === 'selected' ? 'border-orange-400/50 bg-orange-400/10 text-orange-300' : 'border-white/8 text-dark-600 hover:border-white/20'
                        }`}>
                        Select
                      </button>
                    </div>
                  </div>

                  {/* Select all / none bar in selected mode */}
                  {scope === 'selected' && (
                    <div className="flex items-center justify-between mb-2 px-0.5">
                      <p className="text-[10px] text-orange-400 font-medium">
                        {selected.size > 0 ? `${selected.size} selected for export` : 'Click pages to select'}
                      </p>
                      <div className="flex gap-2">
                        <button onClick={selectAll} className="text-[10px] text-dark-500 hover:text-orange-400 transition-colors">All</button>
                        <button onClick={deselectAll} className="text-[10px] text-dark-500 hover:text-red-400 transition-colors">None</button>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-3 overflow-y-auto pr-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', maxHeight: 420, scrollbarWidth: 'thin' }}>
                    {thumbnails.map(pg => (
                      <PageCard
                        key={pg.pageNumber}
                        page={pg}
                        selected={selected.has(pg.pageNumber)}
                        isSelectMode={scope === 'selected'}
                        onSelect={toggleSelect}
                        onDownload={handleSingleDownload}
                        downloadingPage={downloadingPage}
                      />
                    ))}
                  </div>
                  
                  <p className="text-[10px] text-dark-600 mt-3 text-center">
                    {scope === 'selected' ? 'Click pages to select · Hover a page to download individually' : 'Hover a page to download individually'}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* ── Right: Settings ────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass rounded-2xl p-5 space-y-6">
            <div>
              <p className="text-xs font-bold text-dark-400 uppercase tracking-widest mb-4">Export Settings</p>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <label className="text-xs text-dark-400">Resolution Scale</label>
                    <span className="text-xs font-bold text-brand-400">{scale}×</span>
                  </div>
                  <input type="range" min={1} max={3} step={0.5} value={scale} onChange={e => setScale(+e.target.value)} className="w-full accent-brand-500" />
                  <p className="text-[10px] text-dark-600 mt-1">
                    {scale === 3 ? 'Ultra HD (slow)' : scale >= 2 ? 'High quality' : 'Standard'}
                  </p>
                </div>
                
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <label className="text-xs text-dark-400">JPEG Quality</label>
                    <span className="text-xs font-bold text-brand-400">{Math.round(quality * 100)}%</span>
                  </div>
                  <input type="range" min={0.5} max={1} step={0.05} value={quality} onChange={e => setQuality(+e.target.value)} className="w-full accent-brand-500" />
                </div>
              </div>
            </div>

            <div className="border-t border-white/5" />
            
            {/* Conversion Progress */}
            <AnimatePresence>
              {loading && progress.total > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="bg-dark-900/60 rounded-xl p-4 border border-white/5 mb-4">
                    <div className="flex justify-between text-xs text-dark-400 mb-2">
                      <span className="flex items-center gap-1.5"><Loader size={11} className="animate-spin text-brand-400" /> Processing page {progress.current} of {progress.total}</span>
                      <span className="text-brand-400 font-bold">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-dark-800 rounded-full overflow-hidden">
                      <motion.div className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full"
                        animate={{ width: `${pct}%` }} transition={{ ease: 'easeOut' }} />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button onClick={handleMainConvert} disabled={!file || loading || downloadingPage !== null} className="btn-action w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed">
              {loading
                ? <><Loader size={18} className="animate-spin" /> Converting...</>
                : scope === 'selected'
                  ? <><Download size={18} /> Convert {selected.size > 0 ? `${selected.size} Pages ` : ''}to ZIP</>
                  : <><Download size={18} /> Convert All Pages to ZIP</>
              }
            </button>
            <p className="text-[10px] text-dark-600 text-center mt-2">
              Exports multiple pages as a ZIP file.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
