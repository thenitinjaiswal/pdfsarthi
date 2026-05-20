'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { PenLine, Download, Loader, Type, Trash2, ChevronLeft, ChevronRight, Pen, Eraser } from 'lucide-react';
import ToolHeader from '@/components/tools/ToolHeader';
import UploadZone from '@/components/tools/UploadZone';
import { useToast } from '@/hooks/useToast';
import { formatSize, downloadBlob } from '@/lib/utils';
import { renderPageThumbnail } from '@/lib/pdf-service';

export default function EditPDFPage() {
  const [file, setFile] = useState(null);
  const [pdfMeta, setPdfMeta] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageImage, setPageImage] = useState(null);
  
  const [annotations, setAnnotations] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  const containerRef = useRef(null);
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('text'); // 'text', 'eraser', 'draw'

  // Toolbar state
  const [textVal, setTextVal] = useState('New Text');
  const [color, setColor] = useState('#6366f1');
  const [fontSize, setFontSize] = useState(16);

  // Eraser state
  const [eraserWidth, setEraserWidth] = useState(100);
  const [eraserHeight, setEraserHeight] = useState(24);

  // Draw state
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState(null);

  const handleFile = async ([f]) => {
    setFile(f);
    setLoading(true);
    setAnnotations([]);
    setCurrentPage(1);
    
    try {
      const { PDFDocument } = await import('pdf-lib');
      const { readFileAsArrayBuffer } = await import('@/lib/pdf-service');
      
      const buf = await readFileAsArrayBuffer(f);
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const pages = doc.getPages();
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();
      
      setPdfMeta({
        arrayBuffer: buf,
        width,
        height,
        pageCount: doc.getPageCount(),
      });

      await loadPageImage(f, 1);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load PDF.');
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  const loadPageImage = async (f, pageNum) => {
    setLoading(true);
    try {
      const thumb = await renderPageThumbnail(f, pageNum, 1.5);
      setPageImage(thumb);
    } catch (err) {
      console.error(err);
      toast.error('Failed to render page preview.');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = async (newPage) => {
    if (newPage < 1 || newPage > pdfMeta.pageCount) return;
    setCurrentPage(newPage);
    await loadPageImage(file, newPage);
  };

  const addTextAnnotation = () => {
    if (!textVal.trim()) return;
    const newAnn = {
      id: Math.random().toString(36).substring(2, 9),
      type: 'text',
      text: textVal,
      x: 50,
      y: 50,
      color,
      fontSize,
      pageNum: currentPage
    };
    setAnnotations([...annotations, newAnn]);
    toast.success('Text added. Drag to position.');
  };

  const addEraserAnnotation = () => {
    const newAnn = {
      id: Math.random().toString(36).substring(2, 9),
      type: 'eraser',
      x: 50,
      y: 50,
      width: eraserWidth,
      height: eraserHeight,
      pageNum: currentPage
    };
    setAnnotations([...annotations, newAnn]);
    toast.success('Eraser added. Drag over existing text to hide it.');
  };

  const updateAnnotationPosition = (id, newX, newY) => {
    setAnnotations(prev => prev.map(ann => 
      ann.id === id ? { ...ann, x: newX, y: newY } : ann
    ));
  };

  const removeAnnotation = (id) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
  };

  // SVG Drawing Handlers
  const handlePointerDown = (e) => {
    if (activeTab !== 'draw') return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDrawing(true);
    setCurrentPath({
      id: Math.random().toString(36).substring(2, 9),
      type: 'path',
      color,
      strokeWidth,
      pageNum: currentPage,
      points: [{ x, y }]
    });
  };

  const handlePointerMove = (e) => {
    if (!isDrawing || activeTab !== 'draw' || !currentPath) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const lastPoint = currentPath.points[currentPath.points.length - 1];
    const dist = Math.hypot(lastPoint.x - x, lastPoint.y - y);
    if (dist > 2) {
      setCurrentPath(prev => ({
        ...prev,
        points: [...prev.points, { x, y }]
      }));
    }
  };

  const handlePointerUp = () => {
    if (!isDrawing || !currentPath) return;
    setIsDrawing(false);
    if (currentPath.points.length > 2) {
      setAnnotations(prev => [...prev, currentPath]);
    }
    setCurrentPath(null);
  };

  const createSvgPathData = (points) => {
    if (!points || points.length === 0) return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  };

  const handleExport = async () => {
    if (!file || !pdfMeta) return;
    setExporting(true);
    try {
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
      const doc = await PDFDocument.load(pdfMeta.arrayBuffer, { ignoreEncryption: true });
      const font = await doc.embedFont(StandardFonts.Helvetica);

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) throw new Error('Canvas not found');

      const scaleX = pdfMeta.width / rect.width;
      const scaleY = pdfMeta.height / rect.height;

      const pages = doc.getPages();

      for (const ann of annotations) {
        const page = pages[ann.pageNum - 1];
        const [r, g, b] = hexToRgb(ann.color || '#000000');
        
        if (ann.type === 'text') {
          const pdfX = ann.x * scaleX;
          const pdfY = pdfMeta.height - (ann.y * scaleY) - (ann.fontSize * scaleY);
          const nativeFontSize = ann.fontSize * scaleY;
          page.drawText(ann.text, { x: pdfX, y: pdfY, size: nativeFontSize, font, color: rgb(r, g, b) });
        } else if (ann.type === 'eraser') {
          const pdfX = ann.x * scaleX;
          const pdfY = pdfMeta.height - (ann.y * scaleY) - (ann.height * scaleY);
          const pdfWidth = ann.width * scaleX;
          const pdfHeight = ann.height * scaleY;
          page.drawRectangle({ x: pdfX, y: pdfY, width: pdfWidth, height: pdfHeight, color: rgb(1, 1, 1) });
        } else if (ann.type === 'path') {
          for (let i = 0; i < ann.points.length - 1; i++) {
            const p1 = ann.points[i];
            const p2 = ann.points[i + 1];
            page.drawLine({
              start: { x: p1.x * scaleX, y: pdfMeta.height - (p1.y * scaleY) },
              end: { x: p2.x * scaleX, y: pdfMeta.height - (p2.y * scaleY) },
              thickness: ann.strokeWidth * scaleY,
              color: rgb(r, g, b),
            });
          }
        }
      }

      const bytes = await doc.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      downloadBlob(blob, `edited-${file.name}`);
      toast.success('PDF saved successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export PDF.');
    } finally {
      setExporting(false);
    }
  };

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  }

  const currentPageAnnotations = annotations.filter(a => a.pageNum === currentPage);

  return (
    <div>
      <ToolHeader icon={PenLine} title="Visual PDF Editor"
        description="Add text, erase content, or draw directly on your PDF." />

      {!file ? (
        <div className="max-w-2xl mx-auto">
          <UploadZone onFiles={handleFile} accept=".pdf" />
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-80 space-y-4 shrink-0">
            <div className="glass rounded-2xl p-5">
              <p className="text-sm font-medium text-dark-200 truncate mb-1">{file.name}</p>
              <p className="text-xs text-dark-500 mb-4">{pdfMeta?.pageCount} pages • {formatSize(file.size)}</p>
              <button onClick={() => setFile(null)} className="text-xs text-dark-500 hover:text-red-400 transition-colors">
                × Close Editor
              </button>
            </div>

            <div className="glass rounded-2xl p-5 space-y-4">
              <div className="flex border-b border-white/10 mb-4">
                <button onClick={() => setActiveTab('text')}
                  className={`flex-1 pb-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${activeTab === 'text' ? 'text-brand-400 border-b-2 border-brand-400' : 'text-dark-500 hover:text-dark-300'}`}>
                  Text
                </button>
                <button onClick={() => setActiveTab('eraser')}
                  className={`flex-1 pb-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${activeTab === 'eraser' ? 'text-brand-400 border-b-2 border-brand-400' : 'text-dark-500 hover:text-dark-300'}`}>
                  Whiteout
                </button>
                <button onClick={() => setActiveTab('draw')}
                  className={`flex-1 pb-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${activeTab === 'draw' ? 'text-brand-400 border-b-2 border-brand-400' : 'text-dark-500 hover:text-dark-300'}`}>
                  Draw
                </button>
              </div>

              {activeTab === 'text' && (
                <>
                  <div>
                    <label className="text-xs text-dark-400 mb-1.5 block">Text content</label>
                    <textarea value={textVal} onChange={e => setTextVal(e.target.value)}
                      placeholder="Enter text..." rows={2} className="input-dark resize-none w-full text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-dark-400 mb-1.5 block">Size: {fontSize}px</label>
                      <input type="range" min={10} max={72} value={fontSize} onChange={e => setFontSize(parseInt(e.target.value))} className="w-full accent-brand-500" />
                    </div>
                    <div>
                      <label className="text-xs text-dark-400 mb-1.5 block">Color</label>
                      <div className="flex gap-1.5 flex-wrap">
                        {['#6366f1','#f97316','#10b981','#ef4444','#000000','#ffffff'].map(c => (
                          <button key={c} onClick={() => setColor(c)} className={`w-5 h-5 rounded-full border transition-all ${color === c ? 'border-white scale-125' : 'border-dark-700'}`} style={{ background: c }} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <button onClick={addTextAnnotation} className="btn-secondary w-full justify-center">Add Text to Canvas</button>
                </>
              )}

              {activeTab === 'eraser' && (
                <>
                  <p className="text-xs text-dark-400 mb-4">Hide existing text by placing a white box over it.</p>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-xs text-dark-400 mb-1.5 block">Width: {eraserWidth}px</label>
                      <input type="range" min={20} max={400} value={eraserWidth} onChange={e => setEraserWidth(parseInt(e.target.value))} className="w-full accent-brand-500" />
                    </div>
                    <div>
                      <label className="text-xs text-dark-400 mb-1.5 block">Height: {eraserHeight}px</label>
                      <input type="range" min={10} max={200} value={eraserHeight} onChange={e => setEraserHeight(parseInt(e.target.value))} className="w-full accent-brand-500" />
                    </div>
                  </div>
                  <button onClick={addEraserAnnotation} className="btn-secondary w-full justify-center text-red-400 hover:bg-red-400/10 border-red-400/20">Add Eraser Box</button>
                </>
              )}

              {activeTab === 'draw' && (
                <>
                  <p className="text-xs text-dark-400 mb-4">Draw directly on the PDF preview using your mouse.</p>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-xs text-dark-400 mb-1.5 block">Thickness: {strokeWidth}px</label>
                      <input type="range" min={1} max={10} value={strokeWidth} onChange={e => setStrokeWidth(parseInt(e.target.value))} className="w-full accent-brand-500" />
                    </div>
                    <div>
                      <label className="text-xs text-dark-400 mb-1.5 block">Pen Color</label>
                      <div className="flex gap-1.5 flex-wrap">
                        {['#6366f1','#f97316','#10b981','#ef4444','#000000','#ffffff'].map(c => (
                          <button key={c} onClick={() => setColor(c)} className={`w-5 h-5 rounded-full border transition-all ${color === c ? 'border-white scale-125' : 'border-dark-700'}`} style={{ background: c }} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-brand-400 bg-brand-500/10 border border-brand-500/20 p-3 rounded-xl text-center">
                    Canvas is ready! Click and drag on the PDF to start drawing.
                  </div>
                </>
              )}
            </div>

            {annotations.length > 0 && (
              <div className="glass rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-dark-400 uppercase tracking-widest">Layers</p>
                  <span className="text-[10px] bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded-full font-bold">{annotations.length}</span>
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto custom-scroll pr-1">
                  {annotations.map(a => (
                    <div key={a.id} className="flex items-center justify-between bg-dark-900/50 p-2 rounded-lg text-xs">
                      <div className="flex items-center gap-2 truncate">
                        {a.type === 'text' && <Type size={12} className="text-brand-400 shrink-0" />}
                        {a.type === 'eraser' && <div className="w-3 h-3 bg-white rounded-sm shrink-0 border border-dark-600" />}
                        {a.type === 'path' && <Pen size={12} className="text-brand-400 shrink-0" />}
                        
                        <span className="text-dark-300 truncate max-w-[120px]">
                          {a.type === 'text' && `"${a.text}"`}
                          {a.type === 'eraser' && `Eraser (${a.width}x${a.height})`}
                          {a.type === 'path' && `Drawing`}
                        </span>
                        <span className="text-[10px] text-dark-500 shrink-0">Pg {a.pageNum}</span>
                      </div>
                      <button onClick={() => removeAnnotation(a.id)} className="text-dark-600 hover:text-red-400 p-1">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button onClick={handleExport} disabled={exporting || loading} className="btn-action w-full justify-center h-12">
              {exporting ? <><Loader size={18} className="animate-spin" /> Saving PDF...</> : <><Download size={18} /> Export PDF</>}
            </button>
          </div>

          <div className="flex-1 flex flex-col glass rounded-2xl p-4 lg:p-6 min-h-[600px]">
            <div className="flex items-center justify-between mb-4 bg-dark-900/50 p-2 rounded-xl border border-white/5">
              <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1 || loading} className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-30 transition-colors">
                <ChevronLeft size={18} className="text-white" />
              </button>
              <span className="text-sm font-medium text-dark-300">Page {currentPage} of {pdfMeta?.pageCount || 1}</span>
              <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === pdfMeta?.pageCount || loading} className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-30 transition-colors">
                <ChevronRight size={18} className="text-white" />
              </button>
            </div>

            <div className="flex-1 bg-dark-950 rounded-xl overflow-hidden relative flex items-center justify-center p-4">
              {loading && !pageImage ? (
                <div className="flex flex-col items-center justify-center text-brand-400">
                  <Loader size={24} className="animate-spin mb-2" />
                  <p className="text-xs">Rendering canvas...</p>
                </div>
              ) : (
                pageImage && (
                  <div 
                    ref={containerRef}
                    className="relative bg-white shadow-2xl transition-all"
                    style={{ aspectRatio: `${pdfMeta?.width} / ${pdfMeta?.height}`, maxHeight: '100%', maxWidth: '100%' }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                  >
                    <img src={pageImage} alt={`Page ${currentPage}`} className="w-full h-full object-contain pointer-events-none" />

                    <div className={`absolute inset-0 overflow-hidden ${activeTab === 'draw' ? 'cursor-crosshair' : 'pointer-events-none'}`}>
                      {/* Render Draggable Annotations */}
                      {currentPageAnnotations.map((ann) => {
                        if (ann.type === 'text') {
                          return (
                            <motion.div
                              key={ann.id}
                              drag={activeTab !== 'draw'}
                              dragMomentum={false}
                              onDragEnd={(e, info) => {
                                const parentRect = containerRef.current.getBoundingClientRect();
                                const domX = info.point.x - parentRect.left;
                                const domY = info.point.y - parentRect.top;
                                updateAnnotationPosition(ann.id, domX, domY);
                              }}
                              initial={{ x: ann.x, y: ann.y }}
                              style={{ color: ann.color, fontSize: `${ann.fontSize}px`, textShadow: ann.color === '#ffffff' ? '0 1px 3px rgba(0,0,0,0.5)' : 'none' }}
                              className={`absolute top-0 left-0 whitespace-nowrap leading-none ${activeTab !== 'draw' ? 'cursor-move group pointer-events-auto' : 'pointer-events-none'}`}
                            >
                              {ann.text}
                              <div className="absolute inset-0 border border-brand-500 opacity-0 group-hover:opacity-100 -m-1 pointer-events-none" />
                            </motion.div>
                          );
                        } else if (ann.type === 'eraser') {
                          return (
                            <motion.div
                              key={ann.id}
                              drag={activeTab !== 'draw'}
                              dragMomentum={false}
                              onDragEnd={(e, info) => {
                                const parentRect = containerRef.current.getBoundingClientRect();
                                const domX = info.point.x - parentRect.left;
                                const domY = info.point.y - parentRect.top;
                                updateAnnotationPosition(ann.id, domX, domY);
                              }}
                              initial={{ x: ann.x, y: ann.y }}
                              style={{ width: ann.width, height: ann.height }}
                              className={`absolute top-0 left-0 bg-white shadow-sm border ${activeTab !== 'draw' ? 'cursor-move group border-dark-200/20 hover:border-red-400 pointer-events-auto' : 'pointer-events-none border-transparent'}`}
                            >
                              <div className="absolute inset-0 bg-red-400/5 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <p className="text-[10px] text-red-500 font-bold tracking-widest opacity-50">ERASER</p>
                              </div>
                            </motion.div>
                          );
                        }
                        return null;
                      })}

                      {/* Render Drawn SVG Paths */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        {currentPageAnnotations.map((ann) => {
                          if (ann.type === 'path') {
                            return (
                              <path
                                key={ann.id}
                                d={createSvgPathData(ann.points)}
                                stroke={ann.color}
                                strokeWidth={ann.strokeWidth}
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            );
                          }
                          return null;
                        })}
                        {isDrawing && currentPath && (
                          <path
                            d={createSvgPathData(currentPath.points)}
                            stroke={currentPath.color}
                            strokeWidth={currentPath.strokeWidth}
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}
                      </svg>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
