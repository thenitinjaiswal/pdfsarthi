'use client';

import { useEditor } from '../context/EditorContext';
import { Trash2, Copy, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PropertiesBar() {
  const {
    selectedElement, setSelectedElement,
    pagesData,
    updateAnnotation, commitAnnotationUpdate,
    updateTextItem,
    deleteSelectedElement,
    duplicateAnnotation
  } = useEditor();

  if (!selectedElement) return null;

  const { pageNum, type, id } = selectedElement;
  const page = pagesData.find(p => p.pageNum === pageNum);
  if (!page) return null;

  let element = null;
  if (type === 'annotation') {
    element = page.annotations.find(a => a.id === id);
  } else if (type === 'text-item') {
    element = page.originalTextItems.find(t => t.id === id);
  }

  if (!element) return null;

  const isText = type === 'text-item' || element.type === 'text';
  const isCustomText = type === 'annotation' && element.type === 'text';
  const isLineOrArrow = element.type === 'line' || element.type === 'arrow';
  const isShape = element.type === 'rect' || element.type === 'circle' || isLineOrArrow;
  const isDrawing = element.type === 'path' || element.type === 'highlight';
  const isWhiteout = element.type === 'whiteout';

  // Handlers for state updates
  const handleColorChange = (color) => {
    if (type === 'annotation') {
      commitAnnotationUpdate(pageNum, id, { color });
    } else {
      updateTextItem(pageNum, id, { color });
    }
  };

  const handleFontSizeChange = (size) => {
    const fontSize = Number(size);
    if (type === 'annotation') {
      commitAnnotationUpdate(pageNum, id, { fontSize });
    } else {
      updateTextItem(pageNum, id, { fontSize });
    }
  };

  const handleFontFamilyChange = (fontFamily) => {
    if (type === 'annotation') {
      commitAnnotationUpdate(pageNum, id, { fontFamily, cssFontFamilyRaw: null });
    } else {
      updateTextItem(pageNum, id, { fontFamily, cssFontFamilyRaw: null });
    }
  };

  const handleToggleBold = () => {
    const boldVal = !element.bold;
    if (type === 'annotation') {
      commitAnnotationUpdate(pageNum, id, { bold: boldVal });
    } else {
      updateTextItem(pageNum, id, { bold: boldVal });
    }
  };

  const handleToggleItalic = () => {
    const italicVal = !element.italic;
    if (type === 'annotation') {
      commitAnnotationUpdate(pageNum, id, { italic: italicVal });
    } else {
      updateTextItem(pageNum, id, { italic: italicVal });
    }
  };

  const handleToggleUnderline = () => {
    const underlineVal = !element.underline;
    if (type === 'annotation') {
      commitAnnotationUpdate(pageNum, id, { underline: underlineVal });
    } else {
      updateTextItem(pageNum, id, { underline: underlineVal });
    }
  };

  const handleAlignChange = (alignment) => {
    if (type === 'annotation') {
      commitAnnotationUpdate(pageNum, id, { alignment });
    } else {
      updateTextItem(pageNum, id, { alignment });
    }
  };

  const handleStrokeWidthChange = (width) => {
    const strokeWidth = Number(width);
    if (type === 'annotation') {
      commitAnnotationUpdate(pageNum, id, { strokeWidth });
    }
  };

  const swatches = [
    '#000000', '#ffffff', '#ef4444', '#f97316', '#f59e0b', 
    '#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899'
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="w-full bg-dark-900 border-b border-white/5 px-6 py-2 flex items-center justify-between shrink-0 select-none z-30"
      >
        <div className="flex items-center gap-6 flex-wrap">
          {/* Label indicating selection */}
          <span className="text-[10px] font-bold text-brand-400 uppercase tracking-widest bg-brand-500/10 px-2 py-1 rounded">
            Selected: {type === 'text-item' ? 'Original Text' : element.type}
          </span>

          {/* Color Picker */}
          {(isText || isShape || isDrawing) && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-dark-400">Color:</span>
              <div className="flex items-center gap-1 bg-white/[0.02] border border-white/5 p-1 rounded-lg">
                {swatches.map((c) => (
                  <button
                    key={c}
                    onClick={() => handleColorChange(c)}
                    className={`w-4 h-4 rounded-full border transition-all ${
                      element.color === c ? 'border-white scale-110 shadow-glow-sm' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Font Controls */}
          {isText && (
            <div className="flex items-center gap-4 flex-wrap">
              {/* Font Family */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-dark-400">Font:</span>
                <select
                  value={element.cssFontFamilyRaw ? 'original' : (element.fontFamily || 'Helvetica')}
                  onChange={(e) => {
                    if (e.target.value !== 'original') {
                      handleFontFamilyChange(e.target.value);
                    }
                  }}
                  className="bg-dark-950 border border-white/10 rounded-lg px-2 py-1 text-xs text-dark-200 outline-none focus:border-brand-500"
                >
                  {element.cssFontFamilyRaw && (
                    <option value="original">Original ({element.cssFontFamilyRaw})</option>
                  )}
                  <option value="Helvetica">Helvetica</option>
                  <option value="TimesRoman">Times New Roman</option>
                  <option value="Courier">Courier</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Open Sans">Open Sans</option>
                  <option value="Montserrat">Montserrat</option>
                  <option value="Lora">Lora</option>
                  <option value="Merriweather">Merriweather</option>
                  <option value="Inter">Inter</option>
                  <option value="Poppins">Poppins</option>
                </select>
              </div>

              {/* Font Size */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-dark-400">Size:</span>
                <input
                  type="number"
                  min={6}
                  max={120}
                  value={element.fontSize || 12}
                  onChange={(e) => handleFontSizeChange(e.target.value)}
                  className="w-14 bg-dark-950 border border-white/10 rounded-lg px-2 py-1 text-xs text-dark-200 font-mono text-center outline-none focus:border-brand-500"
                />
              </div>

              {/* Style Toggles */}
              <div className="flex items-center gap-0.5 bg-white/[0.02] border border-white/5 p-0.5 rounded-lg">
                <button
                  onClick={handleToggleBold}
                  className={`p-1.5 rounded transition-all ${
                    element.bold ? 'bg-white/10 text-white' : 'text-dark-500 hover:text-dark-300'
                  }`}
                >
                  <Bold size={13} />
                </button>
                <button
                  onClick={handleToggleItalic}
                  className={`p-1.5 rounded transition-all ${
                    element.italic ? 'bg-white/10 text-white' : 'text-dark-500 hover:text-dark-300'
                  }`}
                >
                  <Italic size={13} />
                </button>
                <button
                  onClick={handleToggleUnderline}
                  className={`p-1.5 rounded transition-all ${
                    element.underline ? 'bg-white/10 text-white' : 'text-dark-500 hover:text-dark-300'
                  }`}
                >
                  <Underline size={13} />
                </button>
              </div>

              {/* Alignments */}
              {isText && (
                <div className="flex items-center gap-0.5 bg-white/[0.02] border border-white/5 p-0.5 rounded-lg">
                  {[
                    { id: 'left', icon: AlignLeft },
                    { id: 'center', icon: AlignCenter },
                    { id: 'right', icon: AlignRight }
                  ].map((align) => {
                    const AIcon = align.icon;
                    return (
                      <button
                        key={align.id}
                        onClick={() => handleAlignChange(align.id)}
                        className={`p-1.5 rounded transition-all ${
                          (element.alignment || 'left') === align.id 
                            ? 'bg-white/10 text-white' 
                            : 'text-dark-500 hover:text-dark-300'
                        }`}
                      >
                        <AIcon size={13} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Stroke Thickness (for drawing / shapes) */}
          {(isShape || isDrawing) && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-dark-400">Thickness:</span>
              <input
                type="range"
                min={1}
                max={20}
                value={element.strokeWidth || 3}
                onChange={(e) => handleStrokeWidthChange(e.target.value)}
                className="w-24 accent-brand-500"
              />
              <span className="text-xs text-dark-500 font-mono w-4">
                {element.strokeWidth || 3}
              </span>
            </div>
          )}
        </div>

        {/* Right side: Delete / Duplicate Operations */}
        <div className="flex items-center gap-1.5">
          {type === 'annotation' && (
            <button
              onClick={() => duplicateAnnotation(pageNum, id)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/5 text-dark-300 hover:bg-white/10 hover:text-white transition-all"
            >
              <Copy size={12} />
              <span>Duplicate</span>
            </button>
          )}

          <button
            onClick={deleteSelectedElement}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400 transition-all border border-red-500/20"
          >
            <Trash2 size={12} />
            <span>Delete</span>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
