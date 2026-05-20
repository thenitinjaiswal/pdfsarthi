'use client';

import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ScanLine, Camera, Download, Loader, X, CheckCircle } from 'lucide-react';
import ToolHeader from '@/components/tools/ToolHeader';
import { useToast } from '@/hooks/useToast';
import { PDFDocument } from 'pdf-lib';
import { downloadBlob } from '@/lib/utils';

export default function ScanPDFPage() {
  const [stream, setStream]   = useState(null);
  const [scans, setScans]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const toast = useToast();

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch {
      toast.error('Camera access denied. Please allow camera permissions.');
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
  };

  const captureFrame = () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    setCapturing(true);
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setScans(prev => [...prev, dataUrl]);
    setTimeout(() => setCapturing(false), 300);
    toast.success('Page captured!');
  };

  const removeScans = (idx) => setScans(prev => prev.filter((_, i) => i !== idx));

  const buildPDF = async () => {
    if (scans.length === 0) { toast.warning('Capture at least one page.'); return; }
    setLoading(true);
    try {
      const doc = await PDFDocument.create();
      for (const dataUrl of scans) {
        const base64 = dataUrl.split(',')[1];
        const bytes  = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const img    = await doc.embedJpg(bytes);
        const page   = doc.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      }
      const pdfBytes = await doc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      downloadBlob(blob, `scan-${Date.now()}.pdf`);
      toast.success(`PDF created from ${scans.length} scanned pages!`);
    } catch (err) {
      toast.error('Failed to create PDF from scans.');
    } finally { setLoading(false); }
  };

  return (
    <div>
      <ToolHeader icon={ScanLine} title="Scan PDF"
        description="Use your webcam to scan physical documents and convert them to PDF." />
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Camera panel */}
        <div className="space-y-4">
          <div className="glass rounded-2xl overflow-hidden" style={{ minHeight: 320 }}>
            {stream ? (
              <div className="relative">
                <video ref={videoRef} autoPlay playsInline muted
                  className="w-full rounded-t-2xl"
                  style={{ maxHeight: 360, objectFit: 'cover' }} />
                {capturing && (
                  <div className="absolute inset-0 bg-white/20 animate-pulse rounded-t-2xl" />
                )}
                <div className="absolute top-3 right-3">
                  <button onClick={stopCamera}
                    className="w-8 h-8 rounded-full bg-dark-900/80 flex items-center justify-center">
                    <X size={14} className="text-white" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-16 h-16 rounded-2xl bg-sky-500/15 flex items-center justify-center">
                  <Camera size={28} className="text-sky-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-dark-300 font-medium">Camera not started</p>
                  <p className="text-xs text-dark-600 mt-1">Click below to start scanning</p>
                </div>
              </div>
            )}
            <div className="p-4 flex gap-3">
              {!stream
                ? <button onClick={startCamera} className="btn-action"><Camera size={18} /> Start Camera</button>
                : <button onClick={captureFrame} className="btn-action"><Camera size={18} /> Capture Page</button>}
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Captured pages */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-dark-400">{scans.length} page{scans.length !== 1 ? 's' : ''} captured</p>
            {scans.length > 0 && (
              <button onClick={() => setScans([])} className="text-xs text-dark-600 hover:text-red-400 transition-colors">Clear all</button>
            )}
          </div>

          {scans.length === 0 ? (
            <div className="glass rounded-2xl flex flex-col items-center justify-center py-16 text-center" style={{ minHeight: 280 }}>
              <ScanLine size={32} className="text-dark-700 mb-3" />
              <p className="text-sm text-dark-600">Captured pages will appear here</p>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-3 gap-2 mb-4 max-h-72 overflow-y-auto custom-scroll">
                {scans.map((src, i) => (
                  <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    className="relative group aspect-[3/4] rounded-xl overflow-hidden border border-white/10">
                    <img src={src} alt={`Page ${i + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all" />
                    <button onClick={() => removeScans(i)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500/90
                        flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X size={11} className="text-white" />
                    </button>
                    <span className="absolute bottom-1 left-1 text-[10px] font-bold text-white/80 bg-black/50 px-1 rounded">
                      {i + 1}
                    </span>
                  </motion.div>
                ))}
              </div>
              <button onClick={buildPDF} disabled={loading} className="btn-action">
                {loading
                  ? <><Loader size={18} className="animate-spin" /> Creating PDF...</>
                  : <><Download size={18} /> Export {scans.length} Page{scans.length > 1 ? 's' : ''} as PDF</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
