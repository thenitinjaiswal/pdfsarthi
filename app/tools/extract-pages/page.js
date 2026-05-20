'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Loader, LayoutGrid, Download } from 'lucide-react';
import ToolHeader from '@/components/tools/ToolHeader';
import UploadZone from '@/components/tools/UploadZone';
import { useToast } from '@/hooks/useToast';
import { formatSize, downloadBlob } from '@/lib/utils';
import { renderAllPageThumbnails } from '@/lib/pdf-service';

export default function ExtractPagesPage() {
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

  const handleExtract = async () => {
    if (!file || selected.size === 0) { toast.warning('Select at least one page to extract.'); return; }
    setSaving(true);
    try {
      const { PDFDocument } = await import('pdf-lib');
      const { readFileAsArrayBuffer } = await import('@/lib/pdf-service');
      const buf = await readFileAsArrayBuffer(file);
      const src = await PDFDocument.load(buf, { ignoreEncryption: true });
      const out = await PDFDocument.create();
      const indices = [...selected].sort((a, b) => a - b).map(n => n - 1);
      const copied = await out.copyPages(src, indices);
      copied.forEach(p => out.addPage(p));
      const bytes = await out.save();
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), `extracted-${file.name}`);
      toast.success(`Extracted ${selected.size} page(s)!`);
    } catch (err) { console.error(err); toast.error('Extraction failed.'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <ToolHeader icon={Copy} title="Extract Pages" description="Select specific pages and save them as a new PDF." />
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
                <p className="text-xs font-bold text-dark-400 uppercase tracking-widest">Selected</p>
                <span className="text-xs text-brand-400 font-bold">{selected.size} pages</span>
              </div>
              {selected.size > 0 && (
                <p className="text-xs text-brand-400 bg-brand-500/10 border border-brand-500/20 rounded-xl p-3">
                  Pages: {[...selected].sort((a,b)=>a-b).join(', ')}
                </p>
              )}
              <button onClick={handleExtract} disabled={saving || selected.size === 0} className="btn-action w-full justify-center">
                {saving ? <><Loader size={16} className="animate-spin" /> Extracting...</> : <><Download size={16} /> Extract to New PDF</>}
              </button>
            </div>
          </div>
          <div className="flex-1 glass rounded-2xl p-6">
            <p className="text-sm font-bold text-white mb-5 flex items-center gap-2"><LayoutGrid size={16} className="text-brand-400" /> Click to select pages to extract</p>
            {loading ? (
              <div className="flex items-center justify-center h-64 text-brand-400"><Loader size={24} className="animate-spin mr-2" /> Loading...</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {pages.map((page, i) => {
                  const sel = selected.has(page.pageNumber);
                  return (
                    <motion.button key={page.pageNumber} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.015 }}
                      onClick={() => toggle(page.pageNumber)}
                      className={`relative aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all ${sel ? 'border-brand-500 ring-2 ring-brand-500/30' : 'border-white/10 hover:border-white/30'}`}>
                      <img src={page.dataUrl} alt={`Page ${page.pageNumber}`} className="w-full h-full object-cover" />
                      {sel && <div className="absolute inset-0 bg-brand-500/20 flex items-center justify-center"><Copy size={18} className="text-brand-400" /></div>}
                      <div className={`absolute bottom-1 left-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${sel ? 'bg-brand-500 text-white' : 'bg-black/60 text-white'}`}>{page.pageNumber}</div>
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
