'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import {
  FilePlus2, Scissors, Minimize2, ArrowLeftRight, PenLine,
  ScanLine, ScanText, Lock, LockOpen, Stamp, PenSquare,
  Hash, RotateCw, Sparkles, Clock, FileText, Star, Pin,
  Zap, Shield, TrendingUp, Search, ChevronRight,
  Image, ImageDown, Trash2, Copy, Wrench
} from 'lucide-react';
import { formatDate, formatSize } from '@/lib/utils';

const CATEGORIES = ['All', 'Convert', 'Organize', 'Optimize', 'Security', 'AI Tools'];

const ALL_TOOLS = [
  { icon: FilePlus2,      label: 'Merge PDF',      path: '/tools/merge',          cat: 'Organize',  color: 'from-blue-500 to-blue-700',     desc: 'Combine multiple PDFs' },
  { icon: Scissors,       label: 'Split PDF',      path: '/tools/split',          cat: 'Organize',  color: 'from-purple-500 to-purple-700', desc: 'Split by page range' },
  { icon: RotateCw,       label: 'Rotate PDF',     path: '/tools/rotate',         cat: 'Organize',  color: 'from-cyan-500 to-cyan-700',     desc: 'Rotate pages' },
  { icon: Trash2,         label: 'Remove Pages',   path: '/tools/remove-pages',   cat: 'Organize',  color: 'from-red-500 to-red-700',       desc: 'Delete specific pages' },
  { icon: Copy,           label: 'Extract Pages',  path: '/tools/extract-pages',  cat: 'Organize',  color: 'from-teal-500 to-teal-700',     desc: 'Save pages as new PDF' },
  { icon: Minimize2,      label: 'Compress',       path: '/tools/compress',       cat: 'Optimize',  color: 'from-green-500 to-green-700',   desc: 'Reduce file size' },
  { icon: Wrench,         label: 'Repair PDF',     path: '/tools/repair',         cat: 'Optimize',  color: 'from-orange-500 to-orange-700', desc: 'Fix corrupt PDFs' },
  { icon: PenLine,        label: 'Edit PDF',       path: '/tools/edit',           cat: 'Optimize',  color: 'from-pink-500 to-rose-700',     desc: 'Add text & draw' },
  { icon: Hash,           label: 'Page Numbers',   path: '/tools/page-numbers',   cat: 'Optimize',  color: 'from-violet-500 to-purple-700', desc: 'Add page numbers' },
  { icon: Image,          label: 'JPG to PDF',     path: '/tools/jpg-to-pdf',     cat: 'Convert',   color: 'from-yellow-400 to-orange-500', desc: 'Images → PDF' },
  { icon: ImageDown,      label: 'PDF to JPG',     path: '/tools/pdf-to-jpg',     cat: 'Convert',   color: 'from-amber-500 to-yellow-600',  desc: 'Pages → JPG images' },
  { icon: ArrowLeftRight, label: 'Convert PDF',    path: '/tools/convert',        cat: 'Convert',   color: 'from-yellow-500 to-orange-500', desc: 'PDF ↔ Word, Excel' },
  { icon: ScanText,       label: 'OCR',            path: '/tools/ocr',            cat: 'Convert',   color: 'from-lime-500 to-green-600',    desc: 'Extract text' },
  { icon: ScanLine,       label: 'Scan PDF',       path: '/tools/scan',           cat: 'Convert',   color: 'from-sky-500 to-blue-600',      desc: 'Webcam scanner' },
  { icon: Lock,           label: 'Protect PDF',    path: '/tools/protect',        cat: 'Security',  color: 'from-red-500 to-red-700',       desc: 'Password protection' },
  { icon: LockOpen,       label: 'Unlock PDF',     path: '/tools/unlock',         cat: 'Security',  color: 'from-teal-500 to-teal-700',     desc: 'Remove password' },
  { icon: Stamp,          label: 'Watermark',      path: '/tools/watermark',      cat: 'Security',  color: 'from-amber-500 to-amber-700',   desc: 'Add watermarks' },
  { icon: PenSquare,      label: 'Signature',      path: '/tools/signature',      cat: 'Security',  color: 'from-indigo-500 to-indigo-700', desc: 'Digital signature' },
  { icon: Sparkles,       label: 'AI Chat',        path: '/tools/ai-chat',        cat: 'AI Tools',  color: 'from-brand-500 to-violet-600',  desc: 'Chat with PDF', pro: true },
];

const STATS_ITEMS = [
  { icon: Zap,        label: 'Processing',  value: 'In-Browser', sub: 'No uploads',   color: 'text-brand-400' },
  { icon: Shield,     label: 'Privacy',     value: 'Local',      sub: 'Zero data',    color: 'text-emerald-400' },
  { icon: TrendingUp, label: 'Performance', value: 'Fast',       sub: 'WebAssembly',  color: 'text-blue-400' },
];

