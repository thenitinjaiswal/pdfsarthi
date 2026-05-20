'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Search, Sun, Moon, Menu, X, Download,
  ChevronRight, Sparkles, User, Bell, Command
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

const ALL_TOOLS = [
  { label: 'Merge PDF',    path: '/tools/merge',        desc: 'Combine multiple PDFs into one' },
  { label: 'Split PDF',    path: '/tools/split',        desc: 'Split PDF by page ranges' },
  { label: 'Compress PDF', path: '/tools/compress',     desc: 'Reduce PDF file size' },
  { label: 'Convert PDF',  path: '/tools/convert',      desc: 'Convert PDF to Word, Excel, Images' },
  { label: 'Edit PDF',     path: '/tools/edit',         desc: 'Add text, draw, annotate' },
  { label: 'Rotate PDF',   path: '/tools/rotate',       desc: 'Rotate pages 90/180/270°' },
  { label: 'Watermark',    path: '/tools/watermark',    desc: 'Add text watermark' },
  { label: 'Protect PDF',  path: '/tools/protect',      desc: 'Add password protection' },
  { label: 'Unlock PDF',   path: '/tools/unlock',       desc: 'Remove password from PDF' },
  { label: 'Sign PDF',     path: '/tools/signature',    desc: 'Draw & embed digital signature' },
  { label: 'OCR',          path: '/tools/ocr',          desc: 'Extract text from scanned PDF' },
  { label: 'Page Numbers', path: '/tools/page-numbers', desc: 'Add page numbers' },
  { label: 'Scan PDF',     path: '/tools/scan',         desc: 'Scan using webcam' },
  { label: 'Pricing',      path: '/pricing',            desc: 'View plans & pricing' },
  { label: 'Enterprise',   path: '/enterprise',         desc: 'Enterprise solutions' },
];

export default function Navbar() {
  const { theme, setTheme } = useApp();
  const pathname = usePathname();
  const [search, setSearch]   = useState('');
  const [open, setOpen]       = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const inputRef = useRef(null);

  const filtered = search.trim()
    ? ALL_TOOLS.filter(t =>
        t.label.toLowerCase().includes(search.toLowerCase()) ||
        t.desc.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  // ⌘K / Ctrl+K to open search
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const isDashboard = pathname?.startsWith('/dashboard') || pathname?.startsWith('/tools');

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-4 sm:px-6
        bg-dark-950/80 backdrop-blur-xl border-b border-white/5">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mr-6 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-violet-600
            flex items-center justify-center shadow-glow-sm">
            <Zap size={14} className="text-white" />
          </div>
          <span className="text-sm font-bold hidden sm:block">
            Sarthi<span className="text-gradient">PDF</span>
          </span>
        </Link>

        {/* Nav links (desktop) */}
        <nav className="hidden md:flex items-center gap-1 mr-4">
          {[
            { label: 'Tools',      href: '/dashboard' },
            { label: 'Pricing',    href: '/pricing' },
            { label: 'Enterprise', href: '/enterprise' },
          ].map(l => (
            <Link key={l.href} href={l.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                ${pathname === l.href
                  ? 'text-brand-400 bg-brand-500/10'
                  : 'text-dark-400 hover:text-dark-100 hover:bg-white/5'
                }`}>
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Search bar */}
        <button
          onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
          className="flex-1 max-w-xs flex items-center gap-2 px-3 py-1.5
            bg-dark-800/80 border border-white/8 rounded-lg
            text-sm text-dark-500 hover:border-brand-500/40
            hover:text-dark-300 transition-all cursor-text">
          <Search size={13} className="flex-shrink-0" />
          <span className="flex-1 text-left text-xs">Search tools...</span>
          <kbd className="hidden sm:flex items-center gap-0.5 text-xs">
            <Command size={10} />K
          </kbd>
        </button>

        <div className="flex-1" />

        {/* Right controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            className="btn-ghost p-2 rounded-lg" title="Toggle theme">
            {theme === 'dark'
              ? <Sun  size={15} className="text-dark-400" />
              : <Moon size={15} className="text-dark-400" />}
          </button>

          <Link href="/pricing"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg
              bg-brand-500/10 border border-brand-500/25 text-brand-400 text-xs font-medium
              hover:bg-brand-500/20 transition-all">
            <Sparkles size={12} />
            Upgrade
          </Link>

          <button
            onClick={() => setMobileOpen(m => !m)}
            className="md:hidden btn-ghost p-2">
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </header>

      {/* ── Global Search Modal ─────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[15vh] px-4">
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-xl glass-strong rounded-2xl overflow-hidden shadow-2xl border border-white/12">

              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8">
                <Search size={16} className="text-dark-400 flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search tools, features..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-dark-500"
                  autoFocus
                />
                <button onClick={() => setOpen(false)}
                  className="text-xs text-dark-500 hover:text-dark-300 border border-white/10 rounded px-2 py-0.5">
                  ESC
                </button>
              </div>

              {/* Results */}
              <div className="max-h-72 overflow-y-auto custom-scroll">
                {filtered.length === 0 && search.trim() && (
                  <div className="py-8 text-center text-sm text-dark-500">
                    No tools found for &ldquo;{search}&rdquo;
                  </div>
                )}
                {filtered.length === 0 && !search.trim() && (
                  <div className="p-3">
                    <p className="text-xs text-dark-600 px-2 pb-2">Popular Tools</p>
                    {ALL_TOOLS.slice(0, 6).map(t => (
                      <SearchResult key={t.path} tool={t} onClose={() => setOpen(false)} />
                    ))}
                  </div>
                )}
                {filtered.length > 0 && (
                  <div className="p-3">
                    {filtered.map(t => (
                      <SearchResult key={t.path} tool={t} onClose={() => setOpen(false)} />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mobile menu ────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-14 inset-x-0 z-40 bg-dark-900/95 backdrop-blur-xl
              border-b border-white/8 p-4 flex flex-col gap-1 md:hidden">
            {[
              { label: 'Tools',      href: '/dashboard' },
              { label: 'Pricing',    href: '/pricing' },
              { label: 'Enterprise', href: '/enterprise' },
            ].map(l => (
              <Link key={l.href} href={l.href}
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2.5 rounded-lg text-sm font-medium text-dark-300
                  hover:bg-white/5 hover:text-white transition-all">
                {l.label}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function SearchResult({ tool, onClose }) {
  return (
    <Link href={tool.path} onClick={onClose}
      className="flex items-center gap-3 px-3 py-2 rounded-xl
        hover:bg-white/5 transition-colors group">
      <div className="w-8 h-8 rounded-lg bg-brand-500/15 flex items-center justify-center flex-shrink-0">
        <Zap size={14} className="text-brand-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-dark-200 group-hover:text-white transition-colors">
          {tool.label}
        </p>
        <p className="text-xs text-dark-500 truncate">{tool.desc}</p>
      </div>
      <ChevronRight size={14} className="text-dark-600 group-hover:text-brand-400 transition-colors" />
    </Link>
  );
}
