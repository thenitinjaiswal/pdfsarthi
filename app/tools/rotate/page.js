'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RotateCw, RotateCcw, Loader, FileText, LayoutGrid,
  Download, CheckSquare, Square, RefreshCw, Layers,
} from 'lucide-react';
import ToolHeader from '@/components/tools/ToolHeader';
import UploadZone from '@/components/tools/UploadZone';
import { useToast } from '@/hooks/useToast';
import { renderAllPageThumbnails } from '@/lib/pdf-service';
import { formatSize, downloadBlob } from '@/lib/utils';

// ─── Helpers ───────────────────────────────────────────────

const ANGLES = [90, 180, 270];

function rotateDelta(current, delta) {
  return ((current + delta) % 360 + 360) % 360;
}

// ─── Page Thumbnail Card ────────────────────────────────────

function PageCard({ page, selected, onSelect, onRotate }) {
  const isRotated = page.rotation !== 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative group aspect-[3/4] rounded-xl overflow-hidden border-2 cursor-pointer transition-all select-none ${
        selected
          ? 'border-brand-500 ring-2 ring-brand-500/30'
          : 'border-white/10 hover:border-brand-500/40'
      }`}
      onClick={() => onSelect(page.pageNumber)}
    >
      {/* Thumbnail */}
      <div className="w-full h-full flex items-center justify-center bg-white">
        <img
          src={page.dataUrl}
          alt={`Page ${page.pageNumber}`}
          style={{ transform: `rotate(${page.rotation}deg)`, transition: 'transform 0.35s cubic-bezier(.4,0,.2,1)' }}
          className="max-w-full max-h-full object-contain"
        />
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors" />

      {/* Selection checkbox */}
      <div className="absolute top-2 left-2">
        {selected
          ? <CheckSquare size={16} className="text-brand-400 drop-shadow" />
          : <Square size={16} className="text-white/40 group-hover:text-white/80 transition-colors drop-shadow" />
        }
      </div>

      {/* Rotation badge */}
      {isRotated && (
        <div className="absolute top-2 right-2 bg-brand-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">
          {page.rotation}°
        </div>
      )}

      {/* Page number */}
      <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/60 text-[10px] font-bold text-white">
        {page.pageNumber}
      </div>

      {/* Per-page rotate controls — shown on hover */}
      <div
        className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => onRotate(page.pageNumber, -90)}
          title="Rotate 90° counter-clockwise"
          className="w-7 h-7 rounded-full bg-dark-800/90 text-white hover:bg-brand-600 flex items-center justify-center backdrop-blur-sm shadow-lg transition-colors"
        >
          <RotateCcw size={12} />
        </button>
        <button
          onClick={() => onRotate(page.pageNumber, 90)}
          title="Rotate 90° clockwise"
          className="w-7 h-7 rounded-full bg-brand-500/90 text-white hover:bg-brand-600 flex items-center justify-center backdrop-blur-sm shadow-lg transition-colors"
        >
          <RotateCw size={12} />
        </button>
      </div>

      {/* Reset badge — only if rotated */}
      {isRotated && (
        <div
          className="absolute top-2 right-2 hidden group-hover:flex"
          onClick={e => { e.stopPropagation(); onRotate(page.pageNumber, -page.rotation); }}
        >
          <button
            title="Reset rotation"
            className="w-6 h-6 rounded-full bg-dark-700/90 text-white/70 hover:text-red-400 flex items-center justify-center backdrop-blur-sm shadow transition-colors"
          >
            <RefreshCw size={10} />
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ─── Main Page ──────────────────────────────────────────────

export default function RotatePDFPage() {
  const [file, setFile]         = useState(null);
  const [pages, setPages]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [selected, setSelected] = useState(new Set()); // selected page numbers
  const [applyAngle, setApplyAngle] = useState(90);    // angle for "rotate selected"
  const toast = useToast();

  // ── Load file ─────────────────────────────────────────────
  const handleFile = async ([f]) => {
    setFile(f);
    setLoading(true);
    setPages([]);
    setSelected(new Set());
    try {
      const thumbs = await renderAllPageThumbnails(f, 0.25, 100);
      setPages(thumbs.map(t => ({ ...t, rotation: 0 })));
    } catch (err) {
      console.error(err);
      toast.error('Failed to render PDF pages.');
    } finally { setLoading(false); }
  };

  // ── Selection ─────────────────────────────────────────────
  const toggleSelect = useCallback((num) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(num) ? next.delete(num) : next.add(num);
      return next;
    });
  }, []);

  const selectAll = () => setSelected(new Set(pages.map(p => p.pageNumber)));
  const deselectAll = () => setSelected(new Set());
  const allSelected = pages.length > 0 && selected.size === pages.length;

  // ── Rotation ──────────────────────────────────────────────
  const rotatePage = useCallback((num, delta) => {
    setPages(prev => prev.map(p =>
      p.pageNumber === num ? { ...p, rotation: rotateDelta(p.rotation, delta) } : p
    ));
  }, []);

  const rotateSelected = (delta) => {
    if (selected.size === 0) { toast.warning('Select at least one page first.'); return; }
    setPages(prev => prev.map(p =>
      selected.has(p.pageNumber) ? { ...p, rotation: rotateDelta(p.rotation, delta) } : p
    ));
  };

  const rotateAll = (delta) => {
    setPages(prev => prev.map(p => ({ ...p, rotation: rotateDelta(p.rotation, delta) })));
  };

  const resetAll = () => setPages(prev => prev.map(p => ({ ...p, rotation: 0 })));

  const modifiedCount = pages.filter(p => p.rotation !== 0).length;

  // ── Save ──────────────────────────────────────────────────
  const handleSave = async () => {
    if (!file) return;
    setSaving(true);
    try {
      const { PDFDocument, degrees } = await import('pdf-lib');
      const { readFileAsArrayBuffer } = await import('@/lib/pdf-service');
      const buf  = await readFileAsArrayBuffer(file);
      const doc  = await PDFDocument.load(buf, { ignoreEncryption: true });
      const pdfPages = doc.getPages();

      pages.forEach(p => {
        if (p.rotation !== 0) {
          const pg = pdfPages[p.pageNumber - 1];
          const cur = pg.getRotation().angle;
          pg.setRotation(degrees((cur + p.rotation) % 360));
        }
      });

      const bytes = await doc.save();
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), `rotated-${file.name}`);
      toast.success(`PDF saved — ${modifiedCount} page${modifiedCount !== 1 ? 's' : ''} rotated.`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save PDF.');
    } finally { setSaving(false); }
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div>
      <ToolHeader icon={RotateCw} title="Rotate PDF"
        description="Rotate individual pages, a selection, or the entire document." />

      {!file ? (
        <div className="max-w-2xl mx-auto">
          <UploadZone onFiles={handleFile} accept=".pdf" label="Drop your PDF here" />
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">

          {/* ── Left: Controls ─────────────────────────────── */}
          <div className="lg:w-72 space-y-4 shrink-0">

            {/* File info */}
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-brand-500/15 flex items-center justify-center shrink-0">
                  <FileText size={18} className="text-brand-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-dark-100 truncate">{file.name}</p>
                  <p className="text-xs text-dark-500">{pages.length} pages · {formatSize(file.size)}</p>
                </div>
              </div>
              {modifiedCount > 0 && (
                <div className="flex items-center gap-1.5 bg-brand-500/10 border border-brand-500/20 rounded-lg px-3 py-1.5 mb-3">
                  <RotateCw size={12} className="text-brand-400" />
                  <span className="text-xs text-brand-300 font-medium">{modifiedCount} page{modifiedCount !== 1 ? 's' : ''} rotated</span>
                </div>
              )}
              <button onClick={() => { setFile(null); setPages([]); setSelected(new Set()); }}
                className="text-xs text-dark-600 hover:text-red-400 transition-colors">
                × Remove file
              </button>
            </div>

            {/* Rotate All controls */}
            <div className="glass rounded-2xl p-5 space-y-3">
              <p className="text-xs font-bold text-dark-400 uppercase tracking-widest">All Pages</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => rotateAll(90)}
                  className="btn-secondary justify-center text-xs py-2.5 gap-1.5">
                  <RotateCw size={14} /> CW 90°
                </button>
                <button onClick={() => rotateAll(-90)}
                  className="btn-secondary justify-center text-xs py-2.5 gap-1.5">
                  <RotateCcw size={14} /> CCW 90°
                </button>
                <button onClick={() => rotateAll(180)}
                  className="btn-secondary justify-center text-xs py-2.5 gap-1.5 col-span-2">
                  <Layers size={14} /> Flip 180°
                </button>
              </div>
              {modifiedCount > 0 && (
                <button onClick={resetAll}
                  className="w-full text-xs text-dark-500 hover:text-red-400 transition-colors flex items-center justify-center gap-1.5 py-1">
                  <RefreshCw size={11} /> Reset all rotations
                </button>
              )}
            </div>

            {/* Selection + Rotate Selected */}
            <div className="glass rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-dark-400 uppercase tracking-widest">Selected Pages</p>
                <button onClick={allSelected ? deselectAll : selectAll}
                  className="text-[10px] text-brand-400 hover:text-brand-300 font-medium transition-colors">
                  {allSelected ? 'Deselect all' : 'Select all'}
                </button>
              </div>

              {selected.size === 0 ? (
                <p className="text-xs text-dark-600 leading-relaxed">
                  Click page thumbnails to select them, then rotate the selection below.
                </p>
              ) : (
                <p className="text-xs text-brand-400 font-medium">
                  {selected.size} page{selected.size !== 1 ? 's' : ''} selected
                </p>
              )}

              {/* Angle choice for selected */}
              <div>
                <p className="text-[10px] text-dark-500 mb-1.5">Rotate angle</p>
                <div className="flex gap-1.5">
                  {ANGLES.map(a => (
                    <button key={a} onClick={() => setApplyAngle(a)}
                      className={`flex-1 text-xs py-1.5 rounded-lg border transition-all ${
                        applyAngle === a
                          ? 'border-brand-500/50 bg-brand-500/15 text-brand-300 font-bold'
                          : 'border-white/8 text-dark-500 hover:border-white/20'
                      }`}>
                      {a}°
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => rotateSelected(applyAngle)}
                  disabled={selected.size === 0}
                  className="btn-secondary justify-center text-xs py-2.5 gap-1.5 disabled:opacity-40">
                  <RotateCw size={14} /> CW
                </button>
                <button onClick={() => rotateSelected(-applyAngle)}
                  disabled={selected.size === 0}
                  className="btn-secondary justify-center text-xs py-2.5 gap-1.5 disabled:opacity-40">
                  <RotateCcw size={14} /> CCW
                </button>
              </div>
            </div>

            {/* Save */}
            <button onClick={handleSave} disabled={saving || loading || modifiedCount === 0}
              className="btn-action w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed">
              {saving
                ? <><Loader size={18} className="animate-spin" /> Saving…</>
                : <><Download size={18} /> Save PDF</>}
            </button>
            {modifiedCount === 0 && !saving && (
              <p className="text-[10px] text-dark-600 text-center -mt-2">
                Rotate at least one page to enable save
              </p>
            )}
          </div>

          {/* ── Right: Thumbnail Grid ───────────────────────── */}
          <div className="flex-1 glass rounded-2xl p-6 min-h-[500px]">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <LayoutGrid size={16} className="text-brand-400" /> Document Pages
              </h3>
              {loading && (
                <p className="text-xs text-brand-400 flex items-center gap-1.5">
                  <Loader size={12} className="animate-spin" /> Rendering…
                </p>
              )}
              {!loading && selected.size > 0 && (
                <p className="text-xs text-brand-400 font-medium">{selected.size} selected</p>
              )}
            </div>

            {loading && pages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-dark-500">
                <Loader size={24} className="animate-spin mb-3 text-brand-400" />
                <p className="text-sm">Rendering page thumbnails…</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {pages.map((page, i) => (
                  <PageCard
                    key={page.pageNumber}
                    page={page}
                    selected={selected.has(page.pageNumber)}
                    onSelect={toggleSelect}
                    onRotate={rotatePage}
                  />
                ))}
              </div>
            )}

            {/* Hints */}
            {!loading && pages.length > 0 && (
              <p className="text-[10px] text-dark-700 mt-4 text-center">
                Click to select · Hover for CW/CCW buttons · Use left panel to rotate all or selected pages
              </p>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
