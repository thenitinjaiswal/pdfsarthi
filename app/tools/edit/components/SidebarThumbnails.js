'use client';

import { useEditor } from '../context/EditorContext';
import { Trash2, RotateCw, GripVertical } from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableThumbnail({ pageData, index, thumbnail, isActive, onClick }) {
  const { deletePage, rotatePage } = useEditor();
  const { pageNum } = pageData;
  const id = pageNum; // Use pageNum as id for dnd-kit

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={`group relative flex flex-col items-center gap-1.5 p-2 rounded-xl border bg-dark-900/40 backdrop-blur-sm cursor-pointer transition-all
        ${isActive ? 'border-brand-500 bg-brand-500/5 shadow-glow-sm' : 'border-white/5 hover:border-white/12'}
        ${isDragging ? 'opacity-50 border-brand-500' : ''}`}
    >
      {/* Drag handle */}
      <div 
        {...attributes} 
        {...listeners} 
        className="absolute top-2 left-2 cursor-grab active:cursor-grabbing p-1 text-dark-500 hover:text-white rounded bg-dark-950/80 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical size={12} />
      </div>

      {/* Mini preview */}
      <div className="w-28 h-36 rounded-lg bg-white/5 overflow-hidden flex items-center justify-center border border-white/8 relative">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={`Page ${pageNum}`}
            className="w-full h-full object-contain bg-white transition-transform"
            style={{ transform: `rotate(${pageData.rotation || 0}deg)` }}
          />
        ) : (
          <div className="flex flex-col items-center gap-1">
            <span className="w-4 h-4 rounded-full border border-dark-600 animate-spin" />
            <span className="text-[10px] text-dark-500">Loading...</span>
          </div>
        )}
        
        {/* Quick controls panel */}
        <div className="absolute inset-x-0 bottom-0 bg-dark-950/85 backdrop-blur-sm flex items-center justify-around py-1 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
          <button
            onClick={(e) => {
              e.stopPropagation();
              rotatePage(pageNum, 90);
            }}
            title="Rotate Page"
            className="p-1 hover:bg-white/10 rounded text-brand-400 hover:text-brand-300 transition-colors"
          >
            <RotateCw size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              deletePage(pageNum);
            }}
            title="Delete Page"
            className="p-1 hover:bg-red-500/10 rounded text-red-500 hover:text-red-400 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Label */}
      <span className="text-[10px] font-semibold text-dark-400">
        Page {pageNum}
      </span>
    </div>
  );
}

export default function SidebarThumbnails({ thumbnails }) {
  const { pagesData, currentPage, setCurrentPage, reorderPages } = useEditor();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderPages(Number(active.id), Number(over.id));
    }
  };

  const handlePageClick = (pageNum) => {
    setCurrentPage(pageNum);
    const element = document.getElementById(`pdf-page-card-${pageNum}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="w-36 flex flex-col border-r border-white/5 bg-dark-950/50 shrink-0 select-none">
      <div className="px-3 py-2 border-b border-white/5 bg-dark-950 flex items-center justify-between shrink-0">
        <span className="text-[10px] font-bold text-dark-400 uppercase tracking-widest">
          Thumbnails
        </span>
        <span className="text-[10px] font-bold bg-white/5 text-dark-400 px-1.5 py-0.5 rounded">
          {pagesData.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll p-3 space-y-3">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={pagesData.map(p => p.pageNum)} strategy={verticalListSortingStrategy}>
            {pagesData.map((page, index) => (
              <SortableThumbnail
                key={page.pageNum}
                pageData={page}
                index={index}
                thumbnail={thumbnails[page.pageNum]}
                isActive={currentPage === page.pageNum}
                onClick={() => handlePageClick(page.pageNum)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
