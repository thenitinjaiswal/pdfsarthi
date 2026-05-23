'use client';

import { useEditor } from '../context/EditorContext';
import { 
  MousePointer, Type, Image, PenLine, Eraser, FileSignature, 
  Undo, Redo, ZoomIn, ZoomOut, Download, Loader, Square, Circle, 
  Minus, MoveRight, ChevronDown, Check, CaseSensitive, Link, 
  FileText, CheckSquare, ListPlus, Radio, Key, Share2, Printer
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FindReplacePanel from './FindReplacePanel';

export default function FloatingToolbar({ handleExport, openSignatureModal, triggerImageUpload }) {
  const {
    activeTool, setActiveTool,
    formSubMode, setFormSubMode,
    canUndo, canRedo, undo, redo,
    zoom, setZoom,
    exporting, loading,
    shapeType, setShapeType,
    pagesData,
    savedStamps,
    addAnnotation,
    browserZoomAlert,
    scannedDocWarning,
    xfaWarning
  } = useEditor();

  const [showShapeMenu, setShowShapeMenu] = useState(false);
  const [showFormMenu, setShowFormMenu] = useState(false);
  const [showStampMenu, setShowStampMenu] = useState(false);
  const [showAnnotateMenu, setShowAnnotateMenu] = useState(false);

  const shapeMenuRef = useRef(null);
  const formMenuRef = useRef(null);
  const stampMenuRef = useRef(null);
  const annotateMenuRef = useRef(null);

  // Close menus on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (shapeMenuRef.current && !shapeMenuRef.current.contains(e.target)) setShowShapeMenu(false);
      if (formMenuRef.current && !formMenuRef.current.contains(e.target)) setShowFormMenu(false);
      if (stampMenuRef.current && !stampMenuRef.current.contains(e.target)) setShowStampMenu(false);
      if (annotateMenuRef.current && !annotateMenuRef.current.contains(e.target)) setShowAnnotateMenu(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectShape = (type) => {
    setShapeType(type);
    setActiveTool('shape');
    setShowShapeMenu(false);
  };

  const handleAddStamp = (stamp) => {
    // Add stamp as an annotation on the current page
    addAnnotation(1, {
      type: 'stamp',
      subject: stamp.subject,
      author: stamp.author,
      dateTime: stamp.dateTime,
      color: stamp.color,
      width: 140,
      height: 60
    });
    setShowStampMenu(false);
  };

  const shapeIcons = {
    rect: Square,
    circle: Circle,
    line: Minus,
    arrow: MoveRight
  };
  const ActiveShapeIcon = shapeIcons[shapeType] || Square;

  return (
    <div className="w-full bg-dark-950 border-b border-white/5 flex flex-col shrink-0 select-none z-40 relative">
      {/* ── Top Warning Banners ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {browserZoomAlert && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="bg-yellow-500/10 border-b border-yellow-500/20 text-yellow-500 text-[11px] px-6 py-1.5 font-medium flex items-center justify-between">
            <span>Warning: Browser zoom is not set to 100%. This can distort placement coords. Please reset browser zoom.</span>
          </motion.div>
        )}
        {scannedDocWarning && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="bg-amber-500/10 border-b border-amber-500/20 text-amber-500 text-[11px] px-6 py-1.5 font-medium flex items-center justify-between">
            <span>Scan Detected: Direct text edit is disabled for scans. You can add new text and shape overlays on top.</span>
          </motion.div>
        )}
        {xfaWarning && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="bg-red-500/10 border-b border-red-500/20 text-red-500 text-[11px] px-6 py-1.5 font-medium flex items-center justify-between">
            <span>Error: This document contains dynamic XFA forms which are unsupported. Editing might cause loss of field data.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Toolbar Layout ──────────────────────────────────────────────── */}
      <div className="w-full px-6 py-3 flex items-center justify-between flex-wrap gap-4">
        
        {/* Left side: Editing tools buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Select Tool */}
          <button
            onClick={() => setActiveTool('select')}
            title="Select Elements"
            className={`p-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTool === 'select' ? 'bg-brand-500 text-white shadow-glow-sm' : 'text-dark-400 hover:text-dark-200 hover:bg-white/5'
            }`}
          >
            <MousePointer size={16} />
            <span className="text-xs font-semibold hidden lg:inline">Select</span>
          </button>

          {/* Edit / Add Text */}
          <button
            onClick={() => setActiveTool('edit-text')}
            title="Text Editing Tool"
            className={`p-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTool === 'edit-text' || activeTool === 'add-text' ? 'bg-brand-500 text-white shadow-glow-sm' : 'text-dark-400 hover:text-dark-200 hover:bg-white/5'
            }`}
          >
            <CaseSensitive size={16} />
            <span className="text-xs font-semibold hidden lg:inline">Text</span>
          </button>

          {/* Links Tool */}
          <button
            onClick={() => setActiveTool('link')}
            title="Hyperlinks Creator"
            className={`p-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTool === 'link' ? 'bg-brand-500 text-white shadow-glow-sm' : 'text-dark-400 hover:text-dark-200 hover:bg-white/5'
            }`}
          >
            <Link size={16} />
            <span className="text-xs font-semibold hidden lg:inline">Links</span>
          </button>

          {/* Forms Multi-Tool Dropdown */}
          <div className="relative" ref={formMenuRef}>
            <button
              onClick={() => {
                setActiveTool('form-add');
                setShowFormMenu(!showFormMenu);
              }}
              title="Forms Fields Creator"
              className={`p-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTool === 'form-add' || activeTool === 'form-fill' ? 'bg-brand-500 text-white shadow-glow-sm' : 'text-dark-400 hover:text-dark-200 hover:bg-white/5'
              }`}
            >
              <FileText size={16} />
              <span className="text-xs font-semibold hidden lg:inline">Forms</span>
              <ChevronDown size={11} className="opacity-60" />
            </button>

            {showFormMenu && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-dark-900 border border-white/10 rounded-xl shadow-glow p-1.5 flex flex-col gap-0.5 z-50">
                <div className="text-[10px] font-bold text-dark-500 uppercase px-2 py-1 tracking-widest border-b border-white/5 mb-1">
                  Place Form Fields
                </div>
                {[
                  { id: 'text', label: 'Text Box (Single line)', icon: Type },
                  { id: 'textarea', label: 'Text Area (Multiline)', icon: Type },
                  { id: 'checkbox', label: 'Checkbox', icon: CheckSquare },
                  { id: 'dropdown', label: 'Dropdown List', icon: ListPlus },
                  { id: 'radio', label: 'Radio Button', icon: Radio },
                  { id: 'signature', label: 'Signature Box', icon: FileSignature }
                ].map((field) => (
                  <button
                    key={field.id}
                    onClick={() => {
                      setActiveTool('form-add');
                      addAnnotation(1, {
                        type: 'form-field',
                        fieldType: field.id,
                        fieldName: `${field.id}_${Date.now().toString().slice(-4)}`,
                        placeholderText: `Enter ${field.id}`,
                        defaultValue: '',
                        optionsList: field.id === 'dropdown' ? ['Option 1', 'Option 2', 'Option 3'] : [],
                        groupName: field.id === 'radio' ? 'radio_group' : '',
                        mandatory: false,
                        readOnly: false,
                        width: field.id === 'textarea' ? 180 : (field.id === 'checkbox' || field.id === 'radio' ? 24 : 140),
                        height: field.id === 'textarea' ? 60 : (field.id === 'checkbox' || field.id === 'radio' ? 24 : 32)
                      });
                      setShowFormMenu(false);
                    }}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-dark-300 hover:bg-white/5 hover:text-white transition-all text-left"
                  >
                    <field.icon size={13} className="text-brand-400" />
                    <span>{field.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Images & Stamps dropdown */}
          <div className="relative" ref={stampMenuRef}>
            <button
              onClick={() => setShowStampMenu(!showStampMenu)}
              title="Images and Stamps Gallery"
              className="p-2 rounded-xl text-dark-400 hover:text-dark-200 hover:bg-white/5 transition-all flex items-center gap-1.5"
            >
              <Image size={16} />
              <span className="text-xs font-semibold hidden lg:inline">Images</span>
              <ChevronDown size={11} className="opacity-60" />
            </button>

            {showStampMenu && (
              <div className="absolute top-full left-0 mt-2 w-52 bg-dark-900 border border-white/10 rounded-xl shadow-glow p-1.5 flex flex-col gap-1 z-50">
                <button
                  onClick={() => {
                    triggerImageUpload();
                    setShowStampMenu(false);
                  }}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold bg-brand-500 text-white hover:bg-brand-600 transition-all w-full mb-1"
                >
                  <Image size={13} />
                  <span>Insert New Image</span>
                </button>

                <div className="text-[10px] font-bold text-dark-500 uppercase px-2 py-1 tracking-widest border-b border-white/5 mb-1">
                  Preset Stamps
                </div>
                {savedStamps.map((stamp) => (
                  <button
                    key={stamp.id}
                    onClick={() => handleAddStamp(stamp)}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-dark-300 hover:bg-white/5 hover:text-white transition-all text-left border border-white/5"
                  >
                    <span className="font-bold font-mono tracking-wider text-[11px]" style={{ color: stamp.color }}>
                      {stamp.subject}
                    </span>
                    <span className="text-[9px] text-dark-500 font-mono">{stamp.dateTime}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Signatures Tool */}
          <button
            onClick={openSignatureModal}
            title="Place Electronic Signatures"
            className={`p-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTool === 'signature' ? 'bg-brand-500 text-white shadow-glow-sm' : 'text-dark-400 hover:text-dark-200 hover:bg-white/5'
            }`}
          >
            <FileSignature size={16} />
            <span className="text-xs font-semibold hidden lg:inline">Sign</span>
          </button>

          {/* Whiteout / Erase Tool */}
          <button
            onClick={() => setActiveTool('whiteout')}
            title="Erase underlying contents safely"
            className={`p-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTool === 'whiteout' ? 'bg-brand-500 text-white shadow-glow-sm' : 'text-dark-400 hover:text-dark-200 hover:bg-white/5'
            }`}
          >
            <Eraser size={16} />
            <span className="text-xs font-semibold hidden lg:inline">Whiteout</span>
          </button>

          {/* Annotations Sub-tool dropdown */}
          <div className="relative" ref={annotateMenuRef}>
            <button
              onClick={() => {
                setActiveTool('annotate');
                setShowAnnotateMenu(!showAnnotateMenu);
              }}
              title="Annotations tools"
              className={`p-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTool === 'annotate' ? 'bg-brand-500 text-white shadow-glow-sm' : 'text-dark-400 hover:text-dark-200 hover:bg-white/5'
              }`}
            >
              <PenLine size={16} />
              <span className="text-xs font-semibold hidden lg:inline">Annotate</span>
              <ChevronDown size={11} className="opacity-60" />
            </button>

            {showAnnotateMenu && (
              <div className="absolute top-full left-0 mt-2 w-44 bg-dark-900 border border-white/10 rounded-xl shadow-glow p-1.5 flex flex-col gap-0.5 z-50">
                {[
                  { id: 'highlight', label: 'Highlight Brush', tool: 'annotate' },
                  { id: 'pen', label: 'Free Draw Pen', tool: 'annotate' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTool(item.id);
                      setShowAnnotateMenu(false);
                    }}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all text-left ${
                      activeTool === item.id ? 'bg-brand-500/20 text-brand-400' : 'text-dark-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <PenLine size={13} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Shapes selector */}
          <div className="relative" ref={shapeMenuRef}>
            <button
              onClick={() => {
                if (activeTool === 'shape') {
                  setShowShapeMenu(!showShapeMenu);
                } else {
                  setActiveTool('shape');
                }
              }}
              title="Geometric shapes"
              className={`p-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTool === 'shape' ? 'bg-brand-500 text-white shadow-glow-sm' : 'text-dark-400 hover:text-dark-200 hover:bg-white/5'
              }`}
            >
              <ActiveShapeIcon size={16} />
              <span className="text-xs font-semibold hidden lg:inline">Shape</span>
              <ChevronDown size={11} className="opacity-60" />
            </button>

            {showShapeMenu && (
              <div className="absolute top-full left-0 mt-2 w-40 bg-dark-900 border border-white/10 rounded-xl shadow-glow p-1.5 flex flex-col gap-0.5 z-50">
                {[
                  { id: 'rect', label: 'Rectangle', icon: Square },
                  { id: 'circle', label: 'Circle', icon: Circle },
                  { id: 'line', label: 'Line', icon: Minus },
                  { id: 'arrow', label: 'Arrow', icon: MoveRight },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => selectShape(s.id)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      shapeType === s.id && activeTool === 'shape'
                        ? 'bg-brand-500/20 text-brand-400'
                        : 'text-dark-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <s.icon size={13} />
                      <span>{s.label}</span>
                    </div>
                    {shapeType === s.id && <Check size={11} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Find and replace */}
          <button
            onClick={() => setActiveTool(activeTool === 'find-replace' ? 'select' : 'find-replace')}
            className={`p-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTool === 'find-replace' ? 'bg-brand-500 text-white shadow-glow-sm' : 'text-dark-400 hover:text-dark-200 hover:bg-white/5'
            }`}
            title="Find and replace text"
          >
            <CaseSensitive size={16} />
            <span className="text-xs font-semibold hidden lg:inline">Find & Replace</span>
          </button>
        </div>

        {/* Middle: Undo / Redo / Forms submode toggles */}
        <div className="flex items-center gap-3">
          {(activeTool === 'form-add' || activeTool === 'form-fill') && (
            <div className="flex items-center gap-0.5 bg-white/[0.03] border border-white/5 p-0.5 rounded-xl">
              <button
                onClick={() => {
                  setActiveTool('form-add');
                  setFormSubMode('add');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  formSubMode === 'add' ? 'bg-white/10 text-white' : 'text-dark-400 hover:text-dark-200'
                }`}
              >
                Add Fields
              </button>
              <button
                onClick={() => {
                  setActiveTool('form-fill');
                  setFormSubMode('fill');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  formSubMode === 'fill' ? 'bg-white/10 text-white' : 'text-dark-400 hover:text-dark-200'
                }`}
              >
                Fill Form
              </button>
            </div>
          )}

          <div className="flex items-center gap-1 border-l border-white/5 pl-3">
            <button
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:hover:bg-transparent transition-all"
            >
              <Undo size={16} />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
              className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:hover:bg-transparent transition-all"
            >
              <Redo size={16} />
            </button>
          </div>
        </div>

        {/* Right side: Zoom / Apply / Export */}
        <div className="flex items-center gap-3.5">
          {/* Zoom */}
          <div className="flex items-center gap-1 bg-white/[0.03] border border-white/5 px-2 py-1 rounded-xl">
            <button
              onClick={() => setZoom(Math.max(0.4, zoom - 0.1))}
              className="p-1 hover:bg-white/5 rounded-lg text-dark-400 hover:text-white transition-colors"
            >
              <ZoomOut size={13} />
            </button>
            <span className="text-xs font-mono font-bold w-12 text-center text-dark-300">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(Math.min(2.5, zoom + 0.1))}
              className="p-1 hover:bg-white/5 rounded-lg text-dark-400 hover:text-white transition-colors"
            >
              <ZoomIn size={13} />
            </button>
          </div>

          {/* Apply changes & Export */}
          <button
            onClick={handleExport}
            disabled={exporting || loading}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-brand-500 hover:bg-brand-600 text-white transition-all shadow-glow-sm flex items-center gap-1.5 h-9 select-none"
          >
            {exporting ? (
              <>
                <Loader size={14} className="animate-spin" />
                <span>Apply Changes...</span>
              </>
            ) : (
              <>
                <Download size={14} />
                <span>Apply Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
      {/* ── Find & Replace expandable panel ──────────────────────────────── */}
      <AnimatePresence>
        {activeTool === 'find-replace' && <FindReplacePanel />}
      </AnimatePresence>
    </div>
  );
}
