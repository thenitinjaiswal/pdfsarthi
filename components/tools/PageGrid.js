'use client';

import { motion } from 'framer-motion';
import { Check, Trash2, RotateCw } from 'lucide-react';

/**
 * PageGrid Component
 * Displays a grid of PDF page thumbnails with hover actions.
 * @param {Array} pages - Array of { pageNumber, dataUrl }
 * @param {Array} selected - Array of selected page numbers
 * @param {Function} onSelect - (pageNum) => void
 * @param {Function} onDelete - (pageNum) => void
 * @param {Function} onRotate - (pageNum) => void
 * @param {string} mode - 'select' | 'organize'
 */
export default function PageGrid({
  pages,
  selected = [],
  onSelect,
  onDelete,
  onRotate,
  mode = 'select'
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {pages.map((page, i) => {
        const isSelected = selected.includes(page.pageNumber);
        
        return (
          <motion.div
            key={page.pageNumber}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.02 }}
            onClick={() => onSelect && onSelect(page.pageNumber)}
            className={`relative group aspect-[3/4] rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
              isSelected ? 'border-brand-500 shadow-glow-sm' : 'border-white/10 hover:border-brand-500/50'
            }`}
          >
            {/* Thumbnail */}
            <img 
              src={page.dataUrl} 
              alt={`Page ${page.pageNumber}`} 
              className="w-full h-full object-cover bg-white" 
            />
            
            {/* Overlay */}
            <div className={`absolute inset-0 transition-colors ${
              isSelected ? 'bg-brand-500/10' : 'bg-black/0 group-hover:bg-black/20'
            }`} />

            {/* Page Number Badge */}
            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-[10px] font-bold text-white shadow-sm">
              {page.pageNumber}
            </div>

            {/* Select Indicator */}
            {mode === 'select' && (
              <div className={`absolute top-2 right-2 w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                isSelected ? 'bg-brand-500 border-brand-500 text-white' : 'border-white/50 bg-black/20 text-transparent group-hover:border-white'
              }`}>
                <Check size={12} strokeWidth={3} />
              </div>
            )}

            {/* Organize Actions */}
            {mode === 'organize' && (
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {onRotate && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onRotate(page.pageNumber); }}
                    className="w-6 h-6 rounded-md bg-dark-800/90 text-dark-300 hover:text-white flex items-center justify-center backdrop-blur-sm"
                  >
                    <RotateCw size={12} />
                  </button>
                )}
                {onDelete && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(page.pageNumber); }}
                    className="w-6 h-6 rounded-md bg-red-500/90 text-white hover:bg-red-600 flex items-center justify-center backdrop-blur-sm"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
