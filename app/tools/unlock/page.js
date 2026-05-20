'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { LockOpen, Download, Loader, FileText, AlertTriangle } from 'lucide-react';
import ToolHeader from '@/components/tools/ToolHeader';
import UploadZone from '@/components/tools/UploadZone';
import { useToast } from '@/hooks/useToast';
import { formatSize, downloadBlob } from '@/lib/utils';
import { PDFDocument } from 'pdf-lib';
import { readFileAsArrayBuffer } from '@/lib/pdf-service';

export default function UnlockPDFPage() {
  const [file, setFile]         = useState(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const toast = useToast();

  const handleUnlock = async () => {
    if (!file) { toast.warning('Please select a PDF file.'); return; }
    setLoading(true);
    try {
      const buf = await readFileAsArrayBuffer(file);
      const doc = await PDFDocument.load(buf, {
        password: password || undefined,
        ignoreEncryption: !password,
      });
      const bytes = await doc.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      downloadBlob(blob, `unlocked-${file.name}`);
      toast.success('PDF unlocked and downloaded!');
    } catch (err) {
      if (err.message?.includes('password')) {
        toast.error('Incorrect password. Please try again.');
      } else {
        toast.error('Failed to unlock PDF. The file may use unsupported encryption.');
      }
    } finally { setLoading(false); }
  };

  return (
    <div>
      <ToolHeader icon={LockOpen} title="Unlock PDF"
        description="Remove password protection from encrypted PDF files." />
      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          {!file
            ? <UploadZone onFiles={([f]) => setFile(f)} accept=".pdf" label="Select Protected PDF" />
            : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="glass rounded-2xl p-6 flex flex-col items-center justify-center gap-4 text-center" style={{ minHeight: 320 }}>
                <div className="w-16 h-16 rounded-2xl bg-teal-500/15 flex items-center justify-center animate-pulse">
                  <LockOpen size={28} className="text-teal-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-dark-200">{file.name}</p>
                  <p className="text-xs text-dark-500 mt-0.5">{formatSize(file.size)}</p>
                </div>
                <div className="rounded-xl bg-amber-500/8 border border-amber-500/20 p-3 text-left w-full max-w-xs">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-400">Only unlock PDFs you own or have permission to access.</p>
                  </div>
                </div>
                <button onClick={() => setFile(null)} className="text-xs text-dark-600 hover:text-red-400 transition-colors">× Remove file</button>
              </motion.div>
            )}
        </div>
        <div className="space-y-4">
          <div className="glass rounded-2xl p-5 space-y-4">
            <div>
              <label className="text-xs text-dark-400 mb-2 block">Password (if required)</label>
              <input type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Leave empty for unprotected PDFs"
                className="input-dark" />
              <p className="text-xs text-dark-600 mt-2">
                If the PDF is password-protected, enter the password to unlock it.
              </p>
            </div>
          </div>
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-dark-200 mb-3">What gets removed</h3>
            <ul className="space-y-2">
              {['Open password', 'Edit restrictions', 'Print restrictions', 'Copy restrictions'].map(item => (
                <li key={item} className="flex items-center gap-2 text-xs text-dark-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <button onClick={handleUnlock} disabled={!file || loading} className="btn-action">
            {loading
              ? <><Loader size={18} className="animate-spin" /> Unlocking...</>
              : <><LockOpen size={18} /> Unlock PDF</>}
          </button>
        </div>
      </div>
    </div>
  );
}
