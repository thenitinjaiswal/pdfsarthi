'use client';

import { useCallback, useState, useId } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, ImageIcon, Plus, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * UploadZone — animated drag-and-drop file upload area.
 * Props:
 *  onFiles(files[])  – called with uploaded File array
 *  accept            – comma-separated MIME types or extensions
 *  multiple          – allow multiple files
 *  label             – main label text
 *  sublabel          – secondary label
 *  icon              – override icon component
 *  maxFiles          – cap number of files
 *  disabled
 *  compact           – small "add more" variant
 *  className
 */
export default function UploadZone({
  onFiles,
  accept = '.pdf',
  multiple = false,
  label,
  sublabel,
  icon: IconProp,
  maxFiles,
  disabled = false,
  compact = false,
  className = '',
}) {
  const [state, setState] = useState('idle'); // idle | dragging | done
  const inputId = useId();

  const Icon = IconProp || (accept.includes('image') ? ImageIcon : FileText);

  const handleFiles = useCallback((files) => {
    if (disabled) return;
    const arr = Array.from(files);
    const limited = maxFiles ? arr.slice(0, maxFiles) : arr;
    if (limited.length > 0) {
      setState('done');
      onFiles?.(limited);
      setTimeout(() => setState('idle'), 1500);
    }
  }, [onFiles, maxFiles, disabled]);

  const onDragOver   = (e) => { e.preventDefault(); if (!disabled) setState('dragging'); };
  const onDragLeave  = ()  => setState('idle');
  const onDrop       = (e) => { e.preventDefault(); setState('idle'); handleFiles(e.dataTransfer.files); };
  const onInputChange = (e) => { handleFiles(e.target.files); e.target.value = ''; };
  const handleClick  = () => { if (!disabled) document.getElementById(inputId)?.click(); };

  // ── Compact variant ──────────────────────────────────────
  if (compact) {
    return (
      <div className="relative">
        <motion.button
          whileHover={{ scale: disabled ? 1 : 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleClick}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          disabled={disabled}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl',
            'border-2 border-dashed text-sm font-medium transition-all',
            state === 'dragging'
              ? 'border-brand-500 bg-brand-500/8 text-brand-400'
              : 'border-white/10 text-dark-400 hover:border-brand-500/40 hover:text-brand-400 hover:bg-brand-500/5',
            disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
            className
          )}>
          <Plus size={14} />
          {label || 'Add more files'}
        </motion.button>
        <input id={inputId} type="file" accept={accept} multiple={multiple}
          onChange={onInputChange} className="hidden" />
      </div>
    );
  }

  // ── Full upload zone ─────────────────────────────────────
  const displayLabel = label || (accept.includes('image') ? 'Select images' : 'Select PDF file');
  const displaySub   = sublabel || (multiple ? 'or drag & drop files here' : 'or drag & drop file here');

  return (
    <div className={cn('relative flex-1 flex flex-col', className)} style={{ minHeight: 320 }}>
      <motion.div
        animate={{
          borderColor: state === 'dragging'
            ? 'rgba(99,102,241,0.7)'
            : state === 'done'
              ? 'rgba(16,185,129,0.6)'
              : 'rgba(255,255,255,0.1)',
          backgroundColor: state === 'dragging'
            ? 'rgba(99,102,241,0.06)'
            : 'rgba(255,255,255,0.015)',
          scale: state === 'dragging' ? 1.01 : 1,
        }}
        transition={{ duration: 0.2 }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className="upload-zone w-full h-full flex flex-col items-center justify-center
          rounded-2xl border-2 border-dashed flex-1"
        style={{ minHeight: 320, cursor: disabled ? 'not-allowed' : 'default' }}>

        <div className="flex flex-col items-center gap-6 px-8 py-14 text-center">
          {/* Icon */}
          <motion.div
            animate={{
              scale: state === 'dragging' ? 1.12 : 1,
              rotate: state === 'dragging' ? [-2, 2, -2] : 0,
            }}
            transition={{ duration: 0.3 }}
            className={cn(
              'w-20 h-20 rounded-2xl flex items-center justify-center shadow-glow-sm',
              state === 'done'
                ? 'bg-gradient-to-br from-emerald-500 to-green-600'
                : 'bg-gradient-to-br from-brand-500 to-violet-600'
            )}>
            {state === 'done'
              ? <CheckCircle size={36} className="text-white" />
              : state === 'dragging'
                ? <Upload size={36} className="text-white" />
                : <Icon size={36} className="text-white" />
            }
          </motion.div>

          <div>
            <h3 className="text-xl font-bold text-dark-100 mb-2">
              {state === 'done'
                ? 'File added!'
                : state === 'dragging'
                  ? 'Drop your file here'
                  : displayLabel}
            </h3>
            <p className="text-sm text-dark-400">{displaySub}</p>
            {accept && (
              <p className="text-xs text-dark-600 mt-2">
                {accept.replace(/\./g, '').replace(/,/g, ', ').toUpperCase()}
              </p>
            )}
          </div>

          {state !== 'dragging' && state !== 'done' && (
            <motion.button
              whileHover={{ scale: 1.04, boxShadow: '0 8px 30px rgba(99,102,241,0.45)' }}
              whileTap={{ scale: 0.97 }}
              onClick={handleClick}
              disabled={disabled}
              className={cn('btn-primary px-10 py-4 text-base rounded-xl shadow-lg shadow-brand-500/20',
                disabled ? 'opacity-50 cursor-not-allowed' : '')}>
              <Upload size={18} />
              {displayLabel}
            </motion.button>
          )}
        </div>

        <input id={inputId} type="file" accept={accept} multiple={multiple}
          onChange={onInputChange} className="hidden" />
      </motion.div>
    </div>
  );
}
