'use client';

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { uid } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';

const EditorContext = createContext(null);

export function useEditor() {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
}

export function EditorProvider({ children }) {
  const toast = useToast();

  // ── File & Page Core States ────────────────────────────────────────────────
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1.0); // 1.0 = 100%
  const [activeTool, setActiveTool] = useState('select'); // 'select', 'edit-text', 'add-text', 'find-replace', 'link', 'form-add', 'form-fill', 'signature', 'whiteout', 'annotate', 'shape', 'image'
  const [formSubMode, setFormSubMode] = useState('add'); // 'add' or 'fill'
  
  // Document metadata per page
  // Array of { pageNum: number, width: number, height: number, rotation: number, originalTextItems: [...], annotations: [...] }
  const [pagesData, setPagesData] = useState([]);
  
  // Active selection state
  const [selectedElement, setSelectedElement] = useState(null); // { pageNum, type: 'annotation'|'text-item', id }
  
  // ── Element Properties ──────────────────────────────────────────────────────
  const [color, setColor] = useState('#000000');
  const [fontSize, setFontSize] = useState(14);
  const [fontFamily, setFontFamily] = useState('Helvetica');
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [underline, setUnderline] = useState(false);
  const [alignment, setAlignment] = useState('left');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [shapeType, setShapeType] = useState('rect'); // 'rect', 'circle', 'line', 'arrow'
  const [recentColors, setRecentColors] = useState(['#000000', '#ffffff', '#ef4444', '#3b82f6', '#10b981']);

  // ── Signatures & Stamps bank ────────────────────────────────────────────────
  const [savedSignatures, setSavedSignatures] = useState([]); // array of { id, type: 'draw'|'type'|'upload', dataUrl, text, font }
  const [savedStamps, setSavedStamps] = useState([
    { id: 'stamp-1', subject: 'APPROVED', author: 'EDITOR', dateTime: new Date().toLocaleDateString(), color: '#10b981' },
    { id: 'stamp-2', subject: 'REJECTED', author: 'EDITOR', dateTime: new Date().toLocaleDateString(), color: '#ef4444' },
    { id: 'stamp-3', subject: 'DRAFT', author: 'EDITOR', dateTime: new Date().toLocaleDateString(), color: '#f59e0b' }
  ]);

  // ── Find & Replace State ───────────────────────────────────────────────────
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [includeLinks, setIncludeLinks] = useState(false);

  // ── Alerts & Warnings ──────────────────────────────────────────────────────
  const [browserZoomAlert, setBrowserZoomAlert] = useState(false);
  const [scannedDocWarning, setScannedDocWarning] = useState(false);
  const [xfaWarning, setXfaWarning] = useState(false);

  // ── Font Replacement Dialog ────────────────────────────────────────────────
  const [fontReplacementOpen, setFontReplacementOpen] = useState(false);
  const [missingFontName, setMissingFontName] = useState('');
  const [replacementFontName, setReplacementFontName] = useState('Helvetica');
  const [alwaysReplaceFont, setAlwaysReplaceFont] = useState(false);

  // ── Undo / Redo stacks ──────────────────────────────────────────────────────
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Monitor browser zoom level to warn user
  useEffect(() => {
    const checkZoom = () => {
      // Modern browsers: ratio of device pixel ratio
      const ratio = window.devicePixelRatio;
      if (Math.abs(ratio - 1.0) > 0.15) {
        setBrowserZoomAlert(true);
      } else {
        setBrowserZoomAlert(false);
      }
    };
    checkZoom();
    window.addEventListener('resize', checkZoom);
    return () => window.removeEventListener('resize', checkZoom);
  }, []);

  // Sync state changes with history
  const pushHistory = useCallback((newPagesData) => {
    const cloned = JSON.parse(JSON.stringify(newPagesData));
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(cloned);
    
    if (nextHistory.length > 50) {
      nextHistory.shift();
    }
    
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
  }, [history, historyIndex]);

  const updatePagesDataWithHistory = useCallback((newData) => {
    setPagesData(newData);
    pushHistory(newData);
  }, [pushHistory]);

  // Undo / Redo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setPagesData(JSON.parse(JSON.stringify(history[prevIndex])));
      setSelectedElement(null);
      toast.info('Undo action');
    }
  }, [history, historyIndex, toast]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setPagesData(JSON.parse(JSON.stringify(history[nextIndex])));
      setSelectedElement(null);
      toast.info('Redo action');
    }
  }, [history, historyIndex, toast]);

  // Revert selected element only
  const revertSelected = () => {
    if (!selectedElement) return;
    const { pageNum, type, id } = selectedElement;
    if (type === 'text-item') {
      updateTextItem(pageNum, id, { newText: null, edited: false });
      toast.success('Reverted text item to original state');
    } else if (type === 'annotation') {
      deleteSelectedElement();
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT' || 
          document.activeElement.tagName === 'TEXTAREA' || 
          document.activeElement.getAttribute('contenteditable') === 'true') {
        return;
      }
      
      const isCtrl = e.ctrlKey || e.metaKey;
      
      if (isCtrl && e.key === 'z') {
        e.preventDefault();
        undo();
      } else if (isCtrl && e.key === 'y') {
        e.preventDefault();
        redo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElement) {
          e.preventDefault();
          deleteSelectedElement();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, selectedElement]);

  const resetEditor = () => {
    setFile(null);
    setPagesData([]);
    setPageCount(0);
    setCurrentPage(1);
    setZoom(1.0);
    setActiveTool('select');
    setSelectedElement(null);
    setHistory([]);
    setHistoryIndex(-1);
    setSavedSignatures([]);
    setScannedDocWarning(false);
    setXfaWarning(false);
  };

  const initializePages = (pages) => {
    setPagesData(pages);
    setHistory([JSON.parse(JSON.stringify(pages))]);
    setHistoryIndex(0);
  };

  // ── Annotations Manipulation ───────────────────────────────────────────────
  const addAnnotation = (pageNum, annotationData) => {
    const newAnn = {
      id: uid(),
      x: 100,
      y: 100,
      width: 150,
      height: 40,
      color,
      fontSize,
      fontFamily,
      bold,
      italic,
      underline,
      strokeWidth,
      opacity: 1.0,
      alignment,
      ...annotationData
    };
    
    const updated = pagesData.map(page => {
      if (page.pageNum === pageNum) {
        return {
          ...page,
          annotations: [...(page.annotations || []), newAnn]
        };
      }
      return page;
    });
    
    updatePagesDataWithHistory(updated);
    setSelectedElement({ pageNum, type: 'annotation', id: newAnn.id });
    return newAnn.id;
  };

  const updateAnnotation = (pageNum, annId, updates) => {
    const updated = pagesData.map(page => {
      if (page.pageNum === pageNum) {
        return {
          ...page,
          annotations: page.annotations.map(ann => 
            ann.id === annId ? { ...ann, ...updates } : ann
          )
        };
      }
      return page;
    });
    setPagesData(updated);
  };

  const commitAnnotationUpdate = (pageNum, annId, updates) => {
    const updated = pagesData.map(page => {
      if (page.pageNum === pageNum) {
        return {
          ...page,
          annotations: page.annotations.map(ann => 
            ann.id === annId ? { ...ann, ...updates } : ann
          )
        };
      }
      return page;
    });
    updatePagesDataWithHistory(updated);
  };

  // ── Text Items Manipulation ─────────────────────────────────────────────────
  const updateTextItem = (pageNum, textItemId, updates) => {
    const editedValue = updates.hasOwnProperty('edited') ? updates.edited : true;
    const updated = pagesData.map(page => {
      if (page.pageNum === pageNum) {
        return {
          ...page,
          originalTextItems: page.originalTextItems.map(item => {
            if (item.id === textItemId) {
              const baseText = updates.newText === null ? item.originalText : (updates.newText !== undefined ? updates.newText : item.newText);
              return { ...item, ...updates, newText: baseText, edited: editedValue };
            }
            return item;
          })
        };
      }
      return page;
    });
    updatePagesDataWithHistory(updated);
  };

  const updateTextItemsColors = (pageNum, colorUpdates) => {
    setPagesData(prevPagesData => prevPagesData.map(page => {
      if (page.pageNum === pageNum) {
        return {
          ...page,
          originalTextItems: page.originalTextItems.map(item => {
            const update = colorUpdates[item.id];
            if (update) {
              return {
                ...item,
                bgColor: update.bgColor,
                color: item.edited ? item.color : update.color,
                underline: item.edited ? item.underline : (update.underline || item.underline || false),
                colorsDetected: true,
                confident: update.confident
              };
            }
            return item;
          })
        };
      }
      return page;
    }));
  };

  // ── Deleting / Reordering ──────────────────────────────────────────────────
  const deleteSelectedElement = () => {
    if (!selectedElement) return;
    const { pageNum, type, id } = selectedElement;
    
    if (type === 'annotation') {
      const updated = pagesData.map(page => {
        if (page.pageNum === pageNum) {
          return {
            ...page,
            annotations: page.annotations.filter(ann => ann.id !== id)
          };
        }
        return page;
      });
      updatePagesDataWithHistory(updated);
      toast.success('Annotation deleted');
    } else if (type === 'text-item') {
      const updated = pagesData.map(page => {
        if (page.pageNum === pageNum) {
          return {
            ...page,
            originalTextItems: page.originalTextItems.map(item => 
              item.id === id ? { ...item, edited: false, newText: item.str } : item
            )
          };
        }
        return page;
      });
      updatePagesDataWithHistory(updated);
      toast.success('Text item reverted');
    }
    
    setSelectedElement(null);
  };

  const duplicateAnnotation = (pageNum, annId) => {
    const page = pagesData.find(p => p.pageNum === pageNum);
    if (!page) return;
    const ann = page.annotations.find(a => a.id === annId);
    if (!ann) return;
    
    const duplicate = {
      ...ann,
      id: uid(),
      x: ann.x + 20,
      y: ann.y + 20
    };
    
    const updated = pagesData.map(p => {
      if (p.pageNum === pageNum) {
        return {
          ...p,
          annotations: [...p.annotations, duplicate]
        };
      }
      return p;
    });
    
    updatePagesDataWithHistory(updated);
    setSelectedElement({ pageNum, type: 'annotation', id: duplicate.id });
    toast.success('Annotation duplicated');
  };

  // ── Page Management Handlers ───────────────────────────────────────────────
  const deletePage = (pageNum) => {
    if (pagesData.length <= 1) {
      toast.error('Cannot delete the last page.');
      return;
    }
    
    const updated = pagesData
      .filter(p => p.pageNum !== pageNum)
      .map((p, idx) => ({ ...p, pageNum: idx + 1 }));
    
    setPageCount(updated.length);
    updatePagesDataWithHistory(updated);
    
    if (currentPage > updated.length) {
      setCurrentPage(updated.length);
    }
    setSelectedElement(null);
    toast.success(`Page ${pageNum} deleted`);
  };

  const rotatePage = (pageNum, degrees = 90) => {
    const updated = pagesData.map(p => {
      if (p.pageNum === pageNum) {
        return {
          ...p,
          rotation: ((p.rotation || 0) + degrees) % 360
        };
      }
      return p;
    });
    updatePagesDataWithHistory(updated);
    toast.success(`Page ${pageNum} rotated`);
  };

  const insertBlankPage = (pageNum, position = 'after') => {
    const pageIndex = pagesData.findIndex(p => p.pageNum === pageNum);
    if (pageIndex === -1) return;

    const referencePage = pagesData[pageIndex];
    const newPage = {
      pageNum: 0, // temporary index
      originalPageNum: -1, // -1 denotes a new blank page
      width: referencePage.width,
      height: referencePage.height,
      rotation: 0,
      originalTextItems: [],
      annotations: []
    };

    const updated = [...pagesData];
    const insertIdx = position === 'after' ? pageIndex + 1 : pageIndex;
    updated.splice(insertIdx, 0, newPage);

    // Re-index all pages
    const reindexed = updated.map((p, idx) => ({ ...p, pageNum: idx + 1 }));
    setPageCount(reindexed.length);
    updatePagesDataWithHistory(reindexed);
    toast.success('Blank page inserted');
  };

  const reorderPages = (activeId, overId) => {
    if (activeId === overId) return;
    
    const activeIdx = pagesData.findIndex(p => p.pageNum === activeId);
    const overIdx = pagesData.findIndex(p => p.pageNum === overId);
    
    if (activeIdx === -1 || overIdx === -1) return;
    
    const updated = [...pagesData];
    const [movedPage] = updated.splice(activeIdx, 1);
    updated.splice(overIdx, 0, movedPage);
    
    const reindexed = updated.map((p, idx) => ({ ...p, pageNum: idx + 1 }));
    
    updatePagesDataWithHistory(reindexed);
    toast.success('Pages reordered');
  };

  const movePageToLocation = (fromPageNum, toPageNum) => {
    const fromIdx = pagesData.findIndex(p => p.pageNum === fromPageNum);
    const toIdx = Math.max(0, Math.min(pagesData.length - 1, toPageNum - 1));
    if (fromIdx === -1 || fromIdx === toIdx) return;

    const updated = [...pagesData];
    const [movedPage] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, movedPage);

    const reindexed = updated.map((p, idx) => ({ ...p, pageNum: idx + 1 }));
    updatePagesDataWithHistory(reindexed);
    toast.success(`Page ${fromPageNum} moved to position ${toPageNum}`);
  };

  const value = {
    file, setFile,
    loading, setLoading,
    exporting, setExporting,
    pageCount, setPageCount,
    currentPage, setCurrentPage,
    zoom, setZoom,
    activeTool, setActiveTool,
    formSubMode, setFormSubMode,
    pagesData, setPagesData,
    selectedElement, setSelectedElement,
    color, setColor,
    fontSize, setFontSize,
    fontFamily, setFontFamily,
    bold, setBold,
    italic, setItalic,
    underline, setUnderline,
    alignment, setAlignment,
    strokeWidth, setStrokeWidth,
    shapeType, setShapeType,
    recentColors, setRecentColors,
    savedSignatures, setSavedSignatures,
    savedStamps, setSavedStamps,
    findQuery, setFindQuery,
    replaceQuery, setReplaceQuery,
    matchCase, setMatchCase,
    includeLinks, setIncludeLinks,
    browserZoomAlert,
    scannedDocWarning, setScannedDocWarning,
    xfaWarning, setXfaWarning,
    fontReplacementOpen, setFontReplacementOpen,
    missingFontName, setMissingFontName,
    replacementFontName, setReplacementFontName,
    alwaysReplaceFont, setAlwaysReplaceFont,
    undo, redo, revertSelected,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    resetEditor,
    initializePages,
    addAnnotation,
    updateAnnotation,
    commitAnnotationUpdate,
    updateTextItem,
    updateTextItemsColors,
    deleteSelectedElement,
    duplicateAnnotation,
    deletePage,
    rotatePage,
    insertBlankPage,
    reorderPages,
    movePageToLocation
  };

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
}
