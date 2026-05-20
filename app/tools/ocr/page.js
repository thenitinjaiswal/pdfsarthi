'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScanText, Copy, Download, Loader, FileText,
  CheckCircle, BookOpen, ChevronRight, Layers,
} from 'lucide-react';
import ToolHeader from '@/components/tools/ToolHeader';
import UploadZone from '@/components/tools/UploadZone';
import { useToast } from '@/hooks/useToast';
import { runOCR, runOCRAllPages, OCR_LANGUAGES } from '@/lib/ocr-service';
import { renderAllPageThumbnails } from '@/lib/pdf-service';
import { formatSize } from '@/lib/utils';

// ─── Status badge for each page card ────────────────────────
function StatusBadge({ status, progress, charCount }) {
  if (status === 'processing') return (
    <div className="flex items-center gap-1 bg-brand-600/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
      <Loader size={8} className="animate-spin" /> {progress}%
    </div>
  );
  if (status === 'done') return (
    <div className="flex items-center gap-1 bg-emerald-600/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
      <CheckCircle size={8} /> {charCount}c
    </div>
  );
  if (status === 'error') return (
    <div className="bg-red-600/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">ERR</div>
  );
  return null;
}

// ─── Thumbnail card ─────────────────────────────────────────
function PageCard({ page, status, progress, charCount, viewSelected, ocrSelected, onViewClick, onOcrToggle }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: Math.min(page.pageNumber * 0.03, 0.5) }}
      onClick={onOcrToggle}
      className={`relative rounded-xl overflow-hidden border-2 cursor-pointer transition-all aspect-[3/4] group ${
        ocrSelected
          ? 'border-orange-400 ring-2 ring-orange-400/30'
          : viewSelected
            ? 'border-lime-500 ring-2 ring-lime-500/20'
            : 'border-white/10 hover:border-orange-400/40'
      }`}
    >
      <img src={page.dataUrl} alt={`Page ${page.pageNumber}`}
        className="w-full h-full object-contain block" style={{ background: '#fff' }} />

      {/* Dimming overlay */}
      {status !== 'idle' && (
        <div className={`absolute inset-0 ${status === 'done' ? 'bg-black/10' : 'bg-black/30'} transition-colors`} />
      )}

      {/* OCR-selected checkmark */}
      {ocrSelected && (
        <div className="absolute top-1.5 left-1.5 w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center shadow">
          <CheckCircle size={10} className="text-white" />
        </div>
      )}

      {/* Page number */}
      <div className="absolute bottom-1.5 left-1.5 bg-black/60 text-[9px] font-bold text-white px-1.5 py-0.5 rounded">
        {page.pageNumber}
      </div>

      {/* Status badge */}
      <div className="absolute top-1.5 right-1.5">
        <StatusBadge status={status} progress={progress} charCount={charCount} />
      </div>

      {/* View text button — shown on hover when done */}
      {status === 'done' && (
        <div
          className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={e => { e.stopPropagation(); onViewClick(); }}
        >
          <div className={`flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded ${
            viewSelected ? 'bg-lime-500 text-white' : 'bg-dark-800/90 text-lime-400 hover:bg-lime-500/20'
          }`}>
            <ChevronRight size={8} /> View
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Main OCR Page ──────────────────────────────────────────
export default function OCRPage() {
  const [file, setFile]       = useState(null);
  const [lang, setLang]       = useState('eng');
  const [isPDF, setIsPDF]     = useState(false);

  // Thumbnails
  const [thumbnails, setThumbnails]       = useState([]);
  const [thumbLoading, setThumbLoading]   = useState(false);
  const [pageCount, setPageCount]         = useState(0);

  // OCR state — per page: { status, progress, text, charCount }
  const [pageStates, setPageStates] = useState({});
  const [ocrRunning, setOcrRunning] = useState(false);

  // Page selection for OCR: 'all' processes every page, 'selected' uses ocrPageSet
  const [ocrScope, setOcrScope]     = useState('all');          // 'all' | 'selected'
  const [ocrPageSet, setOcrPageSet] = useState(new Set());      // pages chosen for OCR

  // Which page's text is shown in the right panel (null = combined)
  const [selectedPage, setSelectedPage] = useState(null);
  const [copied, setCopied]   = useState(false);
  const toast = useToast();

  // ── Load file ────────────────────────────────────────────
  useEffect(() => {
    if (!file) {
      setThumbnails([]); setPageCount(0); setPageStates({});
      setSelectedPage(null); setOcrPageSet(new Set()); setOcrScope('all');
      return;
    }

    const pdf = file.type === 'application/pdf';
    setIsPDF(pdf);
    setPageStates({});
    setSelectedPage(null);
    setOcrPageSet(new Set());
    setOcrScope('all');

    if (!pdf) return;

    setThumbLoading(true);
    setThumbnails([]);
    renderAllPageThumbnails(file, 0.25, 100)
      .then(pages => {
        setThumbnails(pages);
        setPageCount(pages.length);
        const init = {};
        pages.forEach(p => { init[p.pageNumber] = { status: 'idle', progress: 0, text: '', charCount: 0 }; });
        setPageStates(init);
      })
      .catch(() => toast.error('Could not render PDF thumbnails.'))
      .finally(() => setThumbLoading(false));
  }, [file]);

  // ── OCR page selection helpers ────────────────────────────
  const toggleOcrPage = (num) => {
    setOcrPageSet(prev => {
      const next = new Set(prev);
      next.has(num) ? next.delete(num) : next.add(num);
      return next;
    });
  };
  const selectAllForOcr  = () => setOcrPageSet(new Set(thumbnails.map(p => p.pageNumber)));
  const deselectAllForOcr = () => setOcrPageSet(new Set());

  // ── Helpers ──────────────────────────────────────────────
  const updatePage = (num, patch) =>
    setPageStates(prev => ({ ...prev, [num]: { ...prev[num], ...patch } }));

  // ── Run OCR ──────────────────────────────────────────────
  const handleOCR = async () => {
    if (!file) { toast.warning('Please select a file.'); return; }
    setOcrRunning(true);

    try {
      if (!isPDF) {
        // Single image
        setPageStates({ 1: { status: 'processing', progress: 0, text: '', charCount: 0 } });
        const text = await runOCR(file, lang, pct => {
          updatePage(1, { progress: pct });
        });
        updatePage(1, { status: 'done', text, charCount: text.length });
        setSelectedPage(1);
        toast.success('Text extracted!');
      } else {
        // PDF — build list of pages to process
        const pageNumbers = (ocrScope === 'selected' && ocrPageSet.size > 0)
          ? [...ocrPageSet].sort((a, b) => a - b)
          : null; // null = all pages

        if (ocrScope === 'selected' && ocrPageSet.size === 0) {
          toast.warning('Select at least one page first.');
          setOcrRunning(false);
          return;
        }

        // Reset statuses for pages being processed
        const pagesToReset = pageNumbers ?? thumbnails.map(p => p.pageNumber);
        setPageStates(prev => {
          const next = { ...prev };
          pagesToReset.forEach(n => { next[n] = { status: 'idle', progress: 0, text: '', charCount: 0 }; });
          return next;
        });

        const results = await runOCRAllPages(file, lang, (pageNum, totalToProcess, pct) => {
          setPageStates(prev => {
            const next = { ...prev };
            // Mark the previously-processing page as done
            Object.keys(next).forEach(k => {
              if (next[k].status === 'processing' && Number(k) !== pageNum)
                next[k] = { ...next[k], status: 'done' };
            });
            next[pageNum] = { ...(next[pageNum] || {}), status: 'processing', progress: pct };
            return next;
          });
        }, pageNumbers);

        // Finalise
        setPageStates(prev => {
          const next = { ...prev };
          results.forEach(r => {
            next[r.pageNumber] = { status: 'done', progress: 100, text: r.text, charCount: r.text.length };
          });
          return next;
        });
        setSelectedPage(null);
        toast.success(`OCR complete — ${results.length} page${results.length !== 1 ? 's' : ''} processed.`);
      }
    } catch (err) {
      console.error(err);
      toast.error('OCR failed. Try a different file or language.');
    } finally { setOcrRunning(false); }
  };

  // ── Derived values ────────────────────────────────────────
  const doneCount    = Object.values(pageStates).filter(s => s.status === 'done').length;
  const totalToOCR   = ocrScope === 'selected' ? ocrPageSet.size : (isPDF ? pageCount : 1);

  const allText = Object.entries(pageStates)
    .filter(([, s]) => s.status === 'done' && s.text)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([num, s], i, arr) => arr.length > 1 ? `--- Page ${num} ---\n${s.text}` : s.text)
    .join('\n\n');

  const displayText = selectedPage
    ? (pageStates[selectedPage]?.text || '')
    : allText;

  const displayLabel = selectedPage ? `Page ${selectedPage}` : 'All Pages';

  // ── Copy / Download ───────────────────────────────────────
  const handleCopy = async () => {
    if (!displayText) return;
    await navigator.clipboard.writeText(displayText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied!');
  };

  const handleDownload = () => {
    if (!displayText) return;
    const blob = new Blob([displayText], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `ocr-${file?.name || 'output'}-${displayLabel}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div>
      <ToolHeader icon={ScanText} title="OCR — Extract Text"
        description="Extract text from every page of scanned PDFs and images using AI-powered OCR." />

      <div className="grid lg:grid-cols-5 gap-6 items-start">

        {/* ── Left: File + Thumbnails ─────────────────────── */}
        <div className="lg:col-span-3 space-y-4">
          {!file ? (
            <UploadZone onFiles={([f]) => setFile(f)} accept=".pdf,.png,.jpg,.jpeg,.webp,.tiff"
              label="Select PDF or Image" sublabel="Supports multi-page PDFs" />
          ) : (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-5">

              {/* File header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-lime-500/15 flex items-center justify-center shrink-0">
                  <FileText size={18} className="text-lime-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-dark-100 truncate">{file.name}</p>
                  <p className="text-xs text-dark-500 mt-0.5">{formatSize(file.size)}</p>
                </div>
                {pageCount > 0 && (
                  <div className="flex items-center gap-1.5 bg-lime-500/15 border border-lime-500/25 rounded-lg px-3 py-1.5 shrink-0">
                    <BookOpen size={13} className="text-lime-400" />
                    <span className="text-xs font-bold text-lime-300">{pageCount} pg</span>
                  </div>
                )}
                {doneCount > 0 && (
                  <div className="flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/25 rounded-lg px-3 py-1.5 shrink-0">
                    <CheckCircle size={13} className="text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-300">{doneCount}/{totalPages}</span>
                  </div>
                )}
                <button onClick={() => setFile(null)}
                  className="text-xs text-dark-600 hover:text-red-400 transition-colors shrink-0 px-2 py-1 rounded-lg hover:bg-red-500/10">
                  Remove
                </button>
              </div>

              {/* Thumbnail grid — PDF only */}
              {isPDF && (
                <>
                  {thumbLoading && (
                    <div className="flex items-center justify-center h-40 rounded-xl bg-dark-900/60 border border-white/5">
                      <div className="flex flex-col items-center gap-3">
                        <Loader size={22} className="animate-spin text-lime-400" />
                        <p className="text-xs text-dark-500">Rendering pages…</p>
                      </div>
                    </div>
                  )}
                  {!thumbLoading && thumbnails.length > 0 && (
                    <div>
                      {/* Header with scope toggle */}
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] text-dark-500 uppercase font-bold tracking-widest">
                          Pages
                          {selectedPage && (
                            <button onClick={() => setSelectedPage(null)}
                              className="ml-3 normal-case text-lime-500 font-medium hover:text-lime-400 transition-colors">
                              ← Show all
                            </button>
                          )}
                        </p>
                        {/* Scope toggle */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => { setOcrScope('all'); setOcrPageSet(new Set()); }}
                            className={`text-[10px] px-2 py-1 rounded-lg border font-semibold transition-all ${
                              ocrScope === 'all'
                                ? 'border-lime-500/50 bg-lime-500/10 text-lime-300'
                                : 'border-white/8 text-dark-600 hover:border-white/20'
                            }`}>
                            All
                          </button>
                          <button
                            onClick={() => setOcrScope('selected')}
                            className={`text-[10px] px-2 py-1 rounded-lg border font-semibold transition-all ${
                              ocrScope === 'selected'
                                ? 'border-orange-400/50 bg-orange-400/10 text-orange-300'
                                : 'border-white/8 text-dark-600 hover:border-white/20'
                            }`}>
                            Select
                          </button>
                        </div>
                      </div>

                      {/* Select all / none bar in selected mode */}
                      {ocrScope === 'selected' && (
                        <div className="flex items-center justify-between mb-2 px-0.5">
                          <p className="text-[10px] text-orange-400 font-medium">
                            {ocrPageSet.size > 0 ? `${ocrPageSet.size} selected for OCR` : 'Click pages to select'}
                          </p>
                          <div className="flex gap-2">
                            <button onClick={selectAllForOcr} className="text-[10px] text-dark-500 hover:text-orange-400 transition-colors">All</button>
                            <button onClick={deselectAllForOcr} className="text-[10px] text-dark-500 hover:text-red-400 transition-colors">None</button>
                          </div>
                        </div>
                      )}

                      <div
                        className="grid gap-2.5 overflow-y-auto pr-1"
                        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', maxHeight: 360, scrollbarWidth: 'thin' }}
                      >
                        {thumbnails.map(pg => {
                          const ps = pageStates[pg.pageNumber] || { status: 'idle', progress: 0, charCount: 0 };
                          return (
                            <PageCard
                              key={pg.pageNumber}
                              page={pg}
                              status={ps.status}
                              progress={ps.progress}
                              charCount={ps.charCount}
                              viewSelected={selectedPage === pg.pageNumber}
                              ocrSelected={ocrScope === 'selected' && ocrPageSet.has(pg.pageNumber)}
                              onOcrToggle={() => {
                                if (ocrScope === 'selected') toggleOcrPage(pg.pageNumber);
                                else setSelectedPage(p => p === pg.pageNumber ? null : pg.pageNumber);
                              }}
                              onViewClick={() => setSelectedPage(p => p === pg.pageNumber ? null : pg.pageNumber)}
                            />
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-dark-600 mt-2 text-center">
                        {ocrScope === 'selected'
                          ? 'Click pages to select for OCR · hover a done page to view text'
                          : 'Click a page to view its extracted text'}
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Image preview — non-PDF */}
              {!isPDF && (
                <div className="rounded-xl overflow-hidden border border-white/8 bg-dark-900 max-h-56 flex items-center justify-center">
                  <img src={URL.createObjectURL(file)} alt="preview"
                    className="max-w-full max-h-56 object-contain" />
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* ── Right: Settings + Results ───────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Settings */}
          <div className="glass rounded-2xl p-5 space-y-4">
            <p className="text-xs font-bold text-dark-400 uppercase tracking-widest">OCR Settings</p>

            <div>
              <label className="text-xs text-dark-500 mb-2 block">Language</label>
              <select value={lang} onChange={e => setLang(e.target.value)} className="input-dark">
                {OCR_LANGUAGES.map(l => (
                  <option key={l.code} value={l.code} style={{ background: '#1a1a1a' }}>{l.label}</option>
                ))}
              </select>
            </div>

            {/* Accuracy note */}
            <div className="flex items-start gap-2 bg-lime-500/8 border border-lime-500/15 rounded-lg px-3 py-2.5">
              <ScanText size={13} className="text-lime-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-dark-400 leading-relaxed">
                Pages rendered at <span className="text-lime-300 font-medium">2.5× scale (≈180 DPI)</span> for maximum OCR accuracy.
                {isPDF && pageCount > 1 && (
                  <span> All {pageCount} pages will be processed.</span>
                )}
              </p>
            </div>

            {/* Progress bar when running */}
            {ocrRunning && (
              <div>
                <div className="flex justify-between text-xs text-dark-400 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Loader size={11} className="animate-spin text-lime-400" />
                    Processing{isPDF ? ` page ${doneCount + 1} of ${totalToOCR}` : '…'}
                  </span>
                  <span>{isPDF ? `${doneCount}/${totalToOCR}` : ''}</span>
                </div>
                <div className="h-1.5 bg-dark-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-lime-600 to-lime-400 rounded-full"
                    animate={{ width: `${totalToOCR > 0 ? (doneCount / totalToOCR) * 100 : 10}%` }}
                    transition={{ ease: 'easeOut', duration: 0.4 }}
                  />
                </div>
              </div>
            )}

            <button onClick={handleOCR} disabled={!file || ocrRunning}
              className="btn-action w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed">
              {ocrRunning
                ? <><Loader size={18} className="animate-spin" /> Processing…</>
                : ocrScope === 'selected'
                  ? <><ScanText size={18} /> Extract {ocrPageSet.size > 0 ? `${ocrPageSet.size} Selected Page${ocrPageSet.size !== 1 ? 's' : ''}` : 'Selected Pages'}</>
                  : <><ScanText size={18} /> Extract Text{isPDF && pageCount > 1 ? ` (${pageCount} pages)` : ''}</>
              }
            </button>
          </div>

          {/* Results panel */}
          <div className="glass rounded-2xl overflow-hidden" style={{ minHeight: 300 }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
              <p className="text-xs font-semibold text-dark-300 flex items-center gap-2">
                <ScanText size={13} className="text-lime-400" />
                {displayLabel}
                {displayText && (
                  <span className="text-[10px] text-dark-600 font-normal">
                    {displayText.length.toLocaleString()} chars
                  </span>
                )}
              </p>
              {displayText && (
                <div className="flex items-center gap-3">
                  <button onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs text-dark-500 hover:text-lime-400 transition-colors">
                    {copied ? <CheckCircle size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button onClick={handleDownload}
                    className="flex items-center gap-1.5 text-xs text-dark-500 hover:text-lime-400 transition-colors">
                    <Download size={13} /> .txt
                  </button>
                </div>
              )}
            </div>

            <div className="p-4">
              {!displayText && !ocrRunning && (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <ScanText size={32} className="text-dark-700 mb-3" />
                  <p className="text-sm text-dark-600">Extracted text will appear here</p>
                  <p className="text-xs text-dark-700 mt-1">
                    {isPDF && pageCount > 1 ? 'Click a thumbnail to preview one page' : ''}
                  </p>
                </div>
              )}
              {displayText && (
                <motion.pre
                  key={selectedPage ?? 'all'}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-dark-300 whitespace-pre-wrap font-mono leading-relaxed overflow-y-auto"
                  style={{ maxHeight: 400, scrollbarWidth: 'thin' }}
                >
                  {displayText}
                </motion.pre>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
