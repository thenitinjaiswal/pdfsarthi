'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Check, Pen, FileSignature, Upload, Camera, Sparkles, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { motion, AnimatePresence } from 'framer-motion';

const HANDWRITING_FONTS = [
  { name: 'Caveat', fontClass: "font-['Caveat']" },
  { name: 'Dancing Script', fontClass: "font-['Dancing_Script']" },
  { name: 'Great Vibes', fontClass: "font-['Great_Vibes']" },
  { name: 'Sacramento', fontClass: "font-['Sacramento']" },
  { name: 'Alex Brush', fontClass: "font-['Alex_Brush']" },
  { name: 'Rochester', fontClass: "font-['Rochester']" },
  { name: 'Playball', fontClass: "font-['Playball']" },
  { name: 'Allura', fontClass: "font-['Allura']" },
  { name: 'Reenie Beanie', fontClass: "font-['Reenie_Beanie']" },
  { name: 'Monsieur La Doulaise', fontClass: "font-['Monsieur_La_Doulaise']" }
];

export default function SignatureModal({ isOpen, onClose, onSave }) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('draw'); // 'draw', 'type', 'upload', 'camera'
  
  // Draw tab states
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokeColor, setStrokeColor] = useState('#000000');
  
  // Type tab states
  const [typedText, setTypedText] = useState('');
  const [selectedFontIndex, setSelectedFontIndex] = useState(0);
  const [typedColor, setTypedColor] = useState('#000000');
  
  // Upload tab states
  const [rawUploadedImage, setRawUploadedImage] = useState(null);
  const [processedUploadType, setProcessedUploadType] = useState('original'); // 'original', 'trans-a', 'trans-b'
  const [processedUploadUrl, setProcessedUploadUrl] = useState(null);

  // Camera tab states
  const videoRef = useRef(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [capturedFrame, setCapturedFrame] = useState(null); // base64
  const [processedCameraUrl, setProcessedCameraUrl] = useState(null);

  // Load Handwriting Google Fonts on Mount
  useEffect(() => {
    if (isOpen) {
      const link = document.createElement('link');
      link.href = 'https://fonts.googleapis.com/css2?family=Alex+Brush&family=Allura&family=Caveat:wght@400;700&family=Dancing+Script:wght@400;700&family=Great+Vibes&family=Monsieur+La+Doulaise&family=Playball&family=Reenie+Beanie&family=Rochester&family=Sacramento&display=swap';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
      return () => {
        // Keep font stylesheets active
      };
    }
  }, [isOpen]);

  // Adjust draw canvas dimensions and scaling
  useEffect(() => {
    if (isOpen && activeTab === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const rect = canvas.parentNode.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = 180;
      
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 3.0;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [isOpen, activeTab, strokeColor]);

  // Web camera feed activation
  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, activeTab]);

  const startCamera = async () => {
    setCameraError(null);
    setCapturedFrame(null);
    setProcessedCameraUrl(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error(err);
      setCameraError('Webcam access was denied or is unavailable. Emulating webcam...');
      emulateWebcam();
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const emulateWebcam = () => {
    // Generate dummy canvas with mock text to simulate document signature scan
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw dummy document borders & lines
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    ctx.beginPath();
    ctx.moveTo(50, 200);
    ctx.lineTo(350, 200);
    ctx.stroke();

    ctx.fillStyle = '#666666';
    ctx.font = '12px Arial';
    ctx.fillText('Hold signature sheet here', 40, 40);
    ctx.fillText('X', 50, 190);

    // Draw handwritten fake signature
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(80, 185);
    ctx.bezierCurveTo(120, 140, 180, 130, 220, 170);
    ctx.bezierCurveTo(250, 195, 290, 145, 330, 160);
    ctx.stroke();

    setCapturedFrame(canvas.toDataURL('image/png'));
  };

  // ── Image Processing Logic ──────────────────────────────────────────────────
  // Extract and process signatures (remove white background, black filter)
  const processImage = (dataUrl, type, callback) => {
    if (type === 'original') {
      callback(dataUrl);
      return;
    }

    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Check if pixel is white/light (brightness threshold)
        const brightness = (r + g + b) / 3;
        
        if (type === 'trans-a') {
          // Version A: Make white background transparent
          if (brightness > 210) {
            data[i + 3] = 0; // set alpha to 0
          }
        } else if (type === 'trans-b') {
          // Version B: Make transparent and apply a high contrast black tint for pure ink extraction
          if (brightness > 190) {
            data[i + 3] = 0;
          } else {
            // Apply solid dark ink
            data[i] = 16;
            data[i + 1] = 16;
            data[i + 2] = 16;
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);
      callback(canvas.toDataURL('image/png'));
    };
  };

  // Sync uploaded image processing
  useEffect(() => {
    if (rawUploadedImage) {
      processImage(rawUploadedImage, processedUploadType, setProcessedUploadUrl);
    }
  }, [rawUploadedImage, processedUploadType]);

  // Sync captured camera image processing
  useEffect(() => {
    if (capturedFrame) {
      processImage(capturedFrame, 'trans-b', setProcessedCameraUrl);
    }
  }, [capturedFrame]);

  // ── Drawing Handlers ────────────────────────────────────────────────────────
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
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

  // Upload file loader
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setRawUploadedImage(event.target.result);
        setProcessedUploadType('original');
      };
      reader.readAsDataURL(file);
    }
  };

  // Camera capture click
  const captureCamera = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCapturedFrame(canvas.toDataURL('image/png'));
    stopCamera();
  };

  const handleSubmit = () => {
    let signatureDataUrl = null;

    if (activeTab === 'draw') {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const buffer = new Uint32Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
        const hasContent = buffer.some(color => color !== 0);
        
        if (!hasContent) {
          toast.warning('Please draw your signature first.');
          return;
        }
        signatureDataUrl = canvas.toDataURL('image/png');
      }
    } else if (activeTab === 'type') {
      if (!typedText.trim()) {
        toast.warning('Please type your name first.');
        return;
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = 450;
      canvas.height = 140;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const font = HANDWRITING_FONTS[selectedFontIndex];
      ctx.fillStyle = typedColor;
      ctx.font = `italic 38px ${font.name}, 'Caveat', cursive`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(typedText, canvas.width / 2, canvas.height / 2);
      
      signatureDataUrl = canvas.toDataURL('image/png');
    } else if (activeTab === 'upload') {
      if (!processedUploadUrl) {
        toast.warning('Please upload a signature image first.');
        return;
      }
      signatureDataUrl = processedUploadUrl;
    } else if (activeTab === 'camera') {
      if (!processedCameraUrl) {
        toast.warning('Please capture a signature frame first.');
        return;
      }
      signatureDataUrl = processedCameraUrl;
    }

    if (signatureDataUrl) {
      onSave(signatureDataUrl);
      onClose();
      // Reset state variables
      setTypedText('');
      setRawUploadedImage(null);
      setProcessedUploadUrl(null);
      setCapturedFrame(null);
      setProcessedCameraUrl(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-dark-900 border border-white/10 rounded-2xl w-full max-w-xl overflow-hidden shadow-glow flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-brand-400">
            <FileSignature size={18} />
            <h3 className="font-bold text-white text-base">E-Signature Capture</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-lg text-dark-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-white/5 shrink-0 bg-dark-950/40">
          {[
            { id: 'draw', label: 'Draw', icon: Pen },
            { id: 'type', label: 'Type Name', icon: FileSignature },
            { id: 'upload', label: 'Upload File', icon: Upload },
            { id: 'camera', label: 'Webcam', icon: Camera }
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

        {/* Content Body */}
        <div className="p-6 flex-1 min-h-[220px] flex flex-col justify-center bg-dark-950/20">
          
          {/* DRAW TAB */}
          {activeTab === 'draw' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-dark-400 uppercase font-bold tracking-wider">Draw on canvas</span>
                <div className="flex items-center gap-1.5">
                  {['#000000', '#1d4ed8', '#b91c1c'].map(c => (
                    <button
                      key={c}
                      onClick={() => setStrokeColor(c)}
                      className={`w-4 h-4 rounded-full border transition-all ${
                        strokeColor === c ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

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
                  className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-dark-950/80 hover:bg-dark-950 text-[10px] font-bold text-dark-400 hover:text-white border border-white/5 transition-all"
                >
                  Clear Pad
                </button>
              </div>
            </div>
          )}

          {/* TYPE TAB */}
          {activeTab === 'type' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-dark-400 uppercase font-bold tracking-wider">Enter your signature name</label>
                <input
                  type="text"
                  maxLength={30}
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                  placeholder="e.g. Amanda Jones"
                  className="bg-dark-950 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-dark-200 outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] text-dark-400 uppercase font-bold tracking-wider">Ink Color</span>
                <div className="flex items-center gap-1.5">
                  {['#000000', '#1d4ed8', '#0f766e', '#b91c1c'].map(c => (
                    <button
                      key={c}
                      onClick={() => setTypedColor(c)}
                      className={`w-5 h-5 rounded-full border transition-all ${
                        typedColor === c ? 'border-white scale-110 shadow-glow-sm' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] text-dark-400 uppercase font-bold tracking-wider">Choose handwriting typography</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1 custom-scroll">
                  {HANDWRITING_FONTS.map((font, idx) => (
                    <button
                      key={font.name}
                      onClick={() => setSelectedFontIndex(idx)}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                        selectedFontIndex === idx
                          ? 'border-brand-500 bg-brand-500/5'
                          : 'border-white/5 bg-white/[0.01] hover:border-white/10 hover:bg-white/[0.02]'
                      }`}
                    >
                      <span 
                        className={`text-2xl truncate ${font.fontClass}`}
                        style={{ color: typedColor }}
                      >
                        {typedText || 'Signature'}
                      </span>
                      <span className="text-[9px] text-dark-500 font-mono shrink-0">
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
              {!rawUploadedImage ? (
                <label className="border border-dashed border-white/10 rounded-2xl h-[180px] flex flex-col items-center justify-center cursor-pointer bg-white/[0.01] hover:bg-white/[0.02] hover:border-brand-500 transition-all p-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Upload size={32} className="text-dark-500 mb-2" />
                  <span className="text-xs text-dark-300 font-semibold mb-1">Click to Upload Signature File</span>
                  <span className="text-[10px] text-dark-500">JPG, PNG, WEBP, GIF formats supported</span>
                </label>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-2 bg-white/[0.02] border border-white/5 p-1 rounded-xl">
                    {[
                      { id: 'original', label: 'Original' },
                      { id: 'trans-a', label: 'Transparent A' },
                      { id: 'trans-b', label: 'Ink Filter B' }
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => setProcessedUploadType(mode.id)}
                        className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-all ${
                          processedUploadType === mode.id ? 'bg-white/10 text-white' : 'text-dark-400 hover:text-dark-200'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>

                  <div className="border border-white/10 rounded-xl h-[130px] overflow-hidden bg-white flex items-center justify-center p-3 relative group">
                    {processedUploadUrl ? (
                      <img src={processedUploadUrl} alt="Processed Signature" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <RefreshCw size={20} className="animate-spin text-brand-500" />
                    )}
                    <button
                      onClick={() => setRawUploadedImage(null)}
                      className="absolute inset-0 bg-black/85 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold text-red-500 transition-opacity"
                    >
                      Click to Clear
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CAMERA TAB */}
          {activeTab === 'camera' && (
            <div className="flex flex-col gap-3">
              {!capturedFrame ? (
                <div className="relative border border-white/10 rounded-xl h-[180px] bg-black overflow-hidden flex items-center justify-center">
                  {cameraError ? (
                    <div className="p-4 text-center">
                      <p className="text-xs text-yellow-500 mb-2">{cameraError}</p>
                      <button onClick={startCamera} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white transition-all">
                        Retry Camera
                      </button>
                    </div>
                  ) : (
                    <>
                      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                      <button
                        onClick={captureCamera}
                        className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-brand-500 hover:bg-brand-600 px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-lg transition-colors"
                      >
                        <Camera size={14} />
                        <span>Snapshot Frame</span>
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="text-[10px] text-brand-400 uppercase font-bold tracking-wider flex items-center gap-1">
                    <Sparkles size={11} />
                    <span>Background processed and extracted</span>
                  </div>

                  <div className="border border-white/10 rounded-xl h-[130px] overflow-hidden bg-white flex items-center justify-center p-3 relative group">
                    {processedCameraUrl ? (
                      <img src={processedCameraUrl} alt="Captured signature" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <RefreshCw size={20} className="animate-spin text-brand-500" />
                    )}
                    <button
                      onClick={() => setCapturedFrame(null)}
                      className="absolute inset-0 bg-black/85 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold text-red-500 transition-opacity"
                    >
                      Retake Photo
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Disclaimer Area */}
        <div className="px-6 py-2.5 bg-yellow-500/5 border-t border-b border-white/5 text-[10px] text-yellow-500/80 leading-relaxed font-medium">
          Legal Disclaimer: Sejda does not guarantee this signature is legally binding. Use at your own discretion.
        </div>

        {/* Footer */}
        <div className="px-5 py-4 shrink-0 bg-dark-950/40 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-dark-300 hover:text-white rounded-xl text-xs font-semibold transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold shadow-glow-sm flex items-center gap-1.5 transition-all"
          >
            <Check size={14} />
            <span>Apply Signature</span>
          </button>
        </div>
      </div>
    </div>
  );
}
