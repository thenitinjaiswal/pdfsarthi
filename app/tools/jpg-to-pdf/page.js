'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image, Upload, X, Download, Loader, GripVertical, Plus } from 'lucide-react';
import ToolHeader from '@/components/tools/ToolHeader';
import { useToast } from '@/hooks/useToast';
import { downloadBlob } from '@/lib/utils';

export default function JpgToPdfPage() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageSize, setPageSize] = useState('fit'); // 'fit' | 'a4' | 'letter'
  const [margin, setMargin] = useState(20);
  const fileRef = useRef();
  const toast = useToast();

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    if (!files.length) return;
    const newImgs = files.map(f => ({
      id: Math.random().toString(36).slice(2),
      file: f,
      url: URL.createObjectURL(f),
      name: f.name,
    }));
    setImages(prev => [...prev, ...newImgs]);
  };

  const removeImage = (id) => setImages(prev => prev.filter(i => i.id !== id));

  const handleConvert = async () => {
    if (!images.length) { toast.warning('Add at least one image.'); return; }
    setLoading(true);
    try {
      const { PDFDocument } = await import('pdf-lib');
      const doc = await PDFDocument.create();

      for (const img of images) {
        const buf = await img.file.arrayBuffer();
        let pdfImg;
        if (img.file.type === 'image/jpeg' || img.file.type === 'image/jpg') {
          pdfImg = await doc.embedJpg(buf);
        } else {
          pdfImg = await doc.embedPng(buf);
        }

        const { width: iw, height: ih } = pdfImg;

        let pw, ph;
        if (pageSize === 'a4') { pw = 595; ph = 842; }
        else if (pageSize === 'letter') { pw = 612; ph = 792; }
        else { pw = iw + margin * 2; ph = ih + margin * 2; }

        const page = doc.addPage([pw, ph]);
        const availW = pw - margin * 2;
        const availH = ph - margin * 2;
        const scale = Math.min(availW / iw, availH / ih);
        const drawW = iw * scale;
        const drawH = ih * scale;

        page.drawImage(pdfImg, {
          x: (pw - drawW) / 2,
          y: (ph - drawH) / 2,
          width: drawW,
          height: drawH,
        });
      }

      const bytes = await doc.save();
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), 'images-to-pdf.pdf');
      toast.success(`PDF created with ${images.length} page(s)!`);
    } catch (err) {
      console.error(err);
      toast.error('Conversion failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <ToolHeader icon={Image} title="JPG / Image to PDF" description="Convert any JPG, PNG, or image into a crisp PDF document." />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Settings */}
        <div className="space-y-4">
          <div className="glass rounded-2xl p-5">
            <p className="text-xs font-bold text-dark-400 uppercase tracking-widest mb-3">Page Size</p>
            <div className="space-y-2">
              {[
                { id: 'fit', label: 'Fit to Image', desc: 'Page matches image dimensions' },
                { id: 'a4',  label: 'A4',           desc: '210 × 297 mm' },
                { id: 'letter', label: 'Letter',    desc: '8.5 × 11 in' },
              ].map(s => (
                <button key={s.id} onClick={() => setPageSize(s.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${pageSize === s.id ? 'border-brand-500/50 bg-brand-500/10 text-brand-300' : 'border-white/8 text-dark-400 hover:border-white/15'}`}>
                  <p className="text-sm font-semibold">{s.label}</p>
                  <p className="text-xs opacity-70 mt-0.5">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="glass rounded-2xl p-5">
            <p className="text-xs font-bold text-dark-400 uppercase tracking-widest mb-3">Margin: {margin}px</p>
            <input type="range" min={0} max={80} value={margin} onChange={e => setMargin(+e.target.value)} className="w-full accent-brand-500" />
          </div>

          <button onClick={handleConvert} disabled={loading || !images.length} className="btn-action w-full justify-center">
            {loading ? <><Loader size={18} className="animate-spin" /> Converting...</> : <><Download size={18} /> Convert to PDF</>}
          </button>
        </div>

        {/* Right: Image Gallery */}
        <div className="lg:col-span-2 glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-white">{images.length} Image(s) Added</p>
            <button onClick={() => fileRef.current?.click()} className="btn-secondary text-xs py-1.5 px-3">
              <Plus size={14} /> Add Images
            </button>
          </div>
          <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={handleFiles} />

          {images.length === 0 ? (
            <button onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-white/15 rounded-2xl p-16 text-center hover:border-brand-500/40 hover:bg-brand-500/5 transition-all group">
              <Upload size={32} className="mx-auto mb-3 text-dark-500 group-hover:text-brand-400 transition-colors" />
              <p className="text-sm font-medium text-dark-400 group-hover:text-dark-200">Click to upload JPG, PNG, WebP...</p>
            </button>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <AnimatePresence>
                {images.map((img, i) => (
                  <motion.div key={img.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                    className="relative group aspect-[3/4] rounded-xl overflow-hidden border-2 border-white/10 hover:border-brand-500/40 transition-all bg-dark-900">
                    <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute top-1 left-1 bg-black/70 text-white text-[10px] font-bold w-5 h-5 rounded flex items-center justify-center">{i + 1}</div>
                    <button onClick={() => removeImage(img.id)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-500/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X size={12} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