export default function DashboardPage() {
  const { recentFiles, pinnedTools, togglePinned } = useApp();
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');

  const filtered = ALL_TOOLS.filter(t => {
    const matchCat = activeCategory === 'All' || t.cat === activeCategory;
    const matchQ   = !search || t.label.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchQ;
  });

  const pinned = ALL_TOOLS.filter(t => pinnedTools.includes(t.path));

  return (
    <div>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white mb-1.5">
          Welcome to <span className="text-gradient">SarthiPDF</span>
        </h1>
        <p className="text-dark-400 text-sm">
          Professional PDF tools — 100% in-browser. Nothing leaves your device.
        </p>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 mb-8">
        {STATS_ITEMS.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass rounded-xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-dark-800 flex items-center justify-center flex-shrink-0">
              <s.icon size={16} className={s.color} />
            </div>
            <div>
              <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-dark-500">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Pinned tools */}
      {pinned.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-dark-600 mb-3 flex items-center gap-2">
            <Pin size={12} className="text-brand-500" /> Pinned Tools
          </h2>
          <div className="flex flex-wrap gap-2">
            {pinned.map(t => (
              <Link key={t.path} href={t.path}
                className="flex items-center gap-2 px-3 py-2 rounded-xl
                  bg-brand-500/10 border border-brand-500/20 text-brand-400
                  text-sm font-medium hover:bg-brand-500/20 transition-all">
                <t.icon size={14} />
                {t.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Search + Category tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
        <div className="relative w-full sm:w-auto">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
          <input
            type="text"
            placeholder="Search tools..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-dark pl-9 py-2 text-sm w-full sm:w-72"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeCategory === cat
                  ? 'bg-brand-500 text-white'
                  : 'text-dark-500 hover:text-dark-200 hover:bg-white/5'
              }`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* All Tools grid */}
      <h2 className="text-xs font-semibold uppercase tracking-widest text-dark-600 mb-3">All Tools</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-10">
        {filtered.map((tool, i) => (
          <motion.div
            key={tool.path}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03 }}
            whileHover={{ scale: 1.05, y: -3 }}
            whileTap={{ scale: 0.97 }}
            className="relative group">
            <Link href={tool.path} className="tool-card block h-full">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tool.color}
                flex items-center justify-center shadow-md`}>
                <tool.icon size={18} className="text-white" />
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <p className="text-xs font-semibold text-dark-100">{tool.label}</p>
                  {tool.pro && <span className="badge-pro">PRO</span>}
                </div>
                <p className="text-[11px] text-dark-600 mt-0.5 leading-tight">{tool.desc}</p>
              </div>
            </Link>
            {/* Pin button */}
            <button
              onClick={() => togglePinned(tool.path)}
              className={`absolute top-2 right-2 w-6 h-6 rounded-lg
                flex items-center justify-center transition-all
                opacity-0 group-hover:opacity-100
                ${pinnedTools.includes(tool.path)
                  ? 'bg-brand-500/20 text-brand-400 opacity-100'
                  : 'bg-dark-800 text-dark-600 hover:text-brand-400'}`}
              title={pinnedTools.includes(tool.path) ? 'Unpin' : 'Pin tool'}>
              <Pin size={10} />
            </button>
          </motion.div>
        ))}
      </div>

      {/* Recent files */}
      {recentFiles.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-dark-600 mb-3
            flex items-center gap-2">
            <Clock size={12} className="text-dark-500" /> Recent Files
          </h2>
          <div className="space-y-2">
            {recentFiles.slice(0, 8).map((f, i) => (
              <motion.div
                key={f.name + i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="file-card rounded-xl px-4 py-3 flex items-center gap-3
                  hover:bg-white/5 transition-colors cursor-pointer">
                <div className="w-8 h-8 rounded-lg bg-dark-800 flex items-center justify-center">
                  <FileText size={14} className="text-brand-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-dark-200 truncate">{f.name}</p>
                  <p className="text-xs text-dark-600">{formatSize(f.size)}</p>
                </div>
                <span className="text-xs text-dark-700 flex-shrink-0">{formatDate(f.openedAt)}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {recentFiles.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-dark-800 flex items-center justify-center mb-4">
            <FileText size={26} className="text-dark-700" />
          </div>
          <p className="text-dark-500 text-sm">No recent files yet.</p>
          <p className="text-dark-700 text-xs mt-1">Pick a tool above to get started</p>
        </div>
      )}
    </div>
  );
}
