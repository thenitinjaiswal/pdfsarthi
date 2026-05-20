/**
 * Shared utility functions for SarthiPDF.
 */

/** Format bytes to human-readable string */
export function formatSize(bytes) {
  if (!bytes || bytes === 0) return '—';
  if (bytes < 1024)            return `${bytes} B`;
  if (bytes < 1024 * 1024)     return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3)       return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

/** Format ISO date string to short readable format */
export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/** Clamp a number between min and max */
export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

/** Sleep for ms milliseconds */
export function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

/** Combine classnames (minimal clsx replacement) */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

/** Download a blob as a file */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/** Get file extension */
export function getExt(filename) {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/** Generate a unique ID */
export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/** Get color pair for a tool (for gradient icon backgrounds) */
export const TOOL_COLORS = {
  merge:       'from-blue-500 to-blue-700',
  split:       'from-purple-500 to-purple-700',
  compress:    'from-green-500 to-green-700',
  convert:     'from-yellow-500 to-orange-500',
  edit:        'from-pink-500 to-rose-700',
  rotate:      'from-cyan-500 to-cyan-700',
  watermark:   'from-amber-500 to-amber-700',
  protect:     'from-red-500 to-red-700',
  unlock:      'from-teal-500 to-teal-700',
  signature:   'from-indigo-500 to-indigo-700',
  ocr:         'from-lime-500 to-green-600',
  'page-numbers': 'from-violet-500 to-purple-700',
  scan:        'from-sky-500 to-blue-600',
  'ai-chat':   'from-brand-500 to-violet-600',
  summarize:   'from-fuchsia-500 to-pink-600',
};
