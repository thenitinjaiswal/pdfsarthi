'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Check, Pen, FileSignature, Upload } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

const HANDWRITING_FONTS = [
  { name: 'Caveat', fontClass: "font-['Caveat']" },
  { name: 'Dancing Script', fontClass: "font-['Dancing_Script']" },
  { name: 'Great Vibes', fontClass: "font-['Great_Vibes']" },
  { name: 'Sacramento', fontClass: "font-['Sacramento']" },
  { name: 'Alex Brush', fontClass: "font-['Alex_Brush']" }
];

export default function SignatureModal({ isOpen, onClose, onSave }) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('draw'); // 'draw', 'type', 'upload'
  
  // Draw tab states
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Type tab states
  const [typedText, setTypedText] = useState('');
  const [selectedFontIndex, setSelectedFontIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState('#000000');
  
  // Upload tab states
  const [uploadedImage, setUploadedImage] = useState(null);

  // Load Handwriting Google Fonts on Mount
  useEffect(() => {
    if (isOpen) {
      const link = document.createElement('link');
      link.href = 'https://fonts.googleapis.com/css2?family=Alex+Brush&family=Caveat:wght@400;700&family=Dancing+Script:wght@400;700&family=Great+Vibes&family=Sacramento&display=swap';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
      return () => {
        // Leave the fonts loaded so they work in the editor context as well!
      };
    }
  }, [isOpen]);

  // Adjust draw canvas dimensions and scale
  useEffect(() => {
    if (isOpen && activeTab === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const rect = canvas.parentNode.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = 180;
      
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  // Drawing mouse handlers
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Support touch and mouse
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Upload image handler
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    let signatureDataUrl = null;

    if (activeTab === 'draw') {
      const canvas = canvasRef.current;
      if (canvas) {
        // Check if canvas is empty
        const ctx = canvas.getContext('2d');
        const buffer = new Uint32Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
        const hasContent = buffer.some(color => color !== 0);
        
        if (!hasContent) {
          toast.warning('Please draw a signature first.');
          return;
        }
        signatureDataUrl = canvas.toDataURL('image/png');
      }
    } else if (activeTab === 'type') {
      if (!typedText.trim()) {
        toast.warning('Please type your name first.');
        return;
      }
      
      // Render typed text to a canvas
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 120;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Load handwriting font
      const font = HANDWRITING_FONTS[selectedFontIndex];
      ctx.fillStyle = selectedColor;
      ctx.font = `italic 42px ${font.name}, 'Caveat', cursive`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Draw signature text
      ctx.fillText(typedText, canvas.width / 2, canvas.height / 2);
      
      signatureDataUrl = canvas.toDataURL('image/png');
    } else if (activeTab === 'upload') {
      if (!uploadedImage) {
        toast.warning('Please upload a signature image first.');
        return;
      }
      signatureDataUrl = uploadedImage;
    }

    if (signatureDataUrl) {
      onSave(signatureDataUrl);
      onClose();
      // Reset states
      setTypedText('');
      setUploadedImage(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-dark-900 border border-white/8 rounded-2xl w-full max-w-lg overflow-hidden shadow-glow flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-brand-400">
            <FileSignature size={18} />
            <h3 className="font-bold text-white text-base">Create Digital Signature</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-lg text-dark-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-white/5 shrink-0 bg-dark-950/40">
          {[
            { id: 'draw', label: 'Draw', icon: Pen },
            { id: 'type', label: 'Type', icon: FileSignature },
            { id: 'upload', label: 'Upload', icon: Upload }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-brand-500 text-brand-400 bg-brand-500/[0.02]'
                  : 'border-transparent text-dark-400 hover:text-dark-200 hover:bg-white/[0.01]'
              }`}
            >
              <tab.icon size={13} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5 flex-1 min-h-[200px] flex flex-col justify-center">
          
          {/* DRAW TAB */}
          {activeTab === 'draw' && (
            <div className="flex flex-col gap-3">
              <div className="border border-white/10 rounded-xl bg-white relative h-[180px] overflow-hidden">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-full cursor-crosshair touch-none block"
                />
                <button
                  onClick={clearCanvas}
                  className="absolute bottom-2 right-2 px-2.5 py-1 rounded bg-dark-950/80 hover:bg-dark-950 text-[10px] font-bold text-dark-400 hover:text-white border border-white/5 transition-colors"
                >
                  Clear Canvas
                </button>
              </div>
              <p className="text-[10px] text-dark-500 text-center">
                Draw your signature inside the area. Transparent PNG will be created.
              </p>
            </div>
          )}

          {/* TYPE TAB */}
          {activeTab === 'type' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs text-dark-400">Type your name</label>
                <input
                  type="text"
                  maxLength={25}
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="input-dark text-sm w-full py-2.5"
                />
              </div>

              {/* Color picker */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-dark-400">Color:</span>
                <div className="flex items-center gap-1.5">
                  {['#000000', '#1d4ed8', '#0f766e', '#b91c1c'].map(c => (
                    <button
                      key={c}
                      onClick={() => setSelectedColor(c)}
                      className={`w-6 h-6 rounded-full border transition-all ${
                        selectedColor === c ? 'border-white scale-110 shadow-glow-sm' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Font Previews */}
              <div className="flex flex-col gap-2">
                <label className="text-xs text-dark-400">Select signature style</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
                  {HANDWRITING_FONTS.map((font, idx) => (
                    <button
                      key={font.name}
                      onClick={() => setSelectedFontIndex(idx)}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                        selectedFontIndex === idx
                          ? 'border-brand-500 bg-brand-500/5'
                          : 'border-white/5 bg-white/[0.01] hover:border-white/10 hover:bg-white/[0.03]'
                      }`}
                    >
                      <span 
                        className={`text-xl truncate ${font.fontClass}`}
                        style={{ color: selectedColor }}
                      >
                        {typedText || 'Signature'}
                      </span>
                      <span className="text-[9px] text-dark-500 font-mono">
                        {font.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* UPLOAD TAB */}
          {activeTab === 'upload' && (
            <div className="flex flex-col gap-4">
              {!uploadedImage ? (
                <label className="border border-dashed border-white/10 rounded-2xl h-[180px] flex flex-col items-center justify-center cursor-pointer bg-white/[0.01] hover:bg-white/[0.02] hover:border-brand-500 transition-all p-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Upload size={32} className="text-dark-500 mb-2" />
                  <span className="text-xs text-dark-300 font-semibold mb-1">Click to upload image</span>
                  <span className="text-[10px] text-dark-500">Supports transparent PNG, JPG signatures</span>
                </label>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="border border-white/10 rounded-2xl h-[180px] overflow-hidden bg-white/5 flex items-center justify-center p-3 relative group">
                    <img src={uploadedImage} alt="Uploaded signature" className="max-h-full max-w-full object-contain" />
                    <button
                      onClick={() => setUploadedImage(null)}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold text-red-400 transition-opacity"
                    >
                      Remove & Upload Different
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-white/5 shrink-0 bg-dark-950/40 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="btn-secondary px-4 py-2 text-xs rounded-xl"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="btn-primary px-5 py-2 text-xs rounded-xl shadow-glow-sm"
          >
            <Check size={14} />
            <span>Create Signature</span>
          </button>
        </div>
      </div>
    </div>
  );
}
