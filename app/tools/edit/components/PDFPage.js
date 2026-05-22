'use client';

import { useEffect, useRef, useState } from 'react';
import { useEditor } from '../context/EditorContext';
import { motion } from 'framer-motion';
import { Trash2, Copy, Move, Maximize2, Sparkles, Loader } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

// Fallback mapper for pdf-lib export buckets → readable CSS
function getCssFontFamily(family) {
  if (family === 'TimesRoman') return '"Times New Roman", Times, serif';
  if (family === 'Courier') return '"Courier New", Courier, monospace';
  if (family === 'Roboto') return '"Roboto", sans-serif';
  if (family === 'Open Sans') return '"Open Sans", sans-serif';
  if (family === 'Montserrat') return '"Montserrat", sans-serif';
  if (family === 'Lora') return '"Lora", serif';
  if (family === 'Merriweather') return '"Merriweather", serif';
  if (family === 'Inter') return '"Inter", sans-serif';
  if (family === 'Poppins') return '"Poppins", sans-serif';
  return 'Helvetica, Arial, sans-serif';
}

function hexToRgbObj(hex) {
  const cleanHex = (hex || '#000000').replace('#', '');
  const n = parseInt(cleanHex, 16) || 0;
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255
  };
}

// Full-histogram background/text color detector.
// Scans EVERY pixel in the bounding box, builds a frequency histogram with 32-step
// quantization, then picks:
//   bgColor  = most frequent bin  (background wins by pixel count since text is ~30-40% of area)
//   textColor = most contrasting bin among the top frequent candidates
// This is immune to "adjacent element bleed" since it only reads pixels inside the box.
function detectBgAndTextColor(ctx, canvasX, canvasY, canvasW, canvasH, maxW, maxH) {
  const startX = Math.max(0, Math.floor(canvasX));
  const startY = Math.max(0, Math.floor(canvasY));
  const w = Math.min(maxW - startX, Math.floor(canvasW));
  const h = Math.min(maxH - startY, Math.floor(canvasH));

  if (w <= 0 || h <= 0) return { bgColor: '#ffffff', color: '#000000', confident: false };

  try {
    const imgData = ctx.getImageData(startX, startY, w, h);
    const data = imgData.data;
    const STEP = 32; // 256 / 32 = 8 bins per channel → manageable histogram
    const bins = {};
    let totalPixels = 0;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        if (data[idx + 3] < 128) continue; // skip transparent
        const bR = Math.round(data[idx]     / STEP) * STEP;
        const bG = Math.round(data[idx + 1] / STEP) * STEP;
        const bB = Math.round(data[idx + 2] / STEP) * STEP;
        const key = `${bR},${bG},${bB}`;
        bins[key] = (bins[key] || 0) + 1;
        totalPixels++;
      }
    }

    if (totalPixels === 0) return { bgColor: '#ffffff', color: '#000000', confident: false };

    // Sort by frequency (descending)
    const sorted = Object.entries(bins)
      .sort((a, b) => b[1] - a[1]);

    // Most frequent color = background
    const [bgKey, bgCount] = sorted[0];
    const [bgR, bgG, bgB] = bgKey.split(',').map(Number);
    const bgLum = bgR * 0.299 + bgG * 0.587 + bgB * 0.114;
    const bgColorHex = rgbToHex(bgR, bgG, bgB);

    // Background must be reasonably dominant (> 25% of all pixels)
    // If not, this is a complex image region — fall back safely
    if (bgCount / totalPixels < 0.25) {
      return { bgColor: '#ffffff', color: '#000000', confident: false };
    }

    // Find the most contrasting frequent color = text color
    // Check top 15 candidates; stop when count drops below 3% of total
    let textColorHex = '#000000';
    let bestContrast = 0;
    const minCount = totalPixels * 0.03;

    for (let i = 1; i < Math.min(sorted.length, 15); i++) {
      const [key, count] = sorted[i];
      if (count < minCount) break;
      const [r, g, b] = key.split(',').map(Number);
      const lum = r * 0.299 + g * 0.587 + b * 0.114;
      const contrast = Math.abs(lum - bgLum);
      if (contrast > bestContrast) {
        bestContrast = contrast;
        textColorHex = rgbToHex(r, g, b);
      }
    }

    // Confidence: we need at least 40 luminance units of contrast
    const confident = bestContrast >= 40;
    if (!confident) {
      // Fall back: infer text from bg luminance
      textColorHex = bgLum < 128 ? '#ffffff' : '#000000';
    }

    // ── Underline detection: scan row near baseline ──
    let underline = false;
    if (w > 10 && h > 6) {
      const textRGB = hexToRgbObj(textColorHex);
      const bgRGBObj = hexToRgbObj(bgColorHex);
      const targetY = Math.floor(h - Math.max(2, h * 0.12));
      let matchCount = 0, sampleCount = 0;
      for (let x = 2; x < w - 2; x++) {
        const c = getPixelColor(data, x, targetY, w);
        const dText = Math.sqrt((c.r-textRGB.r)**2 + (c.g-textRGB.g)**2 + (c.b-textRGB.b)**2);
        const dBg   = Math.sqrt((c.r-bgRGBObj.r)**2 + (c.g-bgRGBObj.g)**2 + (c.b-bgRGBObj.b)**2);
        sampleCount++;
        if (dText < 65 && dBg > 40) matchCount++;
      }
      underline = sampleCount > 0 && (matchCount / sampleCount) > 0.40;
    }

    return { bgColor: bgColorHex, color: textColorHex, underline, confident };
  } catch (e) {
    console.error('Color detection failed:', e);
    return { bgColor: '#ffffff', color: '#000000', confident: false };
  }
}

