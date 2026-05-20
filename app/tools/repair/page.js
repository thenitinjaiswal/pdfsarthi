'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wrench, Loader, FileText, Download, CheckCircle, AlertCircle } from 'lucide-react';
import ToolHeader from '@/components/tools/ToolHeader';
import UploadZone from '@/components/tools/UploadZone';
import { useToast } from '@/hooks/useToast';
import { formatSize, downloadBlob } from '@/lib/utils';

export default function RepairPDFPage() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const toast = useToast();

  const handleFile = ([f]) => { setFile(f); setResult(null); };

  const handleRepair = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const { PDFDocument } = await import('pdf-lib');
      const buf = await file.arrayBuffer();

      // Load with max tolerance for broken files
      const doc = await PDFDocument.load(buf, {
        ignoreEncryption: true,
        throwOnInvalidObject: false,
        updateMetadata: false,
      });

      const pageCount = doc.getPageCount();
      const bytes = await doc.save({ useObjectStreams: true });
      const blob = new Blob([bytes], { type: 'application/pdf' });

      setResult({
        blob,
        originalSize: file.size,
        newSize: bytes.byteLength,
        pageCount,
      });
      toast.success(`Repaired! PDF has ${pageCount} pages.`);
    } catch (err) {
      console.error(err);
      toast.error('Could not repair this PDF. It may be severely corrupted or encrypted.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <ToolHeader icon={Wrench} title="Repair PDF" description="Fix corrupt or broken PDFs by rebuilding their internal structure." />
      <div className="max-w-2xl mx-auto space-y-6">
        {!file ? (
          <UploadZone onFiles={handleFile} accept=".pdf" label="Drop a corrupt PDF to repair" />
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-orange-500/15 flex items-center justify-center"><FileText size={20} className="text-orange-400" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-dark-100 truncate">{file.name}</p>
                <p className="text-xs text-dark-500">{formatSize(file.size)}</p>
              </div>
              <button onClick={() => { setFile(null); setResult(null); }} className="text-xs text-dark-600 hover:text-red-400 transition-colors">× Remove</button>
            </div>

            {result && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle size={16} className="text-emerald-400" />
                  <p className="text-sm font-bold text-emerald-400">Repair Successful</p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="text-center bg-dark-900/50 rounded-lg p-2">
                    <p className="text-dark-500 mb-0.5">Pages</p>
                    <p className="text-white font-bold">{result.pageCount}</p>
                  </div>
                  <div className="text-center bg-dark-900/50 rounded-lg p-2">
                    <p className="text-dark-500 mb-0.5">Before</p>
                    <p className="text-dark-200 font-bold">{formatSize(result.originalSize)}</p>
                  </div>
                  <div className="text-center bg-dark-900/50 rounded-lg p-2">
                    <p className="text-dark-500 mb-0.5">After</p>
                    <p className="text-emerald-400 font-bold">{formatSize(result.newSize)}</p>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="bg-dark-900/60 border border-white/5 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <AlertCircle size={14} className="text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-dark-400 leading-relaxed">
                  The repair engine rebuilds the PDF's internal object structure, removes invalid entries, and re-saves with clean compression. Works best for mildly corrupted files.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={handleRepair} disabled={loading} className="btn-action flex-1 justify-center">
                {loading ? <><Loader size={18} className="animate-spin" /> Repairing...</> : <><Wrench size={18} /> Repair PDF</>}
              </button>
              {result && (
                <button onClick={() => downloadBlob(result.blob, `repaired-${file.name}`)} className="btn-secondary flex-1 justify-center">
                  <Download size={18} /> Download
                </button>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
