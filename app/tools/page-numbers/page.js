'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hash, Loader, FileText, BookOpen, Bold, Italic, AlignCenter } from 'lucide-react';
import ToolHeader from '@/components/tools/ToolHeader';
import UploadZone from '@/components/tools/UploadZone';
import { useToast } from '@/hooks/useToast';
import { addPageNumbers, renderAllPageThumbnails } from '@/lib/pdf-service';
import { formatSize, downloadBlob } from '@/lib/utils';

// ─── Constants ─────────────────────────────────────────────

const MARGIN_OPTIONS = [
  { id: 'small',       label: 'Small',       pts: 10 },
  { id: 'recommended', label: 'Recommended', pts: 20 },
  { id: 'large',       label: 'Large',       pts: 36 },
];

const TEXT_FORMATS = [
  { id: 'number-only', label: 'Insert only page number (recommended)' },
  { id: 'page-n',      label: 'Page N' },
  { id: 'n-of-total',  label: 'N / Total' },
  { id: 'custom',      label: 'Custom prefix & suffix' },
];

const FONT_FAMILIES = [
  { id: 'Helvetica',   label: 'Helvetica' },
  { id: 'TimesRoman',  label: 'Times Roman' },
  { id: 'Courier',     label: 'Courier' },
];

const TOP_POSITIONS    = ['top-left',    'top-center',    'top-right'];
const BOTTOM_POSITIONS = ['bottom-left', 'bottom-center', 'bottom-right'];

// ─── Helpers ───────────────────────────────────────────────

function overlayStyle(position, color) {
  const base = {
    position: 'absolute', fontSize: 8, fontWeight: 700, fontFamily: 'monospace',
    color, background: 'rgba(0,0,0,0.55)', borderRadius: 3,
    padding: '1px 4px', lineHeight: 1.4, whiteSpace: 'nowrap', pointerEvents: 'none',
  };
  if (position === 'bottom-center') return { ...base, bottom: 4, left: '50%', transform: 'translateX(-50%)' };
  if (position === 'bottom-left')   return { ...base, bottom: 4, left: 4 };
  if (position === 'bottom-right')  return { ...base, bottom: 4, right: 4 };
  if (position === 'top-center')    return { ...base, top: 4, left: '50%', transform: 'translateX(-50%)' };
  if (position === 'top-left')      return { ...base, top: 4, left: 4 };
  if (position === 'top-right')     return { ...base, top: 4, right: 4 };
  return { ...base, bottom: 4, left: '50%', transform: 'translateX(-50%)' };
}

function mirrorPos(pos) {
  return pos.replace('left', '__R__').replace('right', 'left').replace('__R__', 'right');
}

// ─── Position Grid ─────────────────────────────────────────

