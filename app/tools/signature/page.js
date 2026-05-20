'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PenSquare, Download, Trash2, Loader, RotateCcw } from 'lucide-react';
import ToolHeader from '@/components/tools/ToolHeader';
import UploadZone from '@/components/tools/UploadZone';
import { useToast } from '@/hooks/useToast';
import { formatSize, downloadBlob } from '@/lib/utils';
import { PDFDocument, rgb } from 'pdf-lib';
import { readFileAsArrayBuffer } from '@/lib/pdf-service';

export default function SignaturePage() {
  const [file, setFile]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode]       = useState('draw'); // draw | type
  const [typedSig, setTypedSig] = useState('');
  const [color, setColor]     = useState('#6366f1');
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const toast = useToast();

  // Setup canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'transparent';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [color]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches?.[0];
    return {
      x: (touch ? touch.clientX : e.clientX) - rect.left,
      y: (touch ? touch.clientY : e.clientY) - rect.top,
    };
  };

  const startDraw = (e) => {
    isDrawing.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = color;
    const { x, y } = getPos(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDraw = () => { isDrawing.current = false; };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSign = async () => {
    if (!file) { toast.warning('Please select a PDF file.'); return; }
    setLoading(true);
    try {
      const buf = await readFileAsArrayBuffer(file);
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const pages = doc.getPages();
      const page = pages[0];
      const { width, height } = page.getSize();

      if (mode === 'draw') {
        const canvas = canvasRef.current;
        const dataUrl = canvas.toDataURL('image/png');
        const base64 = dataUrl.split(',')[1];
        const sigBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const pngImage = await doc.embedPng(sigBytes);
        const dims = pngImage.scaleToFit(200, 80);
        page.drawImage(pngImage, {
          x: width - dims.width - 40,
          y: 40,
          width: dims.width,
          height: dims.height,
        });
      } else if (mode === 'type' && typedSig.trim()) {
        const { StandardFonts } = await import('pdf-lib');
        const font = await doc.embedFont(StandardFonts.HelveticaOblique);
        page.drawText(typedSig, {
          x: width - 240, y: 50,
          size: 32, font, color: rgb(0.38, 0.4, 0.95), opacity: 0.9,
        });
      }

      const bytes = await doc.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      downloadBlob(blob, `signed-${file.name}`);
      toast.success('Signature added and PDF downloaded!');
    } catch (err) {
      toast.error('Failed to add signature.');
      console.error(err);
    } finally { setLoading(false); }
  };

  return (
    <div>
      <ToolHeader icon={PenSquare} title="Sign PDF" description="Draw or type your signature and embed it into a PDF." />
      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          {!file
            ? <UploadZone onFiles={([f]) => setFile(f)} accept=".pdf" label="Select PDF to Sign" />
            : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="glass rounded-2xl p-5" style={{ minHeight: 320 }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/15 flex items-center justify-center">
                    <PenSquare size={16} className="text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dark-200 truncate">{file.name}</p>
                    <p className="text-xs text-dark-500">{formatSize(file.size)}</p>
                  </div>
                </div>
                <button onClick={() => setFile(null)} className="text-xs text-dark-600 hover:text-red-400 transition-colors">× Remove</button>
              </motion.div>
            )}
        </div>
        <div className="space-y-4">
          {/* Mode tabs */}
          <div className="glass rounded-2xl p-5">
            <div className="flex gap-2 mb-4">
              {[{ id: 'draw', label: '✏️ Draw' }, { id: 'type', label: 'T Type' }].map(m => (
                <button key={m.id} onClick={() => setMode(m.id)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                    mode === m.id ? 'border-brand-500/40 bg-brand-500/10 text-brand-400' : 'border-white/8 text-dark-400 hover:border-white/15'}`}>
                  {m.label}
                </button>
              ))}
            </div>

            {mode === 'draw' ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-dark-500">Draw your signature below</p>
                  <div className="flex items-center gap-2">
                    {['#6366f1', '#000000', '#1d4ed8', '#dc2626'].map(c => (
                      <button key={c} onClick={() => setColor(c)}
                        className={`w-5 h-5 rounded-full border-2 transition-all ${color === c ? 'border-white scale-125' : 'border-transparent'}`}
                        style={{ background: c }} />
                    ))}
                    <button onClick={clearCanvas} className="btn-ghost p-1 ml-1" title="Clear">
                      <RotateCcw size={13} />
                    </button>
                  </div>
                </div>
                <canvas
                  ref={canvasRef}
                  width={380} height={140}
                  onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                  onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
                  className="w-full rounded-xl border border-white/10 bg-dark-800 touch-none cursor-crosshair"
                  style={{ height: 140 }}
                />
              </div>
            ) : (
              <div>
                <label className="text-xs text-dark-400 mb-2 block">Type your name</label>
                <input type="text" value={typedSig} onChange={e => setTypedSig(e.target.value)}
                  placeholder="Your Name" className="input-dark mb-3" />
                {typedSig && (
                  <p className="text-3xl text-brand-400 font-serif italic pl-2 border-l-2 border-brand-500/30">
                    {typedSig}
                  </p>
                )}
              </div>
            )}
          </div>
          <button onClick={handleSign} disabled={!file || loading} className="btn-action">
            {loading ? <><Loader size={18} className="animate-spin" /> Adding Signature...</> : <><PenSquare size={18} /> Sign & Download</>}
          </button>
        </div>
      </div>
    </div>
  );
}
