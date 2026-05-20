'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Stamp, Download, Loader, FileText } from 'lucide-react';
import ToolHeader from '@/components/tools/ToolHeader';
import UploadZone from '@/components/tools/UploadZone';
import { useToast } from '@/hooks/useToast';
import { watermarkPDF } from '@/lib/pdf-service';
import { formatSize, downloadBlob } from '@/lib/utils';

export default function WatermarkPDFPage() {
  const [file, setFile]     = useState(null);
  const [text, setText]     = useState('CONFIDENTIAL');
  const [opacity, setOpacity] = useState(0.18);
  const [angle, setAngle]   = useState(45);
  const [fontSize, setFontSize] = useState(56);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleWatermark = async () => {
    if (!file) { toast.warning('Please select a PDF file.'); return; }
    if (!text.trim()) { toast.warning('Enter watermark text.'); return; }
    setLoading(true);
    try {
      const blob = await watermarkPDF(file, { text, opacity, angle, fontSize });
      downloadBlob(blob, `watermarked-${file.name}`);
      toast.success('Watermark added successfully!');
    } catch (err) {
      toast.error('Failed to add watermark.');
    } finally { setLoading(false); }
  };

  return (
    <div>
      <ToolHeader icon={Stamp} title="Watermark PDF" description="Add text watermarks to all pages of your PDF." />
      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          {!file
            ? <UploadZone onFiles={([f]) => setFile(f)} accept=".pdf" label="Select PDF to Watermark" />
            : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="glass rounded-2xl p-5" style={{ minHeight: 320 }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                    <FileText size={18} className="text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dark-200 truncate">{file.name}</p>
                    <p className="text-xs text-dark-500">{formatSize(file.size)}</p>
                  </div>
                </div>
                {/* Preview */}
                <div className="rounded-xl bg-dark-800 h-40 flex items-center justify-center relative overflow-hidden">
                  <div className="w-full h-full bg-white/5 rounded-lg" />
                  <p className="absolute text-dark-600 font-bold pointer-events-none"
                    style={{ fontSize: 20, opacity, transform: `rotate(${-angle}deg)`, userSelect: 'none' }}>
                    {text || 'WATERMARK'}
                  </p>
                </div>
                <button onClick={() => setFile(null)} className="text-xs text-dark-600 hover:text-red-400 mt-4 block">× Remove file</button>
              </motion.div>
            )}
        </div>
        <div className="space-y-4">
          <div className="glass rounded-2xl p-5 space-y-4">
            <div>
              <label className="text-xs text-dark-400 mb-2 block">Watermark Text</label>
              <input type="text" value={text} onChange={e => setText(e.target.value)} placeholder="CONFIDENTIAL" className="input-dark" />
            </div>
            <div>
              <label className="text-xs text-dark-400 mb-2 block">Opacity: {Math.round(opacity * 100)}%</label>
              <input type="range" min={5} max={60} value={Math.round(opacity * 100)}
                onChange={e => setOpacity(parseInt(e.target.value) / 100)}
                className="w-full accent-brand-500" />
            </div>
            <div>
              <label className="text-xs text-dark-400 mb-2 block">Rotation: {angle}°</label>
              <input type="range" min={0} max={90} value={angle}
                onChange={e => setAngle(parseInt(e.target.value))}
                className="w-full accent-brand-500" />
            </div>
            <div>
              <label className="text-xs text-dark-400 mb-2 block">Font Size: {fontSize}pt</label>
              <input type="range" min={16} max={120} value={fontSize}
                onChange={e => setFontSize(parseInt(e.target.value))}
                className="w-full accent-brand-500" />
            </div>
          </div>
          <button onClick={handleWatermark} disabled={!file || loading} className="btn-action">
            {loading ? <><Loader size={18} className="animate-spin" /> Adding Watermark...</> : <><Stamp size={18} /> Add Watermark</>}
          </button>
        </div>
      </div>
    </div>
  );
}