function PositionGrid({ value, onChange }) {
  const dot = (pos) => (
    <button
      key={pos}
      onClick={() => onChange(pos)}
      title={pos.replace('-', ' ')}
      className={`w-4 h-4 rounded-full border-2 transition-all ${
        value === pos
          ? 'border-violet-400 bg-violet-500 scale-110'
          : 'border-dark-500 hover:border-violet-400/60 bg-dark-700'
      }`}
    />
  );

  return (
    <div className="w-full aspect-[3/4] rounded-xl border border-white/10 bg-dark-900/60 flex flex-col p-3 gap-1">
      {/* Top dots */}
      <div className="flex justify-between">
        {TOP_POSITIONS.map(dot)}
      </div>
      {/* Content lines */}
      <div className="flex-1 flex flex-col justify-center gap-1.5 px-1 py-2">
        {[100, 80, 60, 40].map((w, i) => (
          <div key={i} className="h-1 rounded-full bg-dark-700" style={{ width: `${w}%` }} />
        ))}
      </div>
      {/* Bottom dots */}
      <div className="flex justify-between">
        {BOTTOM_POSITIONS.map(dot)}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────

export default function PageNumbersPage() {
  const [file, setFile]             = useState(null);
  const [pageMode, setPageMode]     = useState('single');
  const [position, setPosition]     = useState('bottom-center');
  const [margin, setMargin]         = useState('recommended');
  const [startNum, setStartNum]     = useState(1);
  const [fromPage, setFromPage]     = useState(1);
  const [toPage, setToPage]         = useState(1);
  const [textFormat, setTextFormat] = useState('number-only');
  const [prefix, setPrefix]         = useState('');
  const [suffix, setSuffix]         = useState('');
  const [fontSize, setFontSize]     = useState(12);
  const [fontFamily, setFontFamily] = useState('Helvetica');
  const [bold, setBold]             = useState(false);
  const [italic, setItalic]         = useState(false);
  const [fontColor, setFontColor]   = useState('#a855f7');
  const [loading, setLoading]       = useState(false);
  const [thumbnails, setThumbnails] = useState([]);
  const [thumbLoading, setThumbLoading] = useState(false);
  const [pageCount, setPageCount]   = useState(0);
  const toast = useToast();

  // Render thumbnails when file changes
  useEffect(() => {
    if (!file) { setThumbnails([]); setPageCount(0); return; }
    let cancelled = false;
    setThumbLoading(true);
    setThumbnails([]);
    renderAllPageThumbnails(file, 0.28, 80)
      .then(pages => {
        if (!cancelled) {
          setThumbnails(pages);
          setPageCount(pages.length);
          setToPage(pages.length);
        }
      })
      .catch(() => { if (!cancelled) toast.error('Could not render thumbnails.'); })
      .finally(() => { if (!cancelled) setThumbLoading(false); });
    return () => { cancelled = true; };
  }, [file]);

  // Sync prefix/suffix with text format
  useEffect(() => {
    if (textFormat === 'number-only') { setPrefix(''); setSuffix(''); }
    else if (textFormat === 'page-n') { setPrefix('Page '); setSuffix(''); }
    else if (textFormat === 'n-of-total') { setPrefix(''); setSuffix(` / ${pageCount || '?'}`); }
    // 'custom' → leave untouched
  }, [textFormat, pageCount]);

  const marginPts = MARGIN_OPTIONS.find(m => m.id === margin)?.pts ?? 20;
  const preview   = `${prefix}${startNum}${suffix}`;

  const handleAdd = async () => {
    if (!file) { toast.warning('Please select a PDF file.'); return; }
    setLoading(true);
    try {
      const blob = await addPageNumbers(file, {
        position, startNumber: startNum, prefix, suffix, fontSize,
        margin: marginPts, fromPage, toPage,
        fontFamily, bold, italic, fontColor, pageMode,
      });
      downloadBlob(blob, `numbered-${file.name}`);
      toast.success('Page numbers added successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to add page numbers.');
    } finally { setLoading(false); }
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div>
      <ToolHeader icon={Hash} title="Add Page Numbers"
        description="Precisely control position, style, and range — powered by pdf-lib." />

      <div className="grid lg:grid-cols-5 gap-6 items-start">

        {/* ── Left: File + Thumbnails ─────────────────────── */}
        <div className="lg:col-span-3">
          {!file ? (
            <UploadZone onFiles={([f]) => setFile(f)} accept=".pdf" label="Select PDF to Add Page Numbers" />
          ) : (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-5">

              {/* File header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0">
                  <FileText size={18} className="text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-dark-100 truncate">{file.name}</p>
                  <p className="text-xs text-dark-500 mt-0.5">{formatSize(file.size)}</p>
                </div>
                {pageCount > 0 && (
                  <div className="flex items-center gap-1.5 bg-violet-500/15 border border-violet-500/25 rounded-lg px-3 py-1.5 shrink-0">
                    <BookOpen size={13} className="text-violet-400" />
                    <span className="text-xs font-bold text-violet-300">{pageCount} pg</span>
                  </div>
                )}
                <button onClick={() => setFile(null)}
                  className="text-xs text-dark-600 hover:text-red-400 transition-colors shrink-0 px-2 py-1 rounded-lg hover:bg-red-500/10">
                  Remove
                </button>
              </div>

              {/* Thumb loading */}
              {thumbLoading && (
                <div className="flex items-center justify-center h-44 rounded-xl bg-dark-900/60 border border-white/5">
                  <div className="flex flex-col items-center gap-3">
                    <Loader size={22} className="animate-spin text-violet-400" />
                    <p className="text-xs text-dark-500">Rendering pages…</p>
                  </div>
                </div>
              )}

              {/* Thumbnail grid */}
              {!thumbLoading && thumbnails.length > 0 && (
                <>
                  <p className="text-[10px] text-dark-500 uppercase font-bold tracking-widest mb-3">
                    Preview — <span className="text-violet-400 normal-case">{position.replace('-', ' ')}</span>
                    <span className="ml-2 text-dark-600 normal-case font-normal">
                      Numbered pages: {fromPage}–{toPage}
                    </span>
                  </p>
                  <div
                    className="grid gap-2.5 overflow-y-auto pr-1"
                    style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', maxHeight: 400, scrollbarWidth: 'thin' }}
                  >
                    {thumbnails.map(({ pageNumber, dataUrl }) => {
                      const inRange = pageNumber >= fromPage && pageNumber <= toPage;
                      const label   = `${prefix}${startNum + pageNumber - fromPage}${suffix}`;
                      const effPos  = (pageMode === 'facing' && pageNumber % 2 === 0) ? mirrorPos(position) : position;
                      return (
                        <motion.div key={pageNumber}
                          initial={{ opacity: 0, scale: 0.92 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: Math.min(pageNumber * 0.035, 0.5) }}
                          className={`relative rounded-lg overflow-hidden border transition-colors bg-dark-900 ${
                            inRange ? 'border-violet-500/30 hover:border-violet-500/60' : 'border-white/5 opacity-35'
                          }`}
                        >
                          <img src={dataUrl} alt={`Page ${pageNumber}`}
                            className="w-full object-contain block" style={{ background: '#fff' }} />
                          {inRange && (
                            <span style={overlayStyle(effPos, fontColor)}>{label}</span>
                          )}
                          <div className="absolute top-1 left-1 bg-dark-900/85 rounded px-1.5 py-0.5 text-[8px] font-bold text-dark-400">
                            {pageNumber}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-3 pt-3 border-t border-white/5">
                    <p className="text-[10px] text-dark-600">{thumbnails.length} pages total</p>
                    <p className="text-[10px] text-dark-600 font-mono">
                      <span className="text-violet-400">{prefix}{startNum}{suffix}</span>
                      {' → '}
                      <span className="text-violet-400">{prefix}{startNum + (toPage - fromPage)}{suffix}</span>
                    </p>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </div>

        {/* ── Right: Settings ────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass rounded-2xl p-5 space-y-5">

            {/* Section: Page Number Options header */}
            <p className="text-xs font-bold text-dark-400 uppercase tracking-widest">Page Number Options</p>

            {/* Page Mode */}
            <div>
              <p className="text-xs text-dark-500 mb-2">Page mode</p>
              <div className="flex gap-3">
                {[{ id: 'single', label: 'Single page' }, { id: 'facing', label: 'Facing pages' }].map(m => (
                  <button key={m.id} onClick={() => setPageMode(m.id)}
                    className={`flex items-center gap-2 text-sm transition-colors px-3 py-2 rounded-lg border ${
                      pageMode === m.id
                        ? 'border-violet-500/50 bg-violet-500/10 text-violet-300'
                        : 'border-white/8 text-dark-500 hover:border-white/15'
                    }`}>
                    <span className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${
                      pageMode === m.id ? 'border-violet-400 bg-violet-500' : 'border-dark-500'
                    }`} />
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Position + Margin */}
            <div className="grid grid-cols-2 gap-4 items-start">
              <div>
                <p className="text-xs text-dark-500 mb-2">Position</p>
                <PositionGrid value={position} onChange={setPosition} />
                <p className="text-[10px] text-dark-600 mt-1.5 text-center capitalize">
                  {position.replace('-', ' ')}
                </p>
              </div>
              <div>
                <p className="text-xs text-dark-500 mb-2">Margin</p>
                <div className="space-y-1.5">
                  {MARGIN_OPTIONS.map(m => (
                    <button key={m.id} onClick={() => setMargin(m.id)}
                      className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-all ${
                        margin === m.id
                          ? 'border-violet-500/50 bg-violet-500/10 text-violet-300'
                          : 'border-white/8 text-dark-500 hover:border-white/15'
                      }`}>
                      {m.label}
                      <span className="text-[10px] text-dark-600 ml-1">({m.pts}pt)</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-white/5" />

            {/* Pages section */}
            <div>
              <p className="text-xs text-dark-500 mb-3">Pages</p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-dark-500 shrink-0 w-24">First number:</span>
                  <input type="number" min={1} value={startNum}
                    onChange={e => setStartNum(parseInt(e.target.value) || 1)}
                    className="input-dark text-sm w-24" />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-dark-500 shrink-0">Which pages:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-dark-600">from</span>
                    <input type="number" min={1} max={pageCount || 999} value={fromPage}
                      onChange={e => setFromPage(Math.max(1, parseInt(e.target.value) || 1))}
                      className="input-dark text-sm w-16" />
                    <span className="text-xs text-dark-600">to</span>
                    <input type="number" min={fromPage} max={pageCount || 999} value={toPage}
                      onChange={e => setToPage(Math.max(fromPage, parseInt(e.target.value) || 1))}
                      className="input-dark text-sm w-16" />
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-white/5" />

            {/* Text format */}
            <div>
              <p className="text-xs text-dark-500 mb-2">Text</p>
              <select value={textFormat} onChange={e => setTextFormat(e.target.value)} className="input-dark text-sm">
                {TEXT_FORMATS.map(f => (
                  <option key={f.id} value={f.id} style={{ background: '#1a1a1a' }}>{f.label}</option>
                ))}
              </select>

              {/* Custom prefix/suffix — only shown in custom mode */}
              <AnimatePresence>
                {textFormat === 'custom' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }} className="overflow-hidden mt-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-dark-500 mb-1 block">Prefix</label>
                        <input type="text" value={prefix} onChange={e => setPrefix(e.target.value)}
                          placeholder="Page " className="input-dark text-sm" />
                      </div>
                      <div>
                        <label className="text-[10px] text-dark-500 mb-1 block">Suffix</label>
                        <input type="text" value={suffix} onChange={e => setSuffix(e.target.value)}
                          placeholder=" of N" className="input-dark text-sm" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Text format toolbar */}
            <div>
              <p className="text-xs text-dark-500 mb-2">Text format</p>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Font family */}
                <select value={fontFamily} onChange={e => setFontFamily(e.target.value)}
                  className="input-dark text-xs py-1.5 flex-1 min-w-0">
                  {FONT_FAMILIES.map(f => (
                    <option key={f.id} value={f.id} style={{ background: '#1a1a1a' }}>{f.label}</option>
                  ))}
                </select>

                {/* Font size */}
                <input type="number" min={6} max={32} value={fontSize}
                  onChange={e => setFontSize(parseInt(e.target.value) || 12)}
                  className="input-dark text-xs py-1.5 w-14 text-center" />

                {/* Bold */}
                <button onClick={() => setBold(b => !b)}
                  className={`w-8 h-8 rounded-lg border text-sm font-black transition-all flex items-center justify-center ${
                    bold ? 'border-violet-500/50 bg-violet-500/15 text-violet-300' : 'border-white/8 text-dark-500 hover:border-white/20'
                  }`}>B</button>

                {/* Italic */}
                <button onClick={() => setItalic(i => !i)}
                  className={`w-8 h-8 rounded-lg border text-sm italic font-semibold transition-all flex items-center justify-center ${
                    italic ? 'border-violet-500/50 bg-violet-500/15 text-violet-300' : 'border-white/8 text-dark-500 hover:border-white/20'
                  }`}>I</button>

                {/* Color picker */}
                <div className="relative w-8 h-8 rounded-lg border border-white/8 overflow-hidden flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full pointer-events-none" style={{ background: fontColor }} />
                  <input type="color" value={fontColor} onChange={e => setFontColor(e.target.value)}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" title="Font color" />
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-white/5" />

            {/* Live preview */}
            <div className="rounded-xl bg-dark-800 border border-white/5 p-3 text-center">
              <p className="text-[10px] text-dark-500 uppercase font-bold mb-1.5">Live Preview</p>
              <p className="text-sm font-mono font-bold" style={{
                color: fontColor,
                fontWeight: bold ? 700 : 400,
                fontStyle: italic ? 'italic' : 'normal',
              }}>{preview || '1'}</p>
              {pageCount > 0 && (
                <p className="text-[10px] text-dark-600 mt-1">
                  Last: <span className="text-dark-400 font-mono">{prefix}{startNum + (toPage - fromPage)}{suffix}</span>
                </p>
              )}
            </div>
          </div>

          {/* Add button */}
          <button onClick={handleAdd} disabled={!file || loading}
            className="btn-action w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed">
            {loading
              ? <><Loader size={18} className="animate-spin" /> Adding Numbers…</>
              : <><Hash size={18} /> Add Page Numbers</>}
          </button>
        </div>

      </div>
    </div>
  );
}
