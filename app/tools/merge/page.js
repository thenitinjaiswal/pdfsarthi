'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FilePlus2, Download, Trash2, Loader, GripVertical, FileText, X } from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import ToolHeader from '@/components/tools/ToolHeader';
import UploadZone from '@/components/tools/UploadZone';
import { useToast } from '@/hooks/useToast';
import { mergePDFs, renderPageThumbnail } from '@/lib/pdf-service';
import { formatSize, downloadBlob } from '@/lib/utils';

// Sortable item wrapper
function SortableFile({ id, file, thumbnail, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 1 };

  return (
    <div ref={setNodeRef} style={style}
      className={`relative group flex items-center gap-3 p-3 rounded-xl border bg-dark-900/50 backdrop-blur-sm transition-all
        ${isDragging ? 'border-brand-500 shadow-glow' : 'border-white/8 hover:border-white/15'}`}>
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1.5 text-dark-600 hover:text-white transition-colors">
        <GripVertical size={16} />
      </button>
      
      <div className="w-12 h-16 rounded overflow-hidden bg-white/5 border border-white/10 shrink-0 flex items-center justify-center">
        {thumbnail ? (
          <img src={thumbnail} alt="cover" className="w-full h-full object-cover" />
        ) : (
          <FileText size={20} className="text-brand-400" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-dark-200 truncate">{file.name}</p>
        <p className="text-xs text-dark-500">{formatSize(file.size)}</p>
      </div>
      <button onClick={() => onRemove(id)} className="p-2 text-dark-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100">
        <X size={16} />
      </button>
    </div>
  );
}

export default function MergePDFPage() {
  const [files, setFiles] = useState([]); // { id, file, thumbnail }
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleFiles = async (newFiles) => {
    // Add placeholders first, then asynchronously load thumbnails so UI doesn't freeze
    const mapped = newFiles.map(f => ({ id: Math.random().toString(36).substring(2, 9), file: f, thumbnail: null }));
    setFiles(prev => [...prev, ...mapped]);

    for (const item of mapped) {
      try {
        const thumb = await renderPageThumbnail(item.file, 1, 0.2);
        setFiles(prev => prev.map(p => p.id === item.id ? { ...p, thumbnail: thumb } : p));
      } catch (err) {
        console.error('Thumbnail failed for', item.file.name);
      }
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setFiles((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const removeFile = (id) => setFiles(prev => prev.filter(f => f.id !== id));

  const handleMerge = async () => {
    if (files.length < 2) { toast.warning('Add at least 2 files to merge.'); return; }
    setLoading(true);
    try {
      await mergePDFs(files.map(f => f.file));
      toast.success('Merge complete!');
    } catch (err) {
      toast.error('Merge failed. Try again.');
      console.error(err);
    } finally { setLoading(false); }
  };

  return (
    <div>
      <ToolHeader icon={FilePlus2} title="Merge PDF"
        description="Combine multiple PDFs in the exact order you want. Drag and drop to reorder." />

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Upload & Reorder */}
        <div className="space-y-4">
          <UploadZone onFiles={handleFiles} accept=".pdf" label="Add more files" compact={files.length > 0} multiple />
          
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={files.map(f => f.id)} strategy={rectSortingStrategy}>
              <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scroll pr-2">
                <AnimatePresence>
                  {files.map((item) => (
                    <motion.div key={item.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}>
                      <SortableFile id={item.id} file={item.file} thumbnail={item.thumbnail} onRemove={removeFile} />
                    </motion.div>
                  ))}
                </AnimatePresence>
                {files.length === 0 && (
                  <div className="text-center py-12 glass rounded-2xl border-dashed">
                    <p className="text-sm text-dark-500">No files added yet.</p>
                  </div>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Action Card */}
        <div className="flex flex-col gap-4">
          <div className="glass rounded-2xl p-6 flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-500/15 flex items-center justify-center mb-4">
              <FilePlus2 size={28} className="text-brand-400" />
            </div>
            <h3 className="text-lg font-bold text-dark-300 mb-2">Merge {files.length || ''} files</h3>
            <p className="text-sm text-dark-500 max-w-xs">
              {files.length < 2 
                ? 'You need at least 2 files to perform a merge.' 
                : 'Your files are ready. Reorder them using the drag handles on the left.'}
            </p>
          </div>
          <button onClick={handleMerge} disabled={files.length < 2 || loading} className="btn-action">
            {loading ? <><Loader size={18} className="animate-spin" /> Merging...</> : <><Download size={18} /> Merge PDFs</>}
          </button>
        </div>
      </div>
    </div>
  );
}
