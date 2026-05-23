'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useEditor } from '../context/EditorContext';
import { motion } from 'framer-motion';
import { Maximize2, Sparkles, Loader } from 'lucide-react';
import { buildHighlightHtml } from './FindReplacePanel';

// ─────────────────────────────────────────────────────────────────────────────
// FONT UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

const FONT_MAP = {
  TimesRoman:    '"Times New Roman", Times, serif',
  Courier:       '"Courier New", Courier, monospace',
  Roboto:        '"Roboto", sans-serif',
  'Open Sans':   '"Open Sans", sans-serif',
  Montserrat:    '"Montserrat", sans-serif',
  Lora:          '"Lora", serif',
  Merriweather:  '"Merriweather", serif',
  Inter:         '"Inter", sans-serif',
  Poppins:       '"Poppins", sans-serif',
  Helvetica:     '"Helvetica Neue", Helvetica, Arial, sans-serif',
};

function getCssFontFamily(family) {
  return FONT_MAP[family] ?? 'Helvetica, Arial, sans-serif';
}

function EditableSpan({
  value,
  onChange,
  onBlur,
  onKeyDown,
  onFocus,
  onMouseDown,
  contentEditable,
  className,
  style,
  id,
  suppressContentEditableWarning,
  tabIndex,
  highlightedContent,
}) {
  const ref = useRef(null);
  // null sentinel = "never written yet". Using the initial value would cause the
  // layout effect to skip the very first DOM write, leaving the span empty.
  const lastTypedRef = useRef(null);
  // Track contentEditable so we force a DOM write when switching into edit mode.
  // When React switches from rendering children (non-editable) to no-children
  // (editable), it clears innerText — we must restore it.
  const prevContentEditableRef = useRef(contentEditable);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const modeChanged = prevContentEditableRef.current !== contentEditable;
    prevContentEditableRef.current = contentEditable;

    // Write to DOM if:
    //  a) First mount (lastTypedRef is null)
    //  b) contentEditable just switched to true (React cleared children)
    //  c) value changed externally (undo/redo, find-replace) — not typed by user
    if (!modeChanged && lastTypedRef.current !== null && value === lastTypedRef.current) return;

    lastTypedRef.current = value;
    const el = ref.current;

    // Preserve cursor position when element is focused (external value change)
    if (document.activeElement === el) {
      const sel = window.getSelection();
      const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
      el.innerText = value || '';
      if (range) {
        try {
          const newRange = document.createRange();
          const node = el.firstChild || el;
          const offset = Math.min(range.startOffset, (node.textContent || '').length);
          newRange.setStart(node, offset);
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);
        } catch {}
      }
    } else {
      el.innerText = value || '';
    }
  }, [value, contentEditable]);

  const handleInput = (e) => {
    const newValue = e.currentTarget.innerText;
    lastTypedRef.current = newValue; // mark as user-typed so layout effect skips it
    onChange(newValue);
  };

  if (!contentEditable) {
    // highlightedContent is an HTML string (e.g. from find-replace <mark> tags)
    if (highlightedContent) {
      return (
        <span
          ref={ref}
          id={id}
          contentEditable={false}
          suppressContentEditableWarning={suppressContentEditableWarning}
          onFocus={onFocus}
          onMouseDown={onMouseDown}
          className={className}
          style={style}
          tabIndex={tabIndex}
          dangerouslySetInnerHTML={{ __html: highlightedContent }}
        />
      );
    }
    return (
      <span
        ref={ref}
        id={id}
        contentEditable={false}
        suppressContentEditableWarning={suppressContentEditableWarning}
        onFocus={onFocus}
        onMouseDown={onMouseDown}
        className={className}
        style={style}
        tabIndex={tabIndex}
      >
        {value}
      </span>
    );
  }

  return (
    <span
      ref={ref}
      id={id}
      contentEditable={true}
      suppressContentEditableWarning={suppressContentEditableWarning}
      onInput={handleInput}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onMouseDown={onMouseDown}
      className={className}
      style={style}
      tabIndex={tabIndex}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CANVAS TEXT MASKING HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function eraseTextItemOnCanvas(canvas, item, zoom, dpiScale) {
  if (!canvas || !item) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Use lineHeight as height fallback — item.height can be 0 in many PDFs
  const itemH = item.lineHeight || item.height || item.fontSize || 14;

  const x = Math.round(item.left * zoom * dpiScale) - 2;
  const y = Math.round(item.top  * zoom * dpiScale) - 2;
  const w = Math.max(4, Math.round(item.width * zoom * dpiScale) + 4);
  const h = Math.max(4, Math.round(itemH       * zoom * dpiScale) + 4);

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = item.bgColor || '#ffffff';
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function eraseTextItemsOnCanvas(canvas, items, zoom, dpiScale) {
  if (!canvas || !items?.length) return;
  for (const item of items) {
    eraseTextItemOnCanvas(canvas, item, zoom, dpiScale);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL RENDER QUEUE  (per PDF document, indestructible chain)
//
// KEY FIX: The catch handler NEVER rethrows. Every error is swallowed so the
// chain stored in the WeakMap stays alive for all subsequent pages.
// We store `next` directly (not next.catch()) so there is only one promise
// per slot — no dangling recovered chain that future tasks queue off of.
// ─────────────────────────────────────────────────────────────────────────────

const pdfRenderQueues = new WeakMap();

function enqueueForDoc(pdfjsDoc, task) {
  if (!pdfjsDoc || typeof task !== 'function') return Promise.resolve();
  const prev = pdfRenderQueues.get(pdfjsDoc) ?? Promise.resolve();
  const next = prev.then(
    () => task(),
    () => task()   // even if prev rejected somehow, still run next task
  ).then(
    () => {},      // normalise to void
    (err) => {     // task itself threw — swallow, never propagate
      if (err?.name !== 'RenderingCancelledException' && !String(err).includes('Cancelled')) {
        console.warn('[PDFPage] render task error (swallowed to keep queue alive):', err);
      }
    }
  );
  pdfRenderQueues.set(pdfjsDoc, next);
  return next;
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG PATH  (quadratic Bézier smoothing)
// ─────────────────────────────────────────────────────────────────────────────

function buildSvgPath(points, zoom) {
  if (!points?.length) return '';
  if (points.length === 1) return `M ${points[0].x * zoom} ${points[0].y * zoom}`;
  let d = `M ${points[0].x * zoom} ${points[0].y * zoom}`;
  for (let i = 1; i < points.length - 1; i++) {
    const mx = ((points[i].x + points[i + 1].x) / 2) * zoom;
    const my = ((points[i].y + points[i + 1].y) / 2) * zoom;
    d += ` Q ${points[i].x * zoom} ${points[i].y * zoom} ${mx} ${my}`;
  }
  const l = points[points.length - 1];
  return d + ` L ${l.x * zoom} ${l.y * zoom}`;
}

function detectColorsFromCanvas(canvas, items, zoom, dpiScale) {
  if (!canvas) return {};
  const ctx = canvas.getContext('2d');
  if (!ctx) return {};

  const colorUpdates = {};

  const rgbToHex = (r, g, b) => {
    const clamp = (val) => Math.max(0, Math.min(255, val));
    return '#' + [clamp(r), clamp(g), clamp(b)].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  };

  items.forEach(item => {
    try {
      // Use lineHeight as fallback — item.height can be 0 in many PDFs
      const itemH = item.lineHeight || item.height || item.fontSize || 14;

      // Calculate coordinates in scale of physical canvas pixels
      const x = Math.floor(item.left * zoom * dpiScale);
      const y = Math.floor(item.top  * zoom * dpiScale);
      const w = Math.floor(item.width * zoom * dpiScale);
      const h = Math.floor(itemH      * zoom * dpiScale);

      if (w <= 0 || h <= 0) return;

      // Clip bounds to canvas physical dimensions
      const safeX = Math.max(0, Math.min(x, canvas.width - 1));
      const safeY = Math.max(0, Math.min(y, canvas.height - 1));
      const safeW = Math.max(1, Math.min(w, canvas.width - safeX));
      const safeH = Math.max(1, Math.min(h, canvas.height - safeY));

      const imgData = ctx.getImageData(safeX, safeY, safeW, safeH);
      const data = imgData.data;

      // Count color frequencies with small binning to group similar shades
      const counts = {};
      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];
        if (alpha < 10) {
          r = 255;
          g = 255;
          b = 255;
        }
        const binnedR = Math.round(r / 12) * 12;
        const binnedG = Math.round(g / 12) * 12;
        const binnedB = Math.round(b / 12) * 12;
        const key = `${binnedR},${binnedG},${binnedB}`;
        counts[key] = (counts[key] || 0) + 1;
      }

      // Sort colors by frequency
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      if (sorted.length === 0) return;

      // Most frequent color is the background color
      const [bgR, bgG, bgB] = sorted[0][0].split(',').map(Number);
      const bgColorHex = rgbToHex(bgR, bgG, bgB);

      // Find the text color: the most frequent color that has sufficient contrast/difference from the background
      let textColorHex = '#000000'; // fallback
      let maxContrast = 0;
      
      for (let j = 1; j < Math.min(sorted.length, 12); j++) {
        const [r, g, b] = sorted[j][0].split(',').map(Number);
        const diff = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);
        if (diff > 60 && sorted[j][1] > maxContrast) {
          maxContrast = sorted[j][1];
          textColorHex = rgbToHex(r, g, b);
        }
      }

      const isWhiteBg = bgR > 235 && bgG > 235 && bgB > 235;
      
      colorUpdates[item.id] = {
        bgColor: isWhiteBg ? '#ffffff' : bgColorHex,
        color: textColorHex,
        confident: true
      };
    } catch (err) {
      console.error('Error detecting colors for item', item.id, err);
    }
  });

  return colorUpdates;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function PDFPage({ pageNum, pdfjsDoc, onOCRRequest, onPageRendered, openSignatureModal }) {
  const {
    zoom,
    activeTool,
    setActiveTool,
    formSubMode,
    pagesData,
    updateAnnotation,
    commitAnnotationUpdate,
    updateTextItem,
    selectedElement,
    setSelectedElement,
    color,
    fontSize,
    fontFamily,
    bold,
    italic,
    strokeWidth,
    shapeType,
    addAnnotation,
    findQuery,
    matchCase,
    updateTextItemsColors,
  } = useEditor();

  const pageData = pagesData.find(p => p.pageNum === pageNum);

  // ── Stable refs (never cause stale-closure bugs) ────────────────────────
  const pageDataRef            = useRef(pageData);
  const selectedElementRef      = useRef(selectedElement);
  const activeToolRef           = useRef(activeTool);
  const onPageRenderedRef       = useRef(onPageRendered);
  const enqueueRenderRef        = useRef(null);
  const canvasRef               = useRef(null);
  const containerRef            = useRef(null);
  const textLayerRef            = useRef(null);
  const renderTaskRef           = useRef(null);
  const prevPdfjsDocRef         = useRef(null);
  const colorsDetectedRef       = useRef(false);

  // Render state machine refs (avoids stale closures in async callbacks)
  const renderRequestIdRef      = useRef(0);
  const renderQueuedRef         = useRef(false);
  const renderInProgressRef     = useRef(false);
  const renderNeedsRerenderRef  = useRef(false);

  const [rendered,  setRendered]  = useState(false);
  const [rendering, setRendering] = useState(false);

  // Keep refs in sync
  useEffect(() => { pageDataRef.current = pageData; }, [pageData]);
  useEffect(() => { selectedElementRef.current = selectedElement; }, [selectedElement]);
  useEffect(() => { activeToolRef.current = activeTool; }, [activeTool]);
  useEffect(() => { onPageRenderedRef.current = onPageRendered; }, [onPageRendered]);

  useEffect(() => {
    if (!rendered || !canvasRef.current || !pageData?.originalTextItems?.length) return;
    const itemsToMask = pageData.originalTextItems.filter(item =>
      item.edited ||
      (activeTool === 'edit-text' && selectedElement?.type === 'text-item' && selectedElement?.pageNum === pageNum && selectedElement?.id === item.id)
    );
    if (itemsToMask.length > 0) {
      const dpiScale = Math.max(window.devicePixelRatio || 1, 3);
      eraseTextItemsOnCanvas(canvasRef.current, itemsToMask, zoom, dpiScale);
    }
  }, [rendered, selectedElement, activeTool, pageData?.originalTextItems?.length, zoom, pageNum, pageData]);

  // ── Drawing state ─────────────────────────────────────────────────────────
  const [isDrawingLocal,      setIsDrawingLocal]      = useState(false);
  const [currentPathPoints,   setCurrentPathPoints]   = useState(null);
  const [shapeStartPoint,     setShapeStartPoint]     = useState(null);
  const [currentShapePreview, setCurrentShapePreview] = useState(null);
  const [isResizing,          setIsResizing]          = useState(false);

  // ── enqueueRender ────────────────────────────────────────────────────────
  // useCallback deps: only pdfjsDoc + pageNum + zoom. Everything else is read
  // from stable refs so we never get stale values AND we don't over-create.
  const enqueueRender = useCallback(() => {
    if (!pdfjsDoc || !pageDataRef.current) return;

    renderRequestIdRef.current += 1;
    const requestId = renderRequestIdRef.current;

    // If already running, just flag that we need another pass after done
    if (renderQueuedRef.current || renderInProgressRef.current) {
      renderNeedsRerenderRef.current = true;
      setRendering(true);
      return;
    }

    renderQueuedRef.current = true;
    setRendering(true);

    // ── inner: single-pass render at given dpiScale + intent ──────────────
    const doRender = async (page, canvas, dpiScale, intent) => {
      if (requestId !== renderRequestIdRef.current) return false;
      if (!canvas) return false;

      const pd       = pageDataRef.current;
      const rotation = pd?.rotation || 0;
      const viewport = page.getViewport({ scale: zoom, rotation });

      // Physical pixels = logical × dpiScale
      canvas.width        = Math.floor(viewport.width  * dpiScale);
      canvas.height       = Math.floor(viewport.height * dpiScale);
      canvas.style.width  = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled  = true;
      ctx.imageSmoothingQuality  = 'high';
      ctx.setTransform(dpiScale, 0, 0, dpiScale, 0, 0); // reset + scale in one call

      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch {}
        renderTaskRef.current = null;
      }

      const task = page.render({ canvasContext: ctx, viewport, intent, annotationMode: 0 });
      renderTaskRef.current = task;

      try {
        await task.promise;
      } catch (err) {
        if (err?.name === 'RenderingCancelledException' || String(err).includes('Cancelled')) {
          return false;
        }
        throw err;
      }
      renderTaskRef.current = null;

      return requestId === renderRequestIdRef.current;
    };

    // ── enqueue onto the global per-document queue ────────────────────────
    enqueueForDoc(pdfjsDoc, async () => {
      // Abort if a newer request came in while we were waiting in queue
      if (requestId !== renderRequestIdRef.current) return;

      renderQueuedRef.current      = false;
      renderInProgressRef.current  = true;
      renderNeedsRerenderRef.current = false;

      let page;
      try {
        page = await pdfjsDoc.getPage(pageNum);
      } catch (err) {
        console.error(`[PDFPage] getPage(${pageNum}) failed:`, err);
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas || requestId !== renderRequestIdRef.current) return;

      try {
        // Pass 1 — fast preview (low DPI, no print quality)
        const fastDpi = Math.min(Math.max(window.devicePixelRatio || 1, 1), 1.75);
        if (await doRender(page, canvas, fastDpi, 'display')) {
          setRendered(true);
        }

        if (requestId !== renderRequestIdRef.current) return;

        // Pass 2 — high quality final render
        const finalDpi = Math.max(window.devicePixelRatio || 1, 3);
        if (await doRender(page, canvas, finalDpi, 'print')) {
          setRendered(true);

          onPageRenderedRef.current?.(pageNum, canvas.toDataURL('image/png'));

          if (!colorsDetectedRef.current) {
            colorsDetectedRef.current = true;
            const unanalyzedItems = pageDataRef.current?.originalTextItems || [];
            if (unanalyzedItems.length > 0) {
              const updates = detectColorsFromCanvas(canvas, unanalyzedItems, zoom, finalDpi);
              if (Object.keys(updates).length > 0) {
                updateTextItemsColors(pageNum, updates);
              }
            }
          }

          const itemsToMask = pageDataRef.current?.originalTextItems?.filter(item =>
            item.edited ||
            (activeToolRef.current === 'edit-text' && selectedElementRef.current?.type === 'text-item' && selectedElementRef.current?.pageNum === pageNum && selectedElementRef.current?.id === item.id)
          );
          if (itemsToMask?.length) {
            eraseTextItemsOnCanvas(canvas, itemsToMask, zoom, finalDpi);
          }
        }
      } finally {
        // Always release the in-progress lock, even if we threw
        renderInProgressRef.current = false;
        renderQueuedRef.current     = false;

        if (requestId === renderRequestIdRef.current) {
          setRendering(false);
        }

        // If a re-render was requested while we were busy, kick it off now
        if (renderNeedsRerenderRef.current) {
          renderNeedsRerenderRef.current = false;
          // Use the ref so we always call the latest version of enqueueRender
          enqueueRenderRef.current?.();
        }
      }
    });
  }, [pdfjsDoc, pageNum, zoom]);

  // Keep the ref pointing at the latest enqueueRender (for recursive calls)
  useEffect(() => { enqueueRenderRef.current = enqueueRender; }, [enqueueRender]);

  // ── Handle pdfjsDoc change (new file loaded) ─────────────────────────────
  useEffect(() => {
    if (prevPdfjsDocRef.current === pdfjsDoc) return;
    prevPdfjsDocRef.current = pdfjsDoc;

    // Cancel any in-flight task
    if (renderTaskRef.current) {
      try { renderTaskRef.current.cancel(); } catch {}
      renderTaskRef.current = null;
    }

    colorsDetectedRef.current = false;
    setRendered(false);
    setRendering(false);
    renderQueuedRef.current        = false;
    renderInProgressRef.current    = false;
    renderNeedsRerenderRef.current = false;

    if (pdfjsDoc) enqueueRender();
  }, [pdfjsDoc, enqueueRender]);

  // ── Lazy render via IntersectionObserver ─────────────────────────────────
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (
          entries[0].isIntersecting &&
          !rendered &&
          !renderQueuedRef.current &&
          !renderInProgressRef.current
        ) {
          enqueueRender();
        }
      },
      { rootMargin: '200px 0px', threshold: 0.01 }
    );
    const el = containerRef.current;
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [enqueueRender, rendered]);

  // ── Re-render on zoom / rotation change ──────────────────────────────────
  useEffect(() => {
    if (rendered) enqueueRender();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, pageData?.rotation]);
  // NOTE: intentionally omitting `enqueueRender` from deps here.
  // It changes whenever zoom changes, which would cause a double-render.
  // We depend on zoom directly and call the stable ref.

  // ── Focus management for selected elements ────────────────────────────────
  // We only focus the element the *first time* it is selected (when the DOM
  // element isn't already focused). We deliberately do NOT call selectAll
  // here — that would wipe the click-placed cursor position.
  useEffect(() => {
    if (!rendered || !selectedElement || selectedElement.pageNum !== pageNum) return;
    const { type, id } = selectedElement;
    if (type === 'text-item' && activeTool === 'edit-text') {
      const el = document.getElementById(`editable-text-span-${id}`);
      if (el && document.activeElement !== el) {
        // Use a short timeout so the browser has finished processing the click
        // event (and placed the caret) before we programmatically focus.
        setTimeout(() => {
          if (document.activeElement !== el) el.focus();
        }, 0);
      }
    }
    if (type === 'annotation' && activeTool === 'select') {
      const el = document.getElementById(`editable-ann-span-${id}`);
      if (el && document.activeElement !== el) el.focus();
    }
  }, [rendered, selectedElement, activeTool, pageNum]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch {}
        renderTaskRef.current = null;
      }
    };
  }, []);

  if (!pageData) return null;

  // ── Layout ────────────────────────────────────────────────────────────────
  const pageWidth  = pageData.width;
  const pageHeight = pageData.height;
  const w = pageWidth  * zoom;
  const h = pageHeight * zoom;

  const rotation       = ((pageData.rotation || 0) % 360 + 360) % 360;
  const isRotated9027  = rotation === 90 || rotation === 270;
  const containerWidth  = isRotated9027 ? h : w;
  const containerHeight = isRotated9027 ? w : h;

  // CSS transform for the content layer (text + annotations) to match PDF rotation
  const pageLayerTransform = (() => {
    if (rotation === 90)  return `translate(${h}px, 0px) rotate(90deg)`;
    if (rotation === 180) return `translate(${w}px, ${h}px) rotate(180deg)`;
    if (rotation === 270) return `translate(0px, ${w}px) rotate(270deg)`;
    return 'none';
  })();

  const pageLayerStyle = {
    position:        'absolute',
    left:            0,
    top:             0,
    width:           `${w}px`,
    height:          `${h}px`,
    transform:       pageLayerTransform,
    transformOrigin: 'top left',
  };

  // ── Coordinate helpers ────────────────────────────────────────────────────
  const screenToPdfCoords = (clientX, clientY) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    let sx = clientX - rect.left;
    let sy = clientY - rect.top;
    if (rotation === 90)  { const t = sx; sx = sy;                   sy = containerWidth  - t; }
    if (rotation === 180) {                sx = containerWidth  - sx; sy = containerHeight - sy; }
    if (rotation === 270) { const t = sx; sx = containerHeight - sy; sy = t; }
    return {
      x: Math.min(pageWidth,  Math.max(0, sx / zoom)),
      y: Math.min(pageHeight, Math.max(0, sy / zoom)),
    };
  };

  const screenDeltaToPdfDelta = (deltaX, deltaY) => {
    if (rotation === 90)  return { dx:  deltaY / zoom, dy: -deltaX / zoom };
    if (rotation === 180) return { dx: -deltaX / zoom, dy: -deltaY / zoom };
    if (rotation === 270) return { dx: -deltaY / zoom, dy:  deltaX / zoom };
    return { dx: deltaX / zoom, dy: deltaY / zoom };
  };

  // ── Pointer handlers ──────────────────────────────────────────────────────
  const handlePointerDown = (e) => {
    if (isResizing) return;
    const { x, y } = screenToPdfCoords(e.clientX, e.clientY);

    if (activeTool === 'draw' || activeTool === 'highlight') {
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsDrawingLocal(true);
      setCurrentPathPoints([{ x, y }]);
      return;
    }
    if (activeTool === 'shape') {
      e.currentTarget.setPointerCapture(e.pointerId);
      setShapeStartPoint({ x, y });
      setCurrentShapePreview({ shapeType, x, y, width: 0, height: 0, points: [{ x, y }, { x, y }] });
      return;
    }
    if (activeTool === 'whiteout') {
      addAnnotation(pageNum, { type: 'whiteout', x: x - 50, y: y - 12, width: 100, height: 24, color: '#ffffff' });
      setActiveTool('select');
      return;
    }
    if (activeTool === 'link' && e.target === e.currentTarget) {
      addAnnotation(pageNum, {
        type: 'link',
        linkType: 'url',
        linkTarget: 'https://example.com',
        x: x - 45,
        y: y - 12,
        width: 90,
        height: 24,
      });
      setActiveTool('select');
      return;
    }
    if ((activeTool === 'edit-text' || activeTool === 'add-text') && e.target === e.currentTarget) {
      const newId = addAnnotation(pageNum, {
        type: 'text', text: 'Type something...',
        x: x - 40, y: y - 10, width: 150, height: 24,
        fontSize, fontFamily, color, bold, italic, alignment: 'left',
      });
      setTimeout(() => {
        const el = document.getElementById(`editable-ann-span-${newId}`);
        if (el) { el.focus(); try { document.execCommand('selectAll', false, null); } catch {} }
      }, 50);
      setActiveTool('select');
      return;
    }
    if (activeTool === 'select' && e.target === e.currentTarget) {
      setSelectedElement(null);
    }
  };

  const handlePointerMove = (e) => {
    if (!isDrawingLocal && !shapeStartPoint) return;
    const { x, y } = screenToPdfCoords(e.clientX, e.clientY);

    if (isDrawingLocal && currentPathPoints) {
      const last = currentPathPoints[currentPathPoints.length - 1];
      const minD = activeTool === 'highlight' ? 2 : 1.5;
      if (Math.hypot(last.x - x, last.y - y) > minD) {
        setCurrentPathPoints(prev => [...prev, { x, y }]);
      }
    }
    if (shapeStartPoint && currentShapePreview) {
      const dx = x - shapeStartPoint.x;
      const dy = y - shapeStartPoint.y;
      if (shapeType === 'line' || shapeType === 'arrow') {
        setCurrentShapePreview(prev => ({ ...prev, points: [shapeStartPoint, { x, y }] }));
      } else {
        setCurrentShapePreview(prev => ({
          ...prev,
          x:      dx < 0 ? x : shapeStartPoint.x,
          y:      dy < 0 ? y : shapeStartPoint.y,
          width:  Math.abs(dx),
          height: Math.abs(dy),
        }));
      }
    }
  };

  const handlePointerUp = () => {
    if (isDrawingLocal && currentPathPoints) {
      setIsDrawingLocal(false);
      if (currentPathPoints.length > 1) {
        addAnnotation(pageNum, {
          type:        activeTool === 'highlight' ? 'highlight' : 'path',
          points:      currentPathPoints,
          color:       activeTool === 'highlight' ? '#eab308' : color,
          strokeWidth: activeTool === 'highlight' ? 12 : strokeWidth,
        });
      }
      setCurrentPathPoints(null);
    }
    if (shapeStartPoint && currentShapePreview) {
      setShapeStartPoint(null);
      const { width = 0, height = 0, points } = currentShapePreview;
      const isLinear = shapeType === 'line' || shapeType === 'arrow';
      const hasSize  = isLinear
        ? points?.length >= 2 && (Math.abs(points[1].x - points[0].x) > 3 || Math.abs(points[1].y - points[0].y) > 3)
        : width > 5 || height > 5;
      if (hasSize) {
        addAnnotation(pageNum, {
          type: 'shape', shapeType,
          x: currentShapePreview.x, y: currentShapePreview.y,
          width, height, points: currentShapePreview.points,
          color, strokeWidth,
        });
      }
      setCurrentShapePreview(null);
    }
  };

  // ── Annotation drag ───────────────────────────────────────────────────────
  const handleAnnotationDragEnd = (annId, _e, info) => {
    const pd  = pageDataRef.current;
    const ann = pd?.annotations?.find(a => a.id === annId);
    if (!ann) return;
    const { dx, dy } = screenDeltaToPdfDelta(info.offset.x, info.offset.y);
    const maxX = Math.max(0, pageWidth  - (ann.width  || 0));
    const maxY = Math.max(0, pageHeight - (ann.height || 0));
    commitAnnotationUpdate(pageNum, annId, {
      x: Math.min(maxX, Math.max(0, ann.x + dx)),
      y: Math.min(maxY, Math.max(0, ann.y + dy)),
    });
  };

  // ── Annotation resize ─────────────────────────────────────────────────────
  const handleAnnotationResize = (ann, e) => {
    e.stopPropagation();
    setIsResizing(true);
    const { width: startW, height: startH } = ann;
    const startMX = e.clientX, startMY = e.clientY;

    const onMove = mv => {
      const { dx, dy } = screenDeltaToPdfDelta(mv.clientX - startMX, mv.clientY - startMY);
      updateAnnotation(pageNum, ann.id, {
        width:  Math.max(15, startW + dx),
        height: Math.max(10, startH + dy),
      });
    };
    const onUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
      const final = pageDataRef.current?.annotations?.find(a => a.id === ann.id);
      if (final) commitAnnotationUpdate(pageNum, ann.id, { width: final.width, height: final.height });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
  };

  const hasTextItems = !!pageData.originalTextItems?.length;

  const renderHighlightedText = (text, query, caseSensitive) => {
    if (!query) return text;
    try {
      const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(${escapedQuery})`, caseSensitive ? 'g' : 'gi');
      const parts = text.split(regex);
      return parts.map((part, i) => 
        regex.test(part) 
          ? <span key={i} className="bg-yellow-300 text-black px-[1px] rounded-[1px] font-bold shadow-sm">{part}</span>
          : part
      );
    } catch (err) {
      return text;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      id={`pdf-page-card-${pageNum}`}
      className="relative flex flex-col items-center select-none py-4"
    >
      <div
        ref={containerRef}
        className="relative bg-white shadow-xl select-none border border-white/10"
        style={{ width: `${containerWidth}px`, height: `${containerHeight}px` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* ── PDF canvas ──────────────────────────────────────────────────── */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none block"
          style={{ width: '100%', height: '100%' }}
          aria-label={`PDF page ${pageNum}`}
        />

        {/* ── Loading overlay (only before first render) ───────────────────── */}
        {rendering && !rendered && (
          <div className="absolute inset-0 z-50 bg-dark-950/20 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
            <div className="bg-dark-900/90 border border-white/10 rounded-2xl px-4 py-2.5 flex items-center gap-3 shadow-glow-sm">
              <Loader size={15} className="animate-spin text-brand-400" />
              <span className="text-xs font-semibold text-white">Rendering page {pageNum}…</span>
            </div>
          </div>
        )}

        {/* ── Content layer (rotated to match PDF canvas) ──────────────────── */}
        <div className="absolute inset-0 pointer-events-none z-10">
          <div style={pageLayerStyle}>

            {/* ── 1. Original text editing overlay ──────────────────────── */}
            {rendered && !!pageData.originalTextItems?.length && (
              <div ref={textLayerRef} className="absolute inset-0 pointer-events-none">
                {pageData.originalTextItems.map(item => {
                  const isSelectOrEdit = activeTool === 'select' || activeTool === 'edit-text' || activeTool === 'find-replace';
                  const isSelected    = selectedElement?.type === 'text-item' && selectedElement?.id === item.id;
                  const isEditingMode = activeTool === 'edit-text';

                  const left   = item.left    * zoom;
                  const top    = item.top     * zoom;
                  const width  = item.width   * zoom;
                  // Use lineHeight as fallback height — item.height can be 0 in many PDFs.
                  // Without this, the overlay div is 2px tall and unclickable.
                  const itemH  = item.lineHeight || item.height || item.fontSize || 14;
                  const height = itemH * zoom;
                  const fontSz = item.fontSize * zoom;

                  // Show opaque background only when this item is active
                  // (selected or already edited) — otherwise the PDF canvas
                  // shows through cleanly.
                  const isActive  = isSelected || !!item.edited;
                  const resolvedBg = item.bgColor ?? '#ffffff';

                  // Positioning based on alignment to keep text anchored correctly when it grows.
                  let positionStyle = {
                    position:        'absolute',
                    top:             `${top}px`,
                    height:          `${height + 2}px`,
                    backgroundColor: isActive ? resolvedBg : 'transparent',
                    isolation:       isActive ? 'isolate' : 'auto',
                    minWidth:        `${width + 4}px`,
                    width:           'auto',
                  };

                  if (item.alignment === 'right') {
                    const rightEdge = (pageWidth - (item.left + item.width)) * zoom;
                    positionStyle.right = `${rightEdge}px`;
                  } else if (item.alignment === 'center') {
                    const centerX = (item.left + item.width / 2) * zoom;
                    positionStyle.left = `${centerX}px`;
                    positionStyle.transform = 'translateX(-50%)';
                  } else {
                    positionStyle.left = `${left}px`;
                  }

                  // ── Find & Replace highlight ──────────────────────────
                  const isFindMode = activeTool === 'find-replace' && !!findQuery?.trim();
                  const itemText   = item.newText ?? item.str ?? '';
                  const highlightedHtml = isFindMode
                    ? buildHighlightHtml(itemText, findQuery, matchCase, isSelected)
                    : null;
                  // In find-replace mode, make matching items visible even if not active
                  const isMatchingItem = isFindMode && highlightedHtml !== null;

                  return (
                    <div
                      key={item.id}
                      id={`text-item-wrapper-${item.id}`}
                      style={positionStyle}
                      className={`pointer-events-auto ${
                        isSelectOrEdit
                          ? 'cursor-text hover:outline hover:outline-1 hover:outline-dashed hover:outline-brand-400/50'
                          : 'cursor-default'
                      }`}
                      onClick={e => {
                        e.stopPropagation();
                        if (isSelectOrEdit) {
                          if (activeTool !== 'edit-text') {
                            setActiveTool('edit-text');
                          }
                          // Guard: don't create a new object reference if already selected
                          // — that would trigger a re-render / focus-effect loop.
                          if (
                            selectedElement?.type !== 'text-item' ||
                            selectedElement?.id !== item.id ||
                            selectedElement?.pageNum !== pageNum
                          ) {
                            setSelectedElement({ pageNum, type: 'text-item', id: item.id });
                          }
                        }
                      }}
                    >
                      <EditableSpan
                        id={`editable-text-span-${item.id}`}
                        value={itemText}
                        highlightedContent={highlightedHtml}
                        onChange={t => {
                          updateTextItem(pageNum, item.id, { newText: t, edited: t !== item.originalText });
                        }}
                        contentEditable={isEditingMode}
                        suppressContentEditableWarning
                        tabIndex={isEditingMode ? 0 : -1}
                        onMouseDown={e => e.stopPropagation()}
                        onFocus={() => {
                          if (activeTool !== 'edit-text') {
                            setActiveTool('edit-text');
                          }
                          // Avoid calling setSelectedElement if already selected —
                          // a new object reference would trigger a re-render loop
                          // that resets cursor position via the focus useEffect.
                          if (
                            selectedElement?.type !== 'text-item' ||
                            selectedElement?.id !== item.id ||
                            selectedElement?.pageNum !== pageNum
                          ) {
                            setSelectedElement({ pageNum, type: 'text-item', id: item.id });
                          }
                        }}
                        onBlur={e => {
                          const t = String(e.currentTarget.innerText).trim();
                          updateTextItem(pageNum, item.id, { newText: t, edited: t !== item.originalText });
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.blur(); }
                        }}
                        style={{
                          display:        'block',
                          width:          '100%',
                          minWidth:       'max-content',
                          height:         '100%',
                          fontSize:   `${fontSz}px`,
                          fontFamily: item.cssFontFamilyRaw
                            ? `${item.cssFontFamilyRaw}, ${getCssFontFamily(item.fontFamily || fontFamily)}`
                            : getCssFontFamily(item.fontFamily || fontFamily),
                          fontWeight:     item.fontWeight ?? item.fontWeightValue ?? (item.bold ? 700 : 400),
                          fontStyle:      item.fontStyle  ?? (item.italic    ? 'italic'    : 'normal'),
                          textDecoration: item.underline  ? 'underline' : 'none',
                          // Show real text color only when the item is active (selected or
                          // already edited). In find-replace mode, also show color for matching
                          // items so the user can see what will be replaced.
                          color: (isActive || isMatchingItem) ? (item.color || '#000000') : 'transparent',
                          outline:        'none',
                          caretColor:     item.color || '#000000',
                          textAlign:      item.alignment || 'left',
                          lineHeight:     `${height}px`,
                          whiteSpace:     'nowrap',
                          WebkitFontSmoothing: 'antialiased',
                          MozOsxFontSmoothing: 'grayscale',
                        }}
                        className={[
                          'outline-none z-20',
                          isSelectOrEdit && isSelected ? 'pointer-events-auto' : 'pointer-events-none',
                          isSelected ? 'ring-1 ring-inset ring-dashed ring-brand-500/80' : '',
                        ].join(' ')}
                        highlightedContent={
                          activeTool === 'find-replace' && findQuery
                            ? renderHighlightedText(item.newText, findQuery, matchCase)
                            : null
                        }
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── 2. Added annotations (text, whiteout, image, signature, form fields, links, stamps) ── */}
            {rendered && !!pageData.annotations?.length && (
              <div className="absolute inset-0 pointer-events-none z-20">
                {pageData.annotations.map(ann => {
                  const isSelected   = selectedElement?.type === 'annotation' && selectedElement?.id === ann.id;
                  
                  // In form fill mode, annotations should be interactive, not draggable
                  const isDraggable = (activeTool === 'select' || activeTool === 'link' || (activeTool === 'form-add' && formSubMode === 'add')) && !isResizing;
                  
                  const annFontSz    = (ann.fontSize || 14) * zoom;

                  const handleLinkClick = (e) => {
                    if (activeTool !== 'select' && activeTool !== 'form-fill') return;
                    e.stopPropagation();
                    if (!ann.linkTarget) return;
                    if (ann.linkType === 'page') {
                      const targetEl = document.getElementById(`pdf-page-card-${ann.linkTarget}`);
                      if (targetEl) {
                        targetEl.scrollIntoView({ behavior: 'smooth' });
                      }
                    } else if (ann.linkType === 'url') {
                      let url = ann.linkTarget;
                      if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
                      window.open(url, '_blank');
                    } else if (ann.linkType === 'email') {
                      window.open(`mailto:${ann.linkTarget}`, '_self');
                    } else if (ann.linkType === 'phone') {
                      window.open(`tel:${ann.linkTarget}`, '_self');
                    }
                  };

                  return (
                    <motion.div
                      key={ann.id}
                      drag={isDraggable}
                      dragMomentum={false}
                      dragElastic={0}
                      onDragEnd={(e, info) => handleAnnotationDragEnd(ann.id, e, info)}
                      style={{
                        position: 'absolute',
                        left:     `${ann.x * zoom}px`,
                        top:      `${ann.y * zoom}px`,
                        width:    ann.type === 'text' ? 'auto' : `${ann.width  * zoom}px`,
                        height:   ann.type === 'text' ? 'auto' : `${ann.height * zoom}px`,
                      }}
                      className={[
                        'pointer-events-auto group',
                        isDraggable ? 'cursor-move' : '',
                        isSelected   ? 'outline outline-2 outline-brand-500 shadow-glow-sm z-30' : '',
                      ].join(' ')}
                      onClick={e => {
                        e.stopPropagation();
                        // Selecting annotations is possible in select or builder modes
                        if (activeTool === 'select' || activeTool === 'link' || activeTool === 'find-replace' || (activeTool === 'form-add' && formSubMode === 'add')) {
                          setSelectedElement({ pageNum, type: 'annotation', id: ann.id });
                        }
                      }}
                    >
                      {/* TEXT TYPE */}
                      {ann.type === 'text' && (
                        <EditableSpan
                          id={`editable-ann-span-${ann.id}`}
                          value={ann.text}
                          onChange={t => {
                            updateAnnotation(pageNum, ann.id, { text: t });
                          }}
                          contentEditable={activeTool === 'select' && isSelected}
                          suppressContentEditableWarning
                          tabIndex={activeTool === 'select' && isSelected ? 0 : -1}
                          onMouseDown={e => e.stopPropagation()}
                          onFocus={() => setSelectedElement({ pageNum, type: 'annotation', id: ann.id })}
                          onBlur={e => {
                            const t = String(e.currentTarget.innerText).trim();
                            if (t !== ann.text) {
                              updateAnnotation(pageNum, ann.id, { text: t });
                              commitAnnotationUpdate(pageNum, ann.id, { text: t });
                            }
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.blur(); }
                          }}
                          style={{
                            fontSize:   `${annFontSz}px`,
                            fontFamily: getCssFontFamily(ann.fontFamily || fontFamily),
                            color:      ann.color || color,
                            fontWeight: ann.bold   ? 'bold'   : 'normal',
                            fontStyle:  ann.italic ? 'italic' : 'normal',
                            textAlign:  ann.alignment || 'left',
                            minWidth:   '60px',
                            display:    'block',
                          }}
                          className="outline-none px-1 whitespace-nowrap leading-none select-text"
                          highlightedContent={
                            activeTool === 'find-replace' && findQuery
                              ? renderHighlightedText(ann.text, findQuery, matchCase)
                              : null
                          }
                        />
                      )}

                      {/* WHITEOUT TYPE */}
                      {ann.type === 'whiteout' && (
                        <div className="w-full h-full bg-white border border-gray-200/50 flex items-center justify-center">
                          <span className="text-[9px] text-gray-300 font-bold select-none opacity-0 group-hover:opacity-40 transition-opacity">
                            WHITEOUT
                          </span>
                        </div>
                      )}

                      {/* STAMP TYPE */}
                      {ann.type === 'stamp' && (
                        <div 
                          className="w-full h-full flex flex-col items-center justify-center border-2 rounded-lg p-1 text-center select-none shadow-sm" 
                          style={{ 
                            borderColor: ann.color || '#ef4444', 
                            color: ann.color || '#ef4444', 
                            backgroundColor: `${ann.color || '#ef4444'}0a` 
                          }}
                        >
                          <span className="uppercase text-xs font-black tracking-widest leading-none font-mono">
                            {ann.subject}
                          </span>
                          <span className="text-[7px] font-bold font-mono opacity-80 mt-1 uppercase leading-none">
                            {ann.author} • {ann.dateTime}
                          </span>
                        </div>
                      )}

                      {/* IMAGE & SIGNATURE IMAGES */}
                      {(ann.type === 'image' || ann.type === 'signature') && ann.dataUrl && (
                        <img
                          src={ann.dataUrl}
                          alt={ann.type === 'signature' ? 'Signature' : 'Image'}
                          className="w-full h-full object-contain pointer-events-none select-none"
                          draggable={false}
                        />
                      )}

                      {/* HYPERLINKS */}
                      {ann.type === 'link' && (
                        <div 
                          onClick={handleLinkClick}
                          className={`w-full h-full flex flex-col justify-between p-1.5 transition-all select-none ${
                            activeTool === 'link' 
                              ? 'border-2 border-dashed border-blue-500 bg-blue-500/10' 
                              : 'cursor-pointer hover:bg-brand-500/5'
                          }`}
                        >
                          {activeTool === 'link' && (
                            <div className="flex flex-col text-[8px] text-blue-400 font-bold truncate leading-tight">
                              <span className="uppercase tracking-wider">Link Block</span>
                              <span className="truncate opacity-80 mt-0.5">
                                {ann.linkType === 'page' ? `Page ${ann.linkTarget || '?'}` : ann.linkTarget || '(no url)'}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* INTERACTIVE FORM FIELDS */}
                      {ann.type === 'form-field' && (
                        <div className="w-full h-full select-none" onMouseDown={e => e.stopPropagation()}>
                          {formSubMode === 'add' ? (
                            // Add Field layout mode (visual outline boxes)
                            <div className="w-full h-full bg-brand-500/5 border border-dashed border-brand-500/70 rounded flex items-center justify-center p-1 overflow-hidden">
                              <span className="text-[8px] text-brand-400 font-bold font-mono truncate uppercase">
                                {ann.fieldType}: {ann.fieldName}
                              </span>
                            </div>
                          ) : (
                            // Interactive Form Fill layout mode (fully functional forms)
                            <div className="w-full h-full">
                              {ann.fieldType === 'text' && (
                                <input
                                  type="text"
                                  placeholder={ann.placeholderText}
                                  value={ann.defaultValue || ''}
                                  maxLength={ann.maxLength || undefined}
                                  disabled={ann.readOnly}
                                  onChange={e => commitAnnotationUpdate(pageNum, ann.id, { defaultValue: e.target.value })}
                                  className={`w-full h-full px-2 text-xs border border-gray-300 rounded focus:border-brand-500 outline-none ${
                                    ann.mandatory && !ann.defaultValue ? 'bg-yellow-500/5 border-yellow-500/30' : 'bg-white'
                                  }`}
                                />
                              )}

                              {ann.fieldType === 'textarea' && (
                                <textarea
                                  placeholder={ann.placeholderText}
                                  value={ann.defaultValue || ''}
                                  maxLength={ann.maxLength || undefined}
                                  disabled={ann.readOnly}
                                  onChange={e => commitAnnotationUpdate(pageNum, ann.id, { defaultValue: e.target.value })}
                                  className={`w-full h-full p-1.5 text-xs border border-gray-300 rounded resize-none focus:border-brand-500 outline-none ${
                                    ann.mandatory && !ann.defaultValue ? 'bg-yellow-500/5 border-yellow-500/30' : 'bg-white'
                                  }`}
                                />
                              )}

                              {ann.fieldType === 'checkbox' && (
                                <div className="w-full h-full flex items-center justify-center bg-white/10 border border-gray-300 rounded overflow-hidden">
                                  <input
                                    type="checkbox"
                                    checked={!!ann.checked}
                                    disabled={ann.readOnly}
                                    onChange={e => commitAnnotationUpdate(pageNum, ann.id, { checked: e.target.checked })}
                                    className="w-4 h-4 accent-brand-500 cursor-pointer"
                                  />
                                </div>
                              )}

                              {ann.fieldType === 'radio' && (
                                <div className="w-full h-full flex items-center justify-center bg-white/10 border border-gray-300 rounded-full overflow-hidden">
                                  <input
                                    type="radio"
                                    name={ann.groupName}
                                    checked={!!ann.checked}
                                    disabled={ann.readOnly}
                                    onChange={() => {
                                      // Uncheck others in group on this page
                                      pageData.annotations.forEach(a => {
                                        if (a.type === 'form-field' && a.fieldType === 'radio' && a.groupName === ann.groupName) {
                                          commitAnnotationUpdate(pageNum, a.id, { checked: a.id === ann.id });
                                        }
                                      });
                                    }}
                                    className="w-4 h-4 accent-brand-500 cursor-pointer"
                                  />
                                </div>
                              )}

                              {ann.fieldType === 'dropdown' && (
                                <select
                                  value={ann.defaultValue || ''}
                                  disabled={ann.readOnly}
                                  onChange={e => commitAnnotationUpdate(pageNum, ann.id, { defaultValue: e.target.value })}
                                  className="w-full h-full px-1.5 text-xs border border-gray-300 rounded bg-white focus:border-brand-500 outline-none cursor-pointer"
                                >
                                  <option value="">Choose...</option>
                                  {ann.optionsList?.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              )}

                              {ann.fieldType === 'signature' && (
                                <button
                                  disabled={ann.readOnly}
                                  onClick={() => {
                                    setSelectedElement({ pageNum, type: 'annotation', id: ann.id });
                                    if (openSignatureModal) openSignatureModal();
                                  }}
                                  className={`w-full h-full border border-gray-300 rounded flex items-center justify-center p-0.5 overflow-hidden transition-all ${
                                    ann.signatureData 
                                      ? 'bg-white hover:bg-gray-50' 
                                      : 'bg-brand-500/10 hover:bg-brand-500/20 text-brand-500 border-brand-500/40 text-[10px] font-bold'
                                  }`}
                                >
                                  {ann.signatureData ? (
                                    <img src={ann.signatureData} alt="Signature Field" className="max-w-full max-h-full object-contain" />
                                  ) : (
                                    <span>Sign Here</span>
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Resize Handle overlay */}
                      {isSelected && ann.type !== 'text' && (
                        <button
                          onMouseDown={e => handleAnnotationResize(ann, e)}
                          className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-brand-500 hover:bg-brand-400 border border-white rounded-full flex items-center justify-center cursor-se-resize translate-x-1.5 translate-y-1.5 z-40 shadow-glow-sm transition-colors"
                          aria-label="Resize"
                        >
                          <Maximize2 size={8} className="text-white rotate-90" />
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* ── 3. SVG layer (paths + shapes + live previews) ──────────── */}
            {rendered && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ zIndex: 15 }}
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Committed annotations */}
                {pageData.annotations?.map(ann => {
                  const sc = activeTool === 'select'
                    ? 'pointer-events-auto cursor-pointer hover:opacity-75'
                    : '';
                  const onClick = activeTool === 'select'
                    ? e => { e.stopPropagation(); setSelectedElement({ pageNum, type: 'annotation', id: ann.id }); }
                    : undefined;
                  const c = ann.color || '#000000';
                  const sw = (ann.strokeWidth || 3) * zoom;

                  if (ann.type === 'path' || ann.type === 'highlight') return (
                    <path key={ann.id}
                      d={buildSvgPath(ann.points, zoom)}
                      stroke={ann.color} strokeWidth={ann.strokeWidth * zoom}
                      fill="none" strokeLinecap="round" strokeLinejoin="round"
                      opacity={ann.type === 'highlight' ? 0.40 : 1}
                      className={sc} onClick={onClick}
                    />
                  );

                  if (ann.type === 'shape') {
                    if (ann.shapeType === 'rect') return (
                      <rect key={ann.id}
                        x={ann.x * zoom} y={ann.y * zoom}
                        width={ann.width * zoom} height={ann.height * zoom}
                        stroke={c} strokeWidth={sw} fill="none" strokeLinejoin="round"
                        className={sc} onClick={onClick}
                      />
                    );
                    if (ann.shapeType === 'circle') {
                      const rx = (ann.width  * zoom) / 2;
                      const ry = (ann.height * zoom) / 2;
                      return (
                        <ellipse key={ann.id}
                          cx={(ann.x * zoom) + rx} cy={(ann.y * zoom) + ry}
                          rx={rx} ry={ry}
                          stroke={c} strokeWidth={sw} fill="none"
                          className={sc} onClick={onClick}
                        />
                      );
                    }
                    if (ann.shapeType === 'line' && ann.points?.length >= 2) {
                      const [p1, p2] = ann.points;
                      return (
                        <line key={ann.id}
                          x1={p1.x * zoom} y1={p1.y * zoom}
                          x2={p2.x * zoom} y2={p2.y * zoom}
                          stroke={c} strokeWidth={sw} strokeLinecap="round"
                          className={sc} onClick={onClick}
                        />
                      );
                    }
                    if (ann.shapeType === 'arrow' && ann.points?.length >= 2) {
                      const [p1, p2] = ann.points;
                      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                      const al = 10 * zoom;
                      const hx1 = p2.x * zoom - al * Math.cos(angle - Math.PI / 6);
                      const hy1 = p2.y * zoom - al * Math.sin(angle - Math.PI / 6);
                      const hx2 = p2.x * zoom - al * Math.cos(angle + Math.PI / 6);
                      const hy2 = p2.y * zoom - al * Math.sin(angle + Math.PI / 6);
                      return (
                        <g key={ann.id} className={sc} onClick={onClick}>
                          <line x1={p1.x*zoom} y1={p1.y*zoom} x2={p2.x*zoom} y2={p2.y*zoom}
                            stroke={c} strokeWidth={sw} strokeLinecap="round" />
                          <path d={`M ${p2.x*zoom} ${p2.y*zoom} L ${hx1} ${hy1} M ${p2.x*zoom} ${p2.y*zoom} L ${hx2} ${hy2}`}
                            stroke={c} strokeWidth={sw} fill="none" strokeLinecap="round" />
                        </g>
                      );
                    }
                  }
                  return null;
                })}

                {/* Live freehand / highlight preview */}
                {isDrawingLocal && currentPathPoints?.length > 1 && (
                  <path
                    d={buildSvgPath(currentPathPoints, zoom)}
                    stroke={activeTool === 'highlight' ? '#eab308' : color}
                    strokeWidth={(activeTool === 'highlight' ? 12 : strokeWidth) * zoom}
                    fill="none" strokeLinecap="round" strokeLinejoin="round"
                    opacity={activeTool === 'highlight' ? 0.40 : 1}
                  />
                )}

                {/* Live shape preview */}
                {shapeStartPoint && currentShapePreview && (() => {
                  const px = currentShapePreview.x     * zoom;
                  const py = currentShapePreview.y     * zoom;
                  const pw = currentShapePreview.width  * zoom;
                  const ph = currentShapePreview.height * zoom;
                  const sw = strokeWidth * zoom;
                  const dash = '5 4';
                  if (shapeType === 'rect') return (
                    <rect x={px} y={py} width={pw} height={ph}
                      stroke={color} strokeWidth={sw} fill="none"
                      strokeDasharray={dash} strokeLinejoin="round" />
                  );
                  if (shapeType === 'circle') return (
                    <ellipse cx={px + pw / 2} cy={py + ph / 2} rx={pw / 2} ry={ph / 2}
                      stroke={color} strokeWidth={sw} fill="none" strokeDasharray={dash} />
                  );
                  if ((shapeType === 'line' || shapeType === 'arrow') && currentShapePreview.points?.length >= 2) {
                    const [p1, p2] = currentShapePreview.points;
                    return (
                      <line x1={p1.x*zoom} y1={p1.y*zoom} x2={p2.x*zoom} y2={p2.y*zoom}
                        stroke={color} strokeWidth={sw} strokeDasharray={dash} strokeLinecap="round" />
                    );
                  }
                  return null;
                })()}
              </svg>
            )}

          </div>
        </div>

        {/* ── 4. No-text / OCR banner ──────────────────────────────────────── */}
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
              className="px-2.5 py-1 text-[9px] font-bold rounded-lg bg-brand-500 text-white hover:bg-brand-400 transition-colors shadow-glow-sm shrink-0"
            >
              Run OCR
            </button>
          </div>
        )}
      </div>
    </div>
  );
}