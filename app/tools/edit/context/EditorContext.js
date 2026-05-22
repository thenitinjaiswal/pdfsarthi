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
  
  // File state
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1.0); // 1.0 = 100%
  const [activeTool, setActiveTool] = useState('select'); // 'select', 'edit-text', 'add-text', 'whiteout', 'image', 'signature', 'draw', 'highlight', 'shape'
  
  // Document metadata per page
  // Array of { pageNum: number, width: number, height: number, originalTextItems: [...], annotations: [...] }
  const [pagesData, setPagesData] = useState([]);
  
  // Active selection state
  const [selectedElement, setSelectedElement] = useState(null); // { pageNum, type: 'annotation'|'text-item', id }
  
  // Shared properties for newly created elements
  const [color, setColor] = useState('#000000');
  const [fontSize, setFontSize] = useState(14);
  const [fontFamily, setFontFamily] = useState('Helvetica');
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [shapeType, setShapeType] = useState('rect'); // 'rect', 'circle', 'line', 'arrow'
  
  // History stacks
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Clipboard
  const [clipboard, setClipboard] = useState(null);

  // Sync state changes with history
  const pushHistory = useCallback((newPagesData) => {
    // Clone state to prevent mutations
    const cloned = JSON.parse(JSON.stringify(newPagesData));
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(cloned);
    
    // Cap history size to 50
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

  // Keybindings listener helper
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore keybindings when editing a text field
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

  // Reset editor state
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
  };

  // Setup initial pages data
  const initializePages = (pages) => {
    setPagesData(pages);
    setHistory([JSON.parse(JSON.stringify(pages))]);
    setHistoryIndex(0);
  };

  // Add annotation to a page
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
      strokeWidth,
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

  // Update specific annotation details
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

  // Commit updates to history (e.g. after drag-end or font-change)
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

  // Edit existing extracted text item
  // `updates` may include `edited` explicitly (e.g. false when text unchanged).
  // If not provided, default to true so existing call-sites that don't pass `edited` still work.
  const updateTextItem = (pageNum, textItemId, updates) => {
    const editedValue = updates.hasOwnProperty('edited') ? updates.edited : true;
    const updated = pagesData.map(page => {
      if (page.pageNum === pageNum) {
        return {
          ...page,
          originalTextItems: page.originalTextItems.map(item =>
            item.id === textItemId
              ? { ...item, ...updates, edited: editedValue }
              : item
          )
        };
      }
      return page;
    });
    updatePagesDataWithHistory(updated);
  };

  // Background analysis color detection updates
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

  // Delete selected annotation or reset text item
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
      // Revert edited text back to original
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

  // Duplicate an annotation
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

  // Page manipulation
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

  const reorderPages = (activeId, overId) => {
    if (activeId === overId) return;
    
    const activeIdx = pagesData.findIndex(p => p.pageNum === activeId);
    const overIdx = pagesData.findIndex(p => p.pageNum === overId);
    
    if (activeIdx === -1 || overIdx === -1) return;
    
    const updated = [...pagesData];
    const [movedPage] = updated.splice(activeIdx, 1);
    updated.splice(overIdx, 0, movedPage);
    
    // Re-index pages
    const reindexed = updated.map((p, idx) => ({ ...p, pageNum: idx + 1 }));
    
    updatePagesDataWithHistory(reindexed);
    toast.success('Pages reordered');
  };

  const value = {
    file, setFile,
    loading, setLoading,
    exporting, setExporting,
    pageCount, setPageCount,
    currentPage, setCurrentPage,
    zoom, setZoom,
    activeTool, setActiveTool,
    pagesData, setPagesData,
    selectedElement, setSelectedElement,
    color, setColor,
    fontSize, setFontSize,
    fontFamily, setFontFamily,
    bold, setBold,
    italic, setItalic,
    strokeWidth, setStrokeWidth,
    shapeType, setShapeType,
    undo, redo,
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
    reorderPages
  };

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
}
