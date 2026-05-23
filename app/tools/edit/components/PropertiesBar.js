'use client';

import { useEditor } from '../context/EditorContext';
import { 
  Trash2, Copy, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  Pipette, ChevronDown, Check, Link, Type, HelpCircle
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Palette of exactly 70 colors
const COLOR_PALETTE = [
  // Grays/B&W (10)
  '#000000', '#111111', '#222222', '#444444', '#666666', '#888888', '#aaaaaa', '#cccccc', '#eeeeee', '#ffffff',
  // Reds (7)
  '#ffcccc', '#ff9999', '#ff6666', '#ff3333', '#cc0000', '#990000', '#660000',
  // Oranges (7)
  '#ffe5cc', '#ffcc99', '#ff9933', '#e67300', '#b35900', '#804000', '#4d2600',
  // Yellows (7)
  '#ffffcc', '#ffff99', '#ffff66', '#ffcc00', '#cca300', '#997a00', '#665200',
  // Greens (7)
  '#ccffcc', '#99ff99', '#66ff66', '#33cc33', '#248f24', '#196619', '#0d330d',
  // Cyans (7)
  '#ccffff', '#99ffff', '#33cccc', '#009999', '#007777', '#005555', '#003333',
  // Blues (7)
  '#cce5ff', '#99ccff', '#3399ff', '#0066cc', '#004c99', '#003366', '#001a33',
  // Purples (7)
  '#e5ccff', '#cc99ff', '#9933ff', '#7f00ff', '#6600cc', '#4c0099', '#330066',
  // Pinks (7)
  '#ffcce5', '#ff99cc', '#ff3399', '#cc0066', '#99004c', '#660033', '#33001a',
  // Extra warm tones (5)
  '#fce7f3', '#fbcfe8', '#db2777', '#9d174d', '#4c0519'
];

const FONTS_LIST = [
  'Arial', 'Helvetica', 'Times New Roman', 'Courier', 'Roboto', 
  'Poppins', 'Lato', 'Open Sans', 'PT Sans', 'PT Serif', 
  'Inter', 'EB Garamond', 'Fira Sans', 'DejaVu Sans', 
  'Liberation Sans', 'Noto Sans', 'Noto Serif'
];

export default function PropertiesBar() {
  const {
    selectedElement, setSelectedElement,
    pagesData,
    updateAnnotation, commitAnnotationUpdate,
    updateTextItem,
    deleteSelectedElement,
    duplicateAnnotation,
    fontReplacementOpen, setFontReplacementOpen,
    missingFontName, replacementFontName, setReplacementFontName,
    alwaysReplaceFont, setAlwaysReplaceFont,
    updateTextItemsColors
  } = useEditor();

  const [activePicker, setActivePicker] = useState(null); // 'text-color', 'bg-color', 'stroke-color', 'fill-color'
  const [customHex, setCustomHex] = useState('');

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
  const isShape = element.type === 'rect' || element.type === 'circle' || element.type === 'line' || element.type === 'arrow';
  const isWhiteout = element.type === 'whiteout';
  const isLink = element.type === 'link';
  const isForm = element.type === 'form-field';

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleColorChange = (colorVal) => {
    if (activePicker === 'text-color') {
      if (type === 'annotation') {
        commitAnnotationUpdate(pageNum, id, { color: colorVal });
      } else {
        updateTextItem(pageNum, id, { color: colorVal });
      }
    } else if (activePicker === 'bg-color') {
      if (type === 'annotation') {
        commitAnnotationUpdate(pageNum, id, { bgColor: colorVal });
      } else {
        updateTextItem(pageNum, id, { bgColor: colorVal });
      }
    } else if (activePicker === 'stroke-color') {
      commitAnnotationUpdate(pageNum, id, { color: colorVal });
    } else if (activePicker === 'fill-color') {
      commitAnnotationUpdate(pageNum, id, { fillColor: colorVal });
    }
    setActivePicker(null);
  };

  const handleEyedropper = async () => {
    if (!window.EyeDropper) {
      alert('Eyedropper API is not supported in this browser. Please enter the hex code manually.');
      return;
    }
    try {
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open();
      handleColorChange(result.sRGBHex);
    } catch (err) {
      console.error(err);
    }
  };

  const handleHexSubmit = (e) => {
    e.preventDefault();
    if (/^#[0-9A-F]{6}$/i.test(customHex)) {
      handleColorChange(customHex);
      setCustomHex('');
    } else {
      alert('Please enter a valid hex color code (e.g. #FF0000)');
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
    const updates = { bold: boldVal, fontWeightValue: boldVal ? 700 : 400 };
    if (type === 'annotation') {
      commitAnnotationUpdate(pageNum, id, updates);
    } else {
      updateTextItem(pageNum, id, updates);
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

  const handleAlignChange = (alignmentVal) => {
    if (type === 'annotation') {
      commitAnnotationUpdate(pageNum, id, { alignment: alignmentVal });
    } else {
      updateTextItem(pageNum, id, { alignment: alignmentVal });
    }
  };

  return (
    <div className="w-full bg-dark-900 border-b border-white/5 flex flex-col shrink-0 select-none z-30 relative">
      {/* Main properties layout bar */}
      <div className="w-full px-6 py-2 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-6 flex-wrap">
          {/* Active selection tag */}
          <span className="text-[10px] font-bold text-brand-400 uppercase tracking-widest bg-brand-500/10 px-2 py-1 rounded">
            Selected: {type === 'text-item' ? 'Original Text' : element.type}
          </span>

          {/* ── TEXT & CUSTOM TEXT PROPERTIES ──────────────────────────────────── */}
          {isText && (
            <div className="flex items-center gap-4 flex-wrap">
              {/* Font Family Selector */}
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
                  {FONTS_LIST.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              {/* Font Size Selector */}
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

              {/* Text formatting toggles */}
              <div className="flex items-center gap-0.5 bg-white/[0.02] border border-white/5 p-0.5 rounded-lg">
                <button
                  onClick={handleToggleBold}
                  className={`p-1.5 rounded transition-all ${element.bold ? 'bg-white/10 text-white' : 'text-dark-500 hover:text-dark-300'}`}
                >
                  <Bold size={13} />
                </button>
                <button
                  onClick={handleToggleItalic}
                  className={`p-1.5 rounded transition-all ${element.italic ? 'bg-white/10 text-white' : 'text-dark-500 hover:text-dark-300'}`}
                >
                  <Italic size={13} />
                </button>
                <button
                  onClick={handleToggleUnderline}
                  className={`p-1.5 rounded transition-all ${element.underline ? 'bg-white/10 text-white' : 'text-dark-500 hover:text-dark-300'}`}
                >
                  <Underline size={13} />
                </button>
              </div>

              {/* Alignments */}
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
                        (element.alignment || 'left') === align.id ? 'bg-white/10 text-white' : 'text-dark-500 hover:text-dark-300'
                      }`}
                    >
                      <AIcon size={13} />
                    </button>
                  );
                })}
              </div>

              {/* Text Color Button */}
              <div className="flex items-center gap-1.5 relative">
                <span className="text-xs text-dark-400">Color:</span>
                <button
                  onClick={() => setActivePicker(activePicker === 'text-color' ? null : 'text-color')}
                  className="w-6 h-6 rounded-lg border border-white/10 flex items-center justify-center p-0.5 bg-dark-950 hover:bg-dark-900 transition-colors"
                >
                  <div className="w-full h-full rounded" style={{ backgroundColor: element.color || '#000000' }} />
                </button>
              </div>

              {/* Background Color Button (Original text items masking bg) */}
              <div className="flex items-center gap-1.5 relative">
                <span className="text-xs text-dark-400">Background:</span>
                <button
                  onClick={() => setActivePicker(activePicker === 'bg-color' ? null : 'bg-color')}
                  className="w-6 h-6 rounded-lg border border-white/10 flex items-center justify-center p-0.5 bg-dark-950 hover:bg-dark-900 transition-colors"
                >
                  <div className="w-full h-full rounded" style={{ backgroundColor: element.bgColor || '#ffffff' }} />
                </button>
              </div>
            </div>
          )}

          {/* ── SHAPES PROPERTIES ─────────────────────────────────────────────── */}
          {isShape && (
            <div className="flex items-center gap-4 flex-wrap">
              {/* Border Color */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-dark-400">Border:</span>
                <button
                  onClick={() => setActivePicker(activePicker === 'stroke-color' ? null : 'stroke-color')}
                  className="w-6 h-6 rounded-lg border border-white/10 flex items-center justify-center p-0.5 bg-dark-950"
                >
                  <div className="w-full h-full rounded" style={{ backgroundColor: element.color || '#000000' }} />
                </button>
              </div>

              {/* Fill Color */}
              {element.type !== 'line' && element.type !== 'arrow' && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-dark-400">Fill:</span>
                  <button
                    onClick={() => setActivePicker(activePicker === 'fill-color' ? null : 'fill-color')}
                    className="w-6 h-6 rounded-lg border border-white/10 flex items-center justify-center p-0.5 bg-dark-950"
                  >
                    <div className="w-full h-full rounded" style={{ backgroundColor: element.fillColor || 'transparent' }} />
                  </button>
                </div>
              )}

              {/* Thickness */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-dark-400">Thickness:</span>
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={element.strokeWidth || 3}
                  onChange={(e) => commitAnnotationUpdate(pageNum, id, { strokeWidth: Number(e.target.value) })}
                  className="w-24 accent-brand-500"
                />
                <span className="text-xs text-dark-500 font-mono w-4">{element.strokeWidth || 3}</span>
              </div>

              {/* Opacity */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-dark-400">Opacity:</span>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.1}
                  value={element.opacity === undefined ? 1.0 : element.opacity}
                  onChange={(e) => commitAnnotationUpdate(pageNum, id, { opacity: Number(e.target.value) })}
                  className="w-24 accent-brand-500"
                />
                <span className="text-xs text-dark-500 font-mono w-6">
                  {Math.round((element.opacity === undefined ? 1.0 : element.opacity) * 100)}%
                </span>
              </div>
            </div>
          )}

          {/* ── WHITEOUT PROPERTIES ───────────────────────────────────────────── */}
          {isWhiteout && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-dark-400">Color:</span>
              <button
                onClick={() => setActivePicker(activePicker === 'bg-color' ? null : 'bg-color')}
                className="w-6 h-6 rounded-lg border border-white/10 flex items-center justify-center p-0.5 bg-dark-950"
              >
                <div className="w-full h-full rounded" style={{ backgroundColor: element.bgColor || '#ffffff' }} />
              </button>
            </div>
          )}

          {/* ── LINKS PROPERTIES ─────────────────────────────────────────────── */}
          {isLink && (
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-dark-400">Link Type:</span>
                <select
                  value={element.linkType || 'url'}
                  onChange={(e) => commitAnnotationUpdate(pageNum, id, { linkType: e.target.value, linkTarget: '' })}
                  className="bg-dark-950 border border-white/10 rounded-lg px-2 py-1 text-xs text-dark-200 outline-none"
                >
                  <option value="url">URL Link</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone Number</option>
                  <option value="page">Internal Page</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-dark-400">Destination:</span>
                {element.linkType === 'page' ? (
                  <input
                    type="number"
                    min={1}
                    max={pagesData.length}
                    value={element.linkTarget || 1}
                    onChange={(e) => commitAnnotationUpdate(pageNum, id, { linkTarget: Number(e.target.value) })}
                    className="w-16 bg-dark-950 border border-white/10 rounded-lg px-2 py-1 text-xs text-dark-200 text-center font-mono"
                  />
                ) : (
                  <input
                    type="text"
                    placeholder={
                      element.linkType === 'email' ? 'example@email.com' :
                      element.linkType === 'phone' ? '+1234567890' : 'https://example.com'
                    }
                    value={element.linkTarget || ''}
                    onChange={(e) => commitAnnotationUpdate(pageNum, id, { linkTarget: e.target.value })}
                    className="w-48 bg-dark-950 border border-white/10 rounded-lg px-2 py-1 text-xs text-dark-200 outline-none"
                  />
                )}
              </div>
            </div>
          )}

          {/* ── INTERACTIVE FORM FIELD PROPERTIES ──────────────────────────────── */}
          {isForm && (
            <div className="flex items-center gap-4 flex-wrap text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-dark-400">Field Name:</span>
                <input
                  type="text"
                  value={element.fieldName || ''}
                  onChange={(e) => {
                    const name = e.target.value.replace(/\s+/g, '_');
                    commitAnnotationUpdate(pageNum, id, { fieldName: name });
                  }}
                  placeholder="name_tag"
                  className="w-24 bg-dark-950 border border-white/10 rounded-lg px-2 py-1 text-dark-200"
                />
              </div>

              {(element.fieldType === 'text' || element.fieldType === 'textarea') && (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="text-dark-400">Placeholder:</span>
                    <input
                      type="text"
                      value={element.placeholderText || ''}
                      onChange={(e) => commitAnnotationUpdate(pageNum, id, { placeholderText: e.target.value })}
                      className="w-28 bg-dark-950 border border-white/10 rounded-lg px-2 py-1 text-dark-200"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-dark-400">Max Chars:</span>
                    <input
                      type="number"
                      min={0}
                      value={element.maxLength || ''}
                      onChange={(e) => commitAnnotationUpdate(pageNum, id, { maxLength: Number(e.target.value) || null })}
                      className="w-14 bg-dark-950 border border-white/10 rounded-lg px-2 py-1 text-dark-200 font-mono text-center"
                    />
                  </div>
                </>
              )}

              {element.fieldType === 'dropdown' && (
                <div className="flex items-center gap-1.5">
                  <span className="text-dark-400">Options (1 per line):</span>
                  <textarea
                    rows={1}
                    value={element.optionsList?.join('\n') || ''}
                    onChange={(e) => commitAnnotationUpdate(pageNum, id, { optionsList: e.target.value.split('\n') })}
                    placeholder="Option A&#10;Option B"
                    className="w-36 bg-dark-950 border border-white/10 rounded-lg px-2 py-0.5 text-dark-200 custom-scroll resize-none"
                  />
                </div>
              )}

              {element.fieldType === 'radio' && (
                <div className="flex items-center gap-1.5">
                  <span className="text-dark-400">Radio Group Name:</span>
                  <input
                    type="text"
                    value={element.groupName || ''}
                    onChange={(e) => commitAnnotationUpdate(pageNum, id, { groupName: e.target.value })}
                    placeholder="group1"
                    className="w-24 bg-dark-950 border border-white/10 rounded-lg px-2 py-1 text-dark-200"
                  />
                </div>
              )}

              {/* Toggles */}
              <div className="flex items-center gap-3 border-l border-white/10 pl-3">
                <label className="flex items-center gap-1.5 cursor-pointer text-dark-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={!!element.mandatory}
                    onChange={(e) => commitAnnotationUpdate(pageNum, id, { mandatory: e.target.checked })}
                    className="accent-brand-500 rounded"
                  />
                  <span>Required</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-dark-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={!!element.readOnly}
                    onChange={(e) => commitAnnotationUpdate(pageNum, id, { readOnly: e.target.checked })}
                    className="accent-brand-500 rounded"
                  />
                  <span>Read-Only</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-dark-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={!!element.repeatAllPages}
                    onChange={(e) => commitAnnotationUpdate(pageNum, id, { repeatAllPages: e.target.checked })}
                    className="accent-brand-500 rounded"
                  />
                  <span>Repeat Pages</span>
                </label>
              </div>
            </div>
          )}

        </div>

        {/* Right side: Delete / Duplicate Operations */}
        <div className="flex items-center gap-1.5 shrink-0">
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
      </div>

      {/* ── EXPANDED COLOR PICKER PALETTE (FLOAT-BOTTOM) ────────────────────── */}
      <AnimatePresence>
        {activePicker && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute top-full left-6 mt-1 p-3 bg-dark-900 border border-white/10 rounded-xl shadow-glow z-50 flex flex-col gap-3 w-[260px]"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white uppercase tracking-wider">
                {activePicker.replace('-', ' ')}
              </span>
              <button
                onClick={handleEyedropper}
                className="flex items-center gap-1 text-[10px] font-bold text-brand-400 hover:text-brand-300 transition-colors"
                title="Pick color from document"
              >
                <Pipette size={12} />
                <span>Eyedropper</span>
              </button>
            </div>

            {/* Grid of exactly 70 colors */}
            <div className="grid grid-cols-10 gap-1 overflow-y-auto max-h-[140px] p-0.5 custom-scroll">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => handleColorChange(c)}
                  className="w-4 h-4 rounded border border-white/5 hover:scale-115 hover:border-white transition-all flex items-center justify-center"
                  style={{ backgroundColor: c }}
                >
                  {((activePicker === 'text-color' && element.color === c) ||
                    (activePicker === 'bg-color' && element.bgColor === c) ||
                    (activePicker === 'stroke-color' && element.color === c) ||
                    (activePicker === 'fill-color' && element.fillColor === c)) && (
                    <Check size={9} className="text-white drop-shadow mix-blend-difference" />
                  )}
                </button>
              ))}
            </div>

            {/* Custom hex entry */}
            <form onSubmit={handleHexSubmit} className="flex gap-1.5">
              <input
                type="text"
                placeholder="HEX e.g. #FF0000"
                value={customHex}
                onChange={(e) => setCustomHex(e.target.value)}
                className="flex-1 bg-dark-950 border border-white/10 rounded-lg px-2 py-1 text-xs text-dark-200 outline-none focus:border-brand-500 font-mono uppercase"
              />
              <button
                type="submit"
                className="bg-brand-500 hover:bg-brand-600 px-3 py-1 rounded-lg text-xs font-semibold text-white transition-colors"
              >
                Apply
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FONT REPLACEMENT DIALOG MODAL ────────────────────────────────────── */}
      <AnimatePresence>
        {fontReplacementOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-dark-900 border border-white/10 max-w-md w-full p-6 rounded-2xl shadow-glow"
            >
              <div className="flex items-center gap-3 text-yellow-500 mb-3">
                <HelpCircle size={24} />
                <h3 className="text-lg font-bold text-white">Missing Font Characters</h3>
              </div>
              
              <p className="text-xs text-dark-400 leading-relaxed mb-4">
                The original embedded font <span className="font-semibold text-dark-200">"{missingFontName}"</span> does not support some of the characters you typed. You can choose a compatible replacement font below.
              </p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-[10px] font-bold text-brand-400 uppercase tracking-widest block mb-1">
                    Choose Replacement Font
                  </label>
                  <select
                    value={replacementFontName}
                    onChange={(e) => setReplacementFontName(e.target.value)}
                    className="w-full bg-dark-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-dark-200 outline-none focus:border-brand-500"
                  >
                    {FONTS_LIST.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-dark-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={alwaysReplaceFont}
                    onChange={(e) => setAlwaysReplaceFont(e.target.checked)}
                    className="accent-brand-500 rounded"
                  />
                  <span>Always use this replacement for missing characters.</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setFontReplacementOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 text-dark-300 hover:bg-white/10 hover:text-white transition-all"
                >
                  Keep Original
                </button>
                <button
                  onClick={() => {
                    handleFontFamilyChange(replacementFontName);
                    setFontReplacementOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-500 text-white hover:bg-brand-600 transition-all shadow-lg"
                >
                  Replace Font
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
