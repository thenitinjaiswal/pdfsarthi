'use client';

import { useEditor } from '../context/EditorContext';
import { 
  MousePointer, Type, Image, PenLine, Highlighter, 
  Eraser, FileSignature, Undo, Redo, ZoomIn, ZoomOut, 
  Download, Loader, Square, Circle, Minus, MoveRight, ChevronDown, Check, CaseSensitive
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function FloatingToolbar({ handleExport, openSignatureModal, triggerImageUpload }) {
  const {
    activeTool, setActiveTool,
    canUndo, canRedo, undo, redo,
    zoom, setZoom,
    exporting, loading,
    shapeType, setShapeType
  } = useEditor();

  const [showShapeMenu, setShowShapeMenu] = useState(false);
  const shapeMenuRef = useRef(null);

  // Close shapes dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (shapeMenuRef.current && !shapeMenuRef.current.contains(e.target)) {
        setShowShapeMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectShape = (type) => {
    setShapeType(type);
    setActiveTool('shape');
    setShowShapeMenu(false);
  };

  const shapeIcons = {
    rect: Square,
    circle: Circle,
    line: Minus,
    arrow: MoveRight
  };

  const ActiveShapeIcon = shapeIcons[shapeType] || Square;

  const tools = [
    { id: 'select', label: 'Select / Move', icon: MousePointer },
    { id: 'edit-text', label: 'Edit Text', icon: CaseSensitive },
    { id: 'add-text', label: 'Add Text', icon: Type },
    { id: 'whiteout', label: 'Whiteout', icon: Eraser },
    { id: 'draw', label: 'Draw', icon: PenLine },
    { id: 'highlight', label: 'Highlight', icon: Highlighter },
  ];

  return (
    <div className="w-full bg-dark-950/85 backdrop-blur-md border-b border-white/5 px-6 py-2.5 flex items-center justify-between shrink-0 select-none z-40">
      {/* Left side: Tool Tabs */}
      <div className="flex items-center gap-1 bg-white/[0.03] border border-white/5 p-1 rounded-xl">
        {tools.map((t) => {
          const Icon = t.icon;
          const isActive = activeTool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTool(t.id)}
              title={t.label}
              className={`p-2 rounded-lg transition-all flex items-center gap-1.5 ${
                isActive 
                  ? 'bg-brand-500 text-white shadow-glow-sm scale-102' 
                  : 'text-dark-400 hover:text-dark-200 hover:bg-white/5'
              }`}
            >
              <Icon size={16} />
              <span className="text-xs font-semibold hidden md:inline">{t.label}</span>
            </button>
          );
        })}

        {/* Shapes Multi-Tool */}
        <div className="relative" ref={shapeMenuRef}>
          <button
            onClick={() => {
              if (activeTool === 'shape') {
                setShowShapeMenu(!showShapeMenu);
              } else {
                setActiveTool('shape');
              }
            }}
            title="Shapes Tool"
            className={`p-2 rounded-lg transition-all flex items-center gap-1 ${
              activeTool === 'shape'
                ? 'bg-brand-500 text-white shadow-glow-sm'
                : 'text-dark-400 hover:text-dark-200 hover:bg-white/5'
            }`}
          >
            <ActiveShapeIcon size={16} />
            <span className="text-xs font-semibold hidden md:inline">Shape</span>
            <ChevronDown size={12} className="opacity-60" />
          </button>

          {showShapeMenu && (
            <div className="absolute top-full left-0 mt-1.5 w-40 bg-dark-900 border border-white/8 rounded-xl shadow-glow-sm p-1.5 flex flex-col gap-0.5 z-50">
              {[
                { id: 'rect', label: 'Rectangle', icon: Square },
                { id: 'circle', label: 'Circle', icon: Circle },
                { id: 'line', label: 'Line', icon: Minus },
                { id: 'arrow', label: 'Arrow', icon: MoveRight },
              ].map((s) => {
                const SIcon = s.icon;
                const isSelected = shapeType === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => selectShape(s.id)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isSelected 
                        ? 'bg-brand-500/20 text-brand-400' 
                        : 'text-dark-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <SIcon size={14} />
                      <span>{s.label}</span>
                    </div>
                    {isSelected && <Check size={12} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Media Inserts */}
        <button
          onClick={triggerImageUpload}
          title="Add Image"
          className={`p-2 rounded-lg transition-all flex items-center gap-1.5 text-dark-400 hover:text-dark-200 hover:bg-white/5`}
        >
          <Image size={16} />
          <span className="text-xs font-semibold hidden md:inline">Add Image</span>
        </button>

        <button
          onClick={openSignatureModal}
          title="Add Signature"
          className={`p-2 rounded-lg transition-all flex items-center gap-1.5 text-dark-400 hover:text-dark-200 hover:bg-white/5`}
        >
          <FileSignature size={16} />
          <span className="text-xs font-semibold hidden md:inline">Sign PDF</span>
        </button>
      </div>

      {/* Middle: Undo / Redo */}
      <div className="flex items-center gap-1">
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

      {/* Right side: Zoom & Export */}
      <div className="flex items-center gap-4">
        {/* Zoom */}
        <div className="flex items-center gap-1.5 bg-white/[0.02] border border-white/5 px-2 py-1 rounded-xl">
          <button
            onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
            className="p-1 hover:bg-white/5 rounded text-dark-400 hover:text-white transition-colors"
          >
            <ZoomOut size={14} />
          </button>
          <span className="text-xs font-mono font-bold w-12 text-center text-dark-300">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(Math.min(2.5, zoom + 0.1))}
            className="p-1 hover:bg-white/5 rounded text-dark-400 hover:text-white transition-colors"
          >
            <ZoomIn size={14} />
          </button>
        </div>

        {/* Action Button */}
        <button
          onClick={handleExport}
          disabled={exporting || loading}
          className="btn-primary px-4 py-2 text-xs rounded-xl shadow-glow-sm flex items-center gap-1.5 h-9"
        >
          {exporting ? (
            <>
              <Loader size={14} className="animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Download size={14} />
              <span>Export PDF</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
