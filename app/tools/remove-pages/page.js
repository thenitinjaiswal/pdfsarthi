'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileOutput, Loader, LayoutGrid, Download, CheckSquare, Square } from 'lucide-react';
import ToolHeader from '@/components/tools/ToolHeader';
import UploadZone from '@/components/tools/UploadZone';
import { useToast } from '@/hooks/useToast';
import { formatSize, downloadBlob } from '@/lib/utils';
import { renderAllPageThumbnails } from '@/lib/pdf-service';

export default function RemovePagesPage() {
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const handleFile = async ([f]) => {
    setFile(f); setLoading(true); setPages([]); setSelected(new Set());
    try {
      const thumbs = await renderAllPageThumbnails(f, 0.2, 200);
      setPages(thumbs);
    } catch { toast.error('Failed to load PDF.'); }
    finally { setLoading(false); }
  };

  const toggle = (num) => setSelected(prev => {
    const n = new Set(prev);
    n.has(num) ? n.delete(num) : n.add(num);
    return n;
  });

  const handleSave = async () => {
    if (!file || selected.size === 0) { toast.warning('Select pages to remove.'); return; }
    if (selected.size === pages.length) { toast.error('Cannot remove all pages.'); return; }
    setSaving(true);
    try {
      const { PDFDocument } = await import('pdf-lib');
      const { readFileAsArrayBuffer } = await import('@/lib/pdf-service');
      const buf = await readFileAsArrayBuffer(file);
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const toRemove = [...selected].sort((a, b) => b - a);
      for (const p of toRemove) doc.removePage(p - 1);
      const bytes = await doc.save();
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), `removed-${file.name}`);
      toast.success(`Removed ${selected.size} page(s)!`);
    } catch (err) { console.error(err); toast.error('Failed.'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <ToolHeader icon={FileOutput} title="Remove Pages" description="Click pages to mark them for removal, then save." />
      {!file ? (
        <div className="max-w-2xl mx-auto"><UploadZone onFiles={handleFile} accept=".pdf" /></div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-72 space-y-4 shrink-0">
            <div className="glass rounded-2xl p-5">
              <p className="text-sm font-medium text-dark-200 truncate mb-1">{file.name}</p>
              <p className="text-xs text-dark-500 mb-3">{pages.length} pages • {formatSize(file.size)}</p>
              <button onClick={() => { setFile(null); setPages([]); }} className="text-xs text-dark-600 hover:text-red-400 transition-colors">× Remove file</button>
            </div>
            <div className="glass rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-dark-400 uppercase tracking-widest">Selection</p>
                <span className="text-xs text-brand-400 font-bold">{selected.size} marked</span>
              </div>
              <button onClick={() => selected.size === pages.length ? setSelected(new Set()) : setSelected(new Set(pages.map(p => p.pageNumber)))} className="btn-secondary w-full justify-center text-xs py-2">
                {selected.size === pages.length ? <><Square size={13} /> Deselect All</> : <><CheckSquare size={13} /> Select All</>}
              </button>
              {selected.size > 0 && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                  Removing {selected.size} page(s). {pages.length - selected.size} will remain.
                </p>
              )}
              <button onClick={handleSave} disabled={saving || selected.size === 0}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm bg-red-600 hover:bg-red-700 text-white transition-all disabled:opacity-40">
                {saving ? <><Loader size={16} className="animate-spin" /> Saving...</> : <>Remove & Save PDF</>}
              </button>
            </div>
          </div>
          <div className="flex-1 glass rounded-2xl p-6">
            <p className="text-sm font-bold text-white mb-5 flex items-center gap-2"><LayoutGrid size={16} className="text-brand-400" /> Click pages to mark for removal</p>
            {loading ? (
              <div className="flex items-center justify-center h-64 text-brand-400"><Loader size={24} className="animate-spin mr-2" /> Loading...</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {pages.map((page, i) => {
                  const sel = selected.has(page.pageNumber);
                  return (
                    <motion.button key={page.pageNumber} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.015 }}
                      onClick={() => toggle(page.pageNumber)}
                      className={`relative aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all ${sel ? 'border-red-500 ring-2 ring-red-500/30' : 'border-white/10 hover:border-white/30'}`}>
                      <img src={page.dataUrl} alt={`Page ${page.pageNumber}`} className={`w-full h-full object-cover ${sel ? 'opacity-40' : ''}`} />
                      {sel && <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center"><FileOutput size={20} className="text-red-400" /></div>}
                      <div className={`absolute bottom-1 left-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${sel ? 'bg-red-500 text-white' : 'bg-black/60 text-white'}`}>{page.pageNumber}</div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