function getPixelColor(data, x, y, width) {
  const idx = (y * width + x) * 4;
  return { r: data[idx], g: data[idx+1], b: data[idx+2], a: data[idx+3] };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = Math.min(255, Math.max(0, x)).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

// Validate detected colors: returns safe bgColor/textColor pair.
// If detected bg and text don't have enough contrast, fall back to white/black.
function validateColors(bgColor, textColor) {
  const bg = hexToRgbObj(bgColor);
  const tx = hexToRgbObj(textColor);
  const bgLum = bg.r * 0.299 + bg.g * 0.587 + bg.b * 0.114;
  const txLum = tx.r * 0.299 + tx.g * 0.587 + tx.b * 0.114;
  const contrast = Math.abs(bgLum - txLum);
  if (contrast < 40) {
    // Low contrast — detection failed, return safe pair
    return { bgColor: '#ffffff', color: '#000000', confident: false };
  }
  return { bgColor, color: textColor, confident: true };
}

export default function PDFPage({ pageNum, pdfjsDoc, onOCRRequest, onPageRendered }) {
  const toast = useToast();
  const {
    zoom,
    activeTool,
    setActiveTool,
    pagesData,
    updateAnnotation,
    commitAnnotationUpdate,
    updateTextItem,
    updateTextItemsColors,
    selectedElement,
    setSelectedElement,
    color,
    fontSize,
    fontFamily,
    bold,
    italic,
    strokeWidth,
    shapeType,
    addAnnotation
  } = useEditor();

  const pageData = pagesData.find(p => p.pageNum === pageNum);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const textLayerRef = useRef(null);
  
  const [rendered, setRendered] = useState(false);
  const [rendering, setRendering] = useState(false);
  
  // Local state for drawing
  const [isDrawingLocal, setIsDrawingLocal] = useState(false);
  const [currentPathPoints, setCurrentPathPoints] = useState(null);
  
  // Local state for shape dragging creation
  const [shapeStartPoint, setShapeStartPoint] = useState(null);
  const [currentShapePreview, setCurrentShapePreview] = useState(null);

  // Resize handler state
  const [isResizing, setIsResizing] = useState(false);

  // Intersection Observer for Lazy Loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !rendered && !rendering) {
            renderPage();
          }
        });
      },
      { rootMargin: '200px 0px', threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [pdfjsDoc, zoom, pageData?.rotation, rendered, rendering]);

  // Trigger re-render when zoom or rotation changes
  useEffect(() => {
    if (rendered) {
      renderPage();
    }
  }, [zoom, pageData?.rotation]);

  const detectPageColors = (canvas, dpiScale) => {
    if (!canvas || !pageData.originalTextItems || pageData.originalTextItems.length === 0) return;
    const ctx = canvas.getContext('2d');
    const canvasW = canvas.width;
    const canvasH = canvas.height;
    
    const colorUpdates = {};
    pageData.originalTextItems.forEach(item => {
      const canvasX = item.left * zoom * dpiScale;
      const canvasY = item.top * zoom * dpiScale;
      const canvasWidth = item.width * zoom * dpiScale;
      const canvasHeight = item.height * zoom * dpiScale;
      
      const colors = detectBgAndTextColor(ctx, canvasX, canvasY, canvasWidth, canvasHeight, canvasW, canvasH);
      
      // Validate the raw detection
      const validated = validateColors(colors.bgColor, colors.color);
      
      colorUpdates[item.id] = {
        bgColor: validated.bgColor,
        color: validated.color,
        underline: colors.underline,
        colorsDetected: true,
        confident: validated.confident
      };
    });
    
    updateTextItemsColors(pageNum, colorUpdates);
  };

  const renderPage = async () => {
    if (!pdfjsDoc || !pageData) return;
    setRendering(true);
    try {
      const page = await pdfjsDoc.getPage(pageNum);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rotation = pageData.rotation || 0;
      
      // Calculate high-DPI scaling. Force a minimum of 2.5x for crisp "premium" text rendering.
      const dpiScale = Math.max(window.devicePixelRatio || 1, 2.5);
      const viewport = page.getViewport({ scale: zoom, rotation });
      
      canvas.width = Math.floor(viewport.width * dpiScale);
      canvas.height = Math.floor(viewport.height * dpiScale);
      
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.scale(dpiScale, dpiScale);

      await page.render({
        canvasContext: ctx,
        viewport: viewport
      }).promise;

      setRendered(true);
      if (onPageRendered) {
        onPageRendered(pageNum, canvas.toDataURL('image/jpeg', 0.15));
      }

      // Automatically run background/foreground color detection
      const hasDetected = pageData.originalTextItems?.some(item => item.colorsDetected);
      if (!hasDetected && pageData.originalTextItems?.length > 0) {
        setTimeout(() => {
          detectPageColors(canvas, dpiScale);
        }, 50);
      }
    } catch (err) {
      console.error(`Error rendering page ${pageNum}:`, err);
    } finally {
      setRendering(false);
    }
  };

  if (!pageData) return null;

  const w = pageData.width * zoom;
  const h = pageData.height * zoom;
  
  // Rotate CSS
  const isRotated90or270 = pageData.rotation === 90 || pageData.rotation === 270;
  const containerWidth = isRotated90or270 ? h : w;
  const containerHeight = isRotated90or270 ? w : h;

  // Coordinate Conversion Helpers (Screen px ↔ PDF pts)
  const screenToPdfCoords = (clientX, clientY) => {
    const rect = containerRef.current.getBoundingClientRect();
    let screenX = clientX - rect.left;
    let screenY = clientY - rect.top;

    // Adjust if rotated
    const rotation = pageData.rotation || 0;
    if (rotation === 90) {
      const tmp = screenX;
      screenX = screenY;
      screenY = containerWidth - tmp;
    } else if (rotation === 180) {
      screenX = containerWidth - screenX;
      screenY = containerHeight - screenY;
    } else if (rotation === 270) {
      const tmp = screenX;
      screenX = containerHeight - screenY;
      screenY = tmp;
    }

    return {
      x: screenX / zoom,
      y: screenY / zoom
    };
  };

  // Pointer drawing events
  const handlePointerDown = (e) => {
    if (isResizing) return;
    
    const { x, y } = screenToPdfCoords(e.clientX, e.clientY);

    // 1. FREE HAND DRAW / HIGHLIGHT
    if (activeTool === 'draw' || activeTool === 'highlight') {
      setIsDrawingLocal(true);
      setCurrentPathPoints([{ x, y }]);
      return;
    }

    // 2. SHAPE CREATION
    if (activeTool === 'shape') {
      setShapeStartPoint({ x, y });
      setCurrentShapePreview({ type: 'shape', shapeType, x, y, width: 0, height: 0, points: [{ x, y }] });
      return;
    }

    // 3. WHITEOUT CREATION (Single click)
    if (activeTool === 'whiteout') {
      addAnnotation(pageNum, {
        type: 'whiteout',
        x: x - 50,
        y: y - 12,
        width: 100,
        height: 24,
        color: '#ffffff'
      });
      setActiveTool('select');
      return;
    }

    // 4. ADD TEXT (Single click)
    if (activeTool === 'add-text') {
      const newAnnId = addAnnotation(pageNum, {
        type: 'text',
        text: 'Type something...',
        x: x - 40,
        y: y - 10,
        width: 150,
        height: 24,
        fontSize,
        fontFamily,
        color,
        bold,
        italic,
        alignment: 'left'
      });
      // Defer focus click-to-edit
      setTimeout(() => {
        const editableSpan = document.getElementById(`editable-ann-span-${newAnnId}`);
        if (editableSpan) {
          editableSpan.focus();
          document.execCommand('selectAll', false, null);
        }
      }, 50);
      setActiveTool('select');
      return;
    }

    // Default select tool click outside to clear selection
    if (activeTool === 'select' && e.target === e.currentTarget) {
      setSelectedElement(null);
    }
  };

  const handlePointerMove = (e) => {
    if (!isDrawingLocal && !shapeStartPoint) return;
    const { x, y } = screenToPdfCoords(e.clientX, e.clientY);

    if (isDrawingLocal && currentPathPoints) {
      const lastPoint = currentPathPoints[currentPathPoints.length - 1];
      const dist = Math.hypot(lastPoint.x - x, lastPoint.y - y);
      if (dist > 1.5) {
        setCurrentPathPoints(prev => [...prev, { x, y }]);
      }
    }

    if (shapeStartPoint && currentShapePreview) {
      const dx = x - shapeStartPoint.x;
      const dy = y - shapeStartPoint.y;
      
      if (shapeType === 'line' || shapeType === 'arrow') {
        setCurrentShapePreview(prev => ({
          ...prev,
          points: [shapeStartPoint, { x, y }]
        }));
      } else {
        setCurrentShapePreview(prev => ({
          ...prev,
          x: dx < 0 ? x : shapeStartPoint.x,
          y: dy < 0 ? y : shapeStartPoint.y,
          width: Math.abs(dx),
          height: Math.abs(dy)
        }));
      }
    }
  };

  const handlePointerUp = () => {
    if (isDrawingLocal && currentPathPoints) {
      setIsDrawingLocal(false);
      if (currentPathPoints.length > 1) {
        addAnnotation(pageNum, {
          type: activeTool === 'highlight' ? 'highlight' : 'path',
          points: currentPathPoints,
          color: activeTool === 'highlight' ? '#eab308' : color, // default highlight is yellow
          strokeWidth: activeTool === 'highlight' ? 12 : strokeWidth,
        });
      }
      setCurrentPathPoints(null);
    }

    if (shapeStartPoint && currentShapePreview) {
      setShapeStartPoint(null);
      
      const width = currentShapePreview.width || 0;
      const height = currentShapePreview.height || 0;
      
      if (shapeType === 'line' || shapeType === 'arrow' || (width > 5 || height > 5)) {
        addAnnotation(pageNum, {
          type: 'shape',
          shapeType,
          x: currentShapePreview.x,
          y: currentShapePreview.y,
          width: currentShapePreview.width,
          height: currentShapePreview.height,
          points: currentShapePreview.points,
          color,
          strokeWidth,
        });
      }
      setCurrentShapePreview(null);
    }
  };

  // Convert SVG path coordinates
  const createSvgPath = (points) => {
    if (!points || points.length === 0) return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x * zoom} ${p.y * zoom}`).join(' ');
  };

  // Custom annotation drag ending
  const handleAnnotationDragEnd = (annId, e, info) => {
    const rect = containerRef.current.getBoundingClientRect();
    
    // Calculate new position relative to PDF page at scale 1.0 (points)
    const newX = (info.point.x - rect.left) / zoom;
    const newY = (info.point.y - rect.top) / zoom;
    
    commitAnnotationUpdate(pageNum, annId, { x: newX, y: newY });
  };

  // Custom annotation resize handler
  const handleAnnotationResize = (ann, e) => {
    e.stopPropagation();
    setIsResizing(true);
    
    const startWidth = ann.width;
    const startHeight = ann.height;
    const startX = ann.x;
    const startY = ann.y;
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;

    const handleMouseMove = (moveEvent) => {
      const dx = (moveEvent.clientX - startMouseX) / zoom;
      const dy = (moveEvent.clientY - startMouseY) / zoom;
      
      updateAnnotation(pageNum, ann.id, {
        width: Math.max(15, startWidth + dx),
        height: Math.max(10, startHeight + dy)
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      
      // Save sizing update to history
      const finalAnn = pagesData.find(p => p.pageNum === pageNum).annotations.find(a => a.id === ann.id);
      commitAnnotationUpdate(pageNum, ann.id, {
        width: finalAnn.width,
        height: finalAnn.height
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Check if page has original selectable text items
  const hasTextItems = pageData.originalTextItems && pageData.originalTextItems.length > 0;

  return (
    <div 
      id={`pdf-page-card-${pageNum}`}
      className="relative flex flex-col items-center select-none py-4"
    >
      <div 
        ref={containerRef}
        className="relative bg-white shadow-xl transition-all select-none border border-white/10"
        style={{
          width: `${containerWidth}px`,
          height: `${containerHeight}px`,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Main rendering canvas */}
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0 w-full h-full pointer-events-none block" 
        />

        {/* Loading overlay for background page renders */}
        {rendering && (
          <div className="absolute inset-0 bg-dark-950/20 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
            <div className="bg-dark-900/90 border border-white/10 rounded-2xl p-3 flex items-center gap-3 shadow-glow-sm">
              <Loader size={16} className="animate-spin text-brand-400" />
              <span className="text-xs font-semibold text-white">Rendering page {pageNum}...</span>
            </div>
          </div>
        )}

        {/* 1. ORIGINAL TEXT INLINE EDITING OVERLAY */}
        {rendered && pageData.originalTextItems && (
          <div 
            ref={textLayerRef}
            className="absolute inset-0 pointer-events-none z-10"
            style={{ transform: `rotate(${pageData.rotation || 0}deg)`, transformOrigin: 'center' }}
          >
          {pageData.originalTextItems.map((item) => {
              const isSelected = selectedElement?.type === 'text-item' && selectedElement?.id === item.id;
              const isEditingTextMode = activeTool === 'edit-text';
              const isHovered = isEditingTextMode; // All items get ready when in edit-text mode
              
              const left = item.left * zoom;
              const top = item.top * zoom;
              const width = item.width * zoom;
              const height = item.height * zoom;
              const fontSz = item.fontSize * zoom;

              // Determine background:
              // - Transparent when not in edit-text mode (PDF shows through cleanly)
              // - Opaque detected bgColor when selected OR when edited (masks old canvas text)
              // - Semi-transparent tint on hover within edit-text mode
              const resolvedBg = item.bgColor || '#ffffff';
              let overlayBg = 'transparent';
              if (item.edited) {
                overlayBg = resolvedBg; // fully opaque to hide original text
              } else if (isSelected) {
                overlayBg = resolvedBg; // opaque so old text is hidden while editing
              } else if (isEditingTextMode) {
                // Subtle tint so user knows it's clickable, but PDF still visible
                overlayBg = 'transparent';
              }

              return (
                <div
                  key={item.id}
                  style={{
                    position: 'absolute',
                    left: `${left}px`,
                    top: `${top}px`,
                    width: `${width + 4}px`,
                    height: `${height + 2}px`,
                    backgroundColor: overlayBg,
                    // Ensure the overlay is a proper stacking context so nothing bleeds through
                    isolation: (isSelected || item.edited) ? 'isolate' : 'auto',
                  }}
                  className={`pointer-events-auto ${
                    isEditingTextMode 
                      ? 'cursor-text hover:bg-brand-500/5 hover:outline hover:outline-1 hover:outline-dashed hover:outline-brand-400/50' 
                      : ''
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isEditingTextMode) return;
                    setSelectedElement({ pageNum, type: 'text-item', id: item.id });
                  }}
                >
                  <span
                    contentEditable={isEditingTextMode}
                    suppressContentEditableWarning={true}
                    onFocus={() => {
                      setSelectedElement({ pageNum, type: 'text-item', id: item.id });
                    }}
                    onBlur={(e) => {
                      const newTxt = e.target.innerText;
                      updateTextItem(pageNum, item.id, { newText: newTxt, edited: newTxt !== item.originalText });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        e.target.blur();
                      }
                    }}
                    id={`editable-text-span-${item.id}`}
                    style={{
                      fontSize: `${fontSz}px`,
                      // Use exact CSS font from PDF.js when available, with a robust fallback to mapped standard fonts
                      fontFamily: item.cssFontFamilyRaw
                        ? `${item.cssFontFamilyRaw}, ${getCssFontFamily(item.fontFamily || fontFamily)}`
                        : getCssFontFamily(item.fontFamily || fontFamily),
                      // Use numeric fontWeightValue for precise semibold (600), black (900) rendering
                      fontWeight: item.fontWeightValue || (item.bold ? 700 : 400),
                      fontStyle: item.italic ? 'italic' : 'normal',
                      textDecoration: item.underline ? 'underline' : 'none',
                      color: (item.edited || isSelected) ? (item.color || '#000000') : 'transparent',
                      outline: 'none',
                      caretColor: item.color || '#000000',
                      textAlign: item.alignment || 'left',
                      // Prevent sub-pixel bleed from canvas behind when selected
                      WebkitFontSmoothing: 'antialiased',
                      MozOsxFontSmoothing: 'grayscale',
                    }}
                    className={`absolute inset-0 whitespace-nowrap leading-none outline-none z-20 ${
                      isEditingTextMode ? 'pointer-events-auto' : 'pointer-events-none'
                    } ${
                      isSelected ? 'border border-dashed border-brand-500/80' : 'border border-transparent'
                    }`}
                    ref={(el) => {
                      if (el && isSelected && document.activeElement !== el) {
                        el.focus();
                      }
                    }}
                  >
                    {item.newText}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* 2. CUSTOM ADDED ANNOTATIONS OVERLAY */}
        {rendered && pageData.annotations && (
          <div className="absolute inset-0 pointer-events-none z-20">
            {pageData.annotations.map((ann) => {
              const isSelected = selectedElement?.type === 'annotation' && selectedElement?.id === ann.id;
              const isSelectMode = activeTool === 'select';

              const left = ann.x * zoom;
              const top = ann.y * zoom;
              const width = ann.width * zoom;
              const height = ann.height * zoom;

              // Text customization
              const textFontSz = (ann.fontSize || 14) * zoom;

              return (
                <motion.div
                  key={ann.id}
                  drag={isSelectMode && !isResizing}
                  dragMomentum={false}
                  dragElastic={0}
                  onDragEnd={(e, info) => handleAnnotationDragEnd(ann.id, e, info)}
                  style={{
                    position: 'absolute',
                    left: `${left}px`,
                    top: `${top}px`,
                    width: ann.type === 'text' ? 'auto' : `${width}px`,
                    height: ann.type === 'text' ? 'auto' : `${height}px`,
                  }}
                  className={`pointer-events-auto group ${
                    isSelectMode ? 'cursor-move' : ''
                  } ${
                    isSelected ? 'outline outline-2 outline-brand-500 shadow-glow-sm bg-brand-500/[0.01] z-30' : ''
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isSelectMode) return;
                    setSelectedElement({ pageNum, type: 'annotation', id: ann.id });
                  }}
                >
                  {/* Visual components based on annotation type */}
                  {ann.type === 'text' && (
                    <span
                      contentEditable={isSelectMode}
                      suppressContentEditableWarning={true}
                      id={`editable-ann-span-${ann.id}`}
                      onBlur={(e) => {
                        updateAnnotation(pageNum, ann.id, { text: e.target.innerText });
                        // Push history update
                        commitAnnotationUpdate(pageNum, ann.id, { text: e.target.innerText });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          e.target.blur();
                        }
                      }}
                      style={{
                        fontSize: `${textFontSz}px`,
fontFamily: getCssFontFamily(ann.fontFamily || fontFamily),
                        color: ann.color || color,
                        fontWeight: ann.bold ? 'bold' : 'normal',
                        fontStyle: ann.italic ? 'italic' : 'normal',
                        textAlign: ann.alignment || 'left',
                        minWidth: '60px',
                        display: 'block'
                      }}
                      className="outline-none px-1 whitespace-nowrap leading-none text-black select-text"
                    >
                      {ann.text}
                    </span>
                  )}

                  {ann.type === 'whiteout' && (
                    <div className="w-full h-full bg-white border border-gray-200/50 flex items-center justify-center">
                      {!isSelectMode && <div className="absolute inset-0 bg-white" />}
                      <span className="text-[9px] text-gray-300 font-bold opacity-30 select-none hidden group-hover:block">
                        WHITEOUT
                      </span>
                    </div>
                  )}

                  {ann.type === 'image' && ann.dataUrl && (
                    <img 
                      src={ann.dataUrl} 
                      alt="Insert" 
                      className="w-full h-full object-contain pointer-events-none select-none" 
                    />
                  )}

                  {ann.type === 'signature' && ann.dataUrl && (
                    <img 
                      src={ann.dataUrl} 
                      alt="Signature" 
                      className="w-full h-full object-contain pointer-events-none select-none" 
                    />
                  )}

                  {/* Resizing Handle (bottom-right) */}
                  {isSelected && ann.type !== 'text' && (
                    <button
                      onMouseDown={(e) => handleAnnotationResize(ann, e)}
                      className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-brand-500 hover:bg-brand-400 border border-white rounded-full flex items-center justify-center cursor-se-resize translate-x-1.5 translate-y-1.5 z-40 shadow-glow-sm"
                    >
                      <Maximize2 size={8} className="text-white transform rotate-90" />
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* 3. DRAWN SVG ANNOTATIONS LAYER (Paths & Shapes) */}
        {rendered && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-15">
            {/* Draw active annotation paths */}
            {pageData.annotations && pageData.annotations.map((ann) => {
              const isSelected = selectedElement?.type === 'annotation' && selectedElement?.id === ann.id;
              
              if (ann.type === 'path' || ann.type === 'highlight') {
                return (
                  <path
                    key={ann.id}
                    d={createSvgPath(ann.points)}
                    stroke={ann.color}
                    strokeWidth={ann.strokeWidth * zoom}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={ann.type === 'highlight' ? 0.45 : 1}
                    className={activeTool === 'select' ? 'pointer-events-auto cursor-pointer hover:stroke-brand-500' : ''}
                    onClick={(e) => {
                      if (activeTool !== 'select') return;
                      e.stopPropagation();
                      setSelectedElement({ pageNum, type: 'annotation', id: ann.id });
                    }}
                  />
                );
              }

              if (ann.type === 'shape') {
                const shapeColor = ann.color || '#000000';
                const thick = (ann.strokeWidth || 3) * zoom;
                
                if (ann.shapeType === 'rect') {
                  return (
                    <rect
                      key={ann.id}
                      x={ann.x * zoom}
                      y={ann.y * zoom}
                      width={ann.width * zoom}
                      height={ann.height * zoom}
                      stroke={shapeColor}
                      strokeWidth={thick}
                      fill="none"
                      className={activeTool === 'select' ? 'pointer-events-auto cursor-pointer hover:stroke-brand-500' : ''}
                      onClick={(e) => {
                        if (activeTool !== 'select') return;
                        e.stopPropagation();
                        setSelectedElement({ pageNum, type: 'annotation', id: ann.id });
                      }}
                    />
                  );
                }
                
                if (ann.shapeType === 'circle') {
                  const rx = (ann.width * zoom) / 2;
                  const ry = (ann.height * zoom) / 2;
                  const cx = (ann.x * zoom) + rx;
                  const cy = (ann.y * zoom) + ry;
                  return (
                    <ellipse
                      key={ann.id}
                      cx={cx}
                      cy={cy}
                      rx={rx}
                      ry={ry}
                      stroke={shapeColor}
                      strokeWidth={thick}
                      fill="none"
                      className={activeTool === 'select' ? 'pointer-events-auto cursor-pointer hover:stroke-brand-500' : ''}
                      onClick={(e) => {
                        if (activeTool !== 'select') return;
                        e.stopPropagation();
                        setSelectedElement({ pageNum, type: 'annotation', id: ann.id });
                      }}
                    />
                  );
                }

                if (ann.shapeType === 'line' && ann.points && ann.points.length >= 2) {
                  const p1 = ann.points[0];
                  const p2 = ann.points[1];
                  return (
                    <line
                      key={ann.id}
                      x1={p1.x * zoom}
                      y1={p1.y * zoom}
                      x2={p2.x * zoom}
                      y2={p2.y * zoom}
                      stroke={shapeColor}
                      strokeWidth={thick}
                      className={activeTool === 'select' ? 'pointer-events-auto cursor-pointer hover:stroke-brand-500' : ''}
                      onClick={(e) => {
                        if (activeTool !== 'select') return;
                        e.stopPropagation();
                        setSelectedElement({ pageNum, type: 'annotation', id: ann.id });
                      }}
                    />
                  );
                }

                if (ann.shapeType === 'arrow' && ann.points && ann.points.length >= 2) {
                  const p1 = ann.points[0];
                  const p2 = ann.points[1];
                  
                  // Arrow head calculation
                  const angle = Math.atan2((p2.y - p1.y) * zoom, (p2.x - p1.x) * zoom);
                  const arrowLength = 10 * zoom;
                  const headX1 = (p2.x * zoom) - arrowLength * Math.cos(angle - Math.PI / 6);
                  const headY1 = (p2.y * zoom) - arrowLength * Math.sin(angle - Math.PI / 6);
                  const headX2 = (p2.x * zoom) - arrowLength * Math.cos(angle + Math.PI / 6);
                  const headY2 = (p2.y * zoom) - arrowLength * Math.sin(angle + Math.PI / 6);

                  return (
                    <g key={ann.id} 
                      className={activeTool === 'select' ? 'pointer-events-auto cursor-pointer group' : ''}
                      onClick={(e) => {
                        if (activeTool !== 'select') return;
                        e.stopPropagation();
                        setSelectedElement({ pageNum, type: 'annotation', id: ann.id });
                      }}
                    >
                      <line
                        x1={p1.x * zoom}
                        y1={p1.y * zoom}
                        x2={p2.x * zoom}
                        y2={p2.y * zoom}
                        stroke={shapeColor}
                        strokeWidth={thick}
                      />
                      <path
                        d={`M ${p2.x * zoom} ${p2.y * zoom} L ${headX1} ${headY1} M ${p2.x * zoom} ${p2.y * zoom} L ${headX2} ${headY2}`}
                        stroke={shapeColor}
                        strokeWidth={thick}
                        fill="none"
                        strokeLinecap="round"
                      />
                    </g>
                  );
                }
              }
              return null;
            })}

            {/* Pointer draw path preview */}
            {isDrawingLocal && currentPathPoints && (
              <path
                d={createSvgPath(currentPathPoints)}
                stroke={activeTool === 'highlight' ? '#eab308' : color}
                strokeWidth={(activeTool === 'highlight' ? 12 : strokeWidth) * zoom}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={activeTool === 'highlight' ? 0.45 : 1}
              />
            )}

            {/* Shape builder outline preview */}
            {shapeStartPoint && currentShapePreview && (
              <>
                {shapeType === 'rect' && (
                  <rect
                    x={currentShapePreview.x * zoom}
                    y={currentShapePreview.y * zoom}
                    width={currentShapePreview.width * zoom}
                    height={currentShapePreview.height * zoom}
                    stroke={color}
                    strokeWidth={strokeWidth * zoom}
                    fill="none"
                    strokeDasharray="4 4"
                  />
                )}
                {shapeType === 'circle' && (
                  <ellipse
                    cx={(currentShapePreview.x * zoom) + (currentShapePreview.width * zoom) / 2}
                    cy={(currentShapePreview.y * zoom) + (currentShapePreview.height * zoom) / 2}
                    rx={(currentShapePreview.width * zoom) / 2}
                    ry={(currentShapePreview.height * zoom) / 2}
                    stroke={color}
                    strokeWidth={strokeWidth * zoom}
                    fill="none"
                    strokeDasharray="4 4"
                  />
                )}
                {(shapeType === 'line' || shapeType === 'arrow') && currentShapePreview.points && currentShapePreview.points.length >= 2 && (
                  <line
                    x1={currentShapePreview.points[0].x * zoom}
                    y1={currentShapePreview.points[0].y * zoom}
                    x2={currentShapePreview.points[1].x * zoom}
                    y2={currentShapePreview.points[1].y * zoom}
                    stroke={color}
                    strokeWidth={strokeWidth * zoom}
                    strokeDasharray="4 4"
                  />
                )}
              </>
            )}
          </svg>
        )}

        {/* 4. SCAN / NO-TEXT DETECTOR BANNER (ONLY IF TEXT-EDIT MODE ACTIVE AND NO TEXT ON PAGE) */}
        {rendered && activeTool === 'edit-text' && !hasTextItems && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-dark-900/95 border border-white/10 p-3 rounded-2xl flex items-center gap-3 shadow-glow z-30 w-[80%] max-w-sm pointer-events-auto">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center shrink-0">
              <Sparkles size={16} className="text-brand-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="text-[11px] font-bold text-white leading-tight">No editable text found</h5>
              <p className="text-[9px] text-dark-500 mt-0.5 leading-normal">This page might be scanned. Run OCR to unlock edits.</p>
            </div>
            <button
              onClick={() => onOCRRequest(pageNum)}
              className="px-2.5 py-1 text-[9px] font-bold rounded-lg bg-brand-500 text-white hover:bg-brand-400 shadow-glow-sm shrink-0"
            >
              Run OCR
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
