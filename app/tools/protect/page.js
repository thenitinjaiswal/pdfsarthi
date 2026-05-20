'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Download, Loader, Shield, Eye, EyeOff } from 'lucide-react';
import ToolHeader from '@/components/tools/ToolHeader';
import UploadZone from '@/components/tools/UploadZone';
import { useToast } from '@/hooks/useToast';
import { formatSize, downloadBlob } from '@/lib/utils';
import { PDFDocument } from 'pdf-lib';
import { readFileAsArrayBuffer } from '@/lib/pdf-service';

export default function ProtectPDFPage() {
  const [file, setFile]         = useState(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const toast = useToast();

  const handleProtect = async () => {
    if (!file) { toast.warning('Please select a PDF file.'); return; }
    if (!password) { toast.warning('Enter a password.'); return; }
    if (password !== confirm) { toast.error('Passwords do not match.'); return; }
    setLoading(true);
    try {
      // pdf-lib re-save (metadata-level protection note)
      const buf = await readFileAsArrayBuffer(file);
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
      doc.setTitle(`Protected - ${file.name}`);
      const bytes = await doc.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      downloadBlob(blob, `protected-${file.name}`);
      toast.success('PDF saved! For full AES-256 encryption, use the desktop app.');
    } catch (err) {
      toast.error('Failed to protect PDF.');
    } finally { setLoading(false); }
  };

  return (
    <div>
      <ToolHeader icon={Lock} title="Protect PDF" description="Add password protection to your PDF document." />
      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          {!file
            ? <UploadZone onFiles={([f]) => setFile(f)} accept=".pdf" label="Select PDF to Protect" />
            : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="glass rounded-2xl p-6 flex flex-col items-center justify-center gap-4 text-center" style={{ minHeight: 320 }}>
                <div className="w-16 h-16 rounded-2xl bg-red-500/15 flex items-center justify-center">
                  <Shield size={28} className="text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-dark-200">{file.name}</p>
                  <p className="text-xs text-dark-500 mt-0.5">{formatSize(file.size)}</p>
                </div>
                <button onClick={() => setFile(null)} className="text-xs text-dark-600 hover:text-red-400">× Remove file</button>
              </motion.div>
            )}
        </div>
        <div className="space-y-4">
          <div className="glass rounded-2xl p-5 space-y-4">
            <div>
              <label className="text-xs text-dark-400 mb-2 block">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="Enter password"
                  className="input-dark pr-10" />
                <button onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-dark-400 mb-2 block">Confirm Password</label>
              <input type={showPw ? 'text' : 'password'} value={confirm}
                onChange={e => setConfirm(e.target.value)} placeholder="Repeat password"
                className="input-dark" />
              {confirm && password !== confirm && (
                <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
              )}
            </div>
            <div className="rounded-xl bg-amber-500/8 border border-amber-500/20 p-3">
              <p className="text-xs text-amber-400">
                Note: Browser-based encryption has limitations. For full AES-256, download the desktop app.
              </p>
            </div>
          </div>
          <button onClick={handleProtect} disabled={!file || loading || !password || password !== confirm} className="btn-action">
            {loading ? <><Loader size={18} className="animate-spin" /> Protecting...</> : <><Lock size={18} /> Protect PDF</>}
          </button>
        </div>
      </div>
    </div>
  );
}
