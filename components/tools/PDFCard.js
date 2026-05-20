'use client';

import { motion } from 'framer-motion';
import { FileText, X, Eye, GripVertical } from 'lucide-react';
import { formatSize } from '@/lib/utils';

/**
 * PDFCard — displays a single PDF file with actions.
 * Props: file, index, onRemove, onPreview, selected, onSelect, showIndex, draggable
 */
export default function PDFCard({
  file,
  index = 0,
  onRemove,
  onPreview,
  selected,
  onSelect,
  showIndex = false,
  draggable = false,
  dragHandleProps = {},
}) {
  const name = file?.name || 'Unknown.pdf';
  const size = file?.size || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      onClick={() => onSelect?.(file)}
      className={`
        file-card card-hover rounded-xl p-3.5 flex items-center gap-3 cursor-pointer group
        ${selected ? 'border-brand-500/40 bg-brand-500/5' : ''}
      `}>

      {/* Drag handle */}
      {draggable && (
        <button {...dragHandleProps}
          className="text-dark-700 hover:text-dark-400 cursor-grab active:cursor-grabbing
            p-1 -ml-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical size={14} />
        </button>
      )}

      {/* Index badge */}
      {showIndex && (
        <div className="w-5 h-5 rounded-full bg-dark-700 border border-white/10
          flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-bold text-dark-300">{index + 1}</span>
        </div>
      )}

      {/* Icon */}
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0
        ${selected ? 'bg-brand-500/20' : 'bg-dark-800'}`}>
        <FileText size={18} className={selected ? 'text-brand-400' : 'text-dark-400'} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-dark-100 truncate">{name}</p>
        <p className="text-xs text-dark-500 mt-0.5">{formatSize(size)}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onPreview && (
          <button
            onClick={e => { e.stopPropagation(); onPreview(file); }}
            className="btn-ghost p-1.5 rounded-lg" title="Preview">
            <Eye size={13} className="text-dark-400 hover:text-brand-400" />
          </button>
        )}
        {onRemove && (
          <button
            onClick={e => { e.stopPropagation(); onRemove(file); }}
            className="btn-ghost p-1.5 rounded-lg hover:bg-red-500/10" title="Remove">
            <X size={13} className="text-dark-400 hover:text-red-400" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
