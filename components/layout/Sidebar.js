'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import {
  LayoutDashboard, FilePlus2, Scissors, Minimize2,
  ArrowLeftRight, PenLine, ScanLine, ScanText,
  Lock, LockOpen, Stamp, PenSquare, Hash, RotateCw,
  Settings, ChevronLeft, ChevronRight, Zap, Star,
  Sparkles, CreditCard, Image, ImageDown, Trash2, Copy, Wrench
} from 'lucide-react';

const NAV_GROUPS = [
  {
    label: 'Main',
    items: [
      { path: '/dashboard',          label: 'Dashboard',    icon: LayoutDashboard },
    ],
  },
  {
    label: 'Organize',
    items: [
      { path: '/tools/merge',          label: 'Merge PDF',       icon: FilePlus2 },
      { path: '/tools/split',          label: 'Split PDF',       icon: Scissors },
      { path: '/tools/rotate',         label: 'Rotate PDF',      icon: RotateCw },
      { path: '/tools/remove-pages',   label: 'Remove Pages',    icon: Trash2 },
      { path: '/tools/extract-pages',  label: 'Extract Pages',   icon: Copy },
    ],
  },
  {
    label: 'Optimize',
    items: [
      { path: '/tools/compress',     label: 'Compress',     icon: Minimize2 },
      { path: '/tools/repair',       label: 'Repair PDF',   icon: Wrench },
      { path: '/tools/edit',         label: 'Edit PDF',     icon: PenLine },
      { path: '/tools/page-numbers', label: 'Page Numbers', icon: Hash },
    ],
  },
  {
    label: 'Convert',
    items: [
      { path: '/tools/jpg-to-pdf',   label: 'JPG to PDF',   icon: Image },
      { path: '/tools/pdf-to-jpg',   label: 'PDF to JPG',   icon: ImageDown },
      { path: '/tools/convert',      label: 'Convert PDF',  icon: ArrowLeftRight },
      { path: '/tools/scan',         label: 'Scan PDF',     icon: ScanLine },
      { path: '/tools/ocr',          label: 'OCR',          icon: ScanText },
    ],
  },
  {
    label: 'Security',
    items: [
      { path: '/tools/protect',      label: 'Protect PDF',  icon: Lock },
      { path: '/tools/unlock',       label: 'Unlock PDF',   icon: LockOpen },
      { path: '/tools/watermark',    label: 'Watermark',    icon: Stamp },
      { path: '/tools/signature',    label: 'Signature',    icon: PenSquare },
    ],
  },
  {
    label: 'AI Tools',
    badge: 'PRO',
    items: [
      { path: '/tools/ai-chat',      label: 'AI PDF Chat',  icon: Sparkles, pro: true },
    ],
  },
];

export default function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed } = useApp();
  const pathname = usePathname();

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 60 : 220 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="flex-shrink-0 flex flex-col h-full bg-dark-900 border-r border-white/5 relative z-10"
      style={{ overflow: 'hidden' }}>

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3.5 py-3.5 border-b border-white/5">
        <div className="w-7 h-7 flex-shrink-0 rounded-lg bg-gradient-to-br from-brand-500 to-violet-600
          flex items-center justify-center shadow-glow-sm animate-pulse-glow">
          <Zap size={14} className="text-white" />
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="text-sm font-bold whitespace-nowrap">
              Sarthi<span className="text-gradient">PDF</span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto overflow-x-hidden custom-scroll">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-3">
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 px-2 pt-2 pb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-dark-600">
                    {group.label}
                  </p>
                  {group.badge && (
                    <span className="badge-pro">{group.badge}</span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {group.items.map(({ path, label, icon: Icon, pro }) => {
              const isActive = pathname === path;
              return (
                <Link
                  key={path}
                  href={path}
                  title={sidebarCollapsed ? label : undefined}
                  className={`sidebar-item mb-0.5 ${isActive ? 'active' : ''}`}>
                  <Icon size={17} className="flex-shrink-0" />
                  <AnimatePresence>
                    {!sidebarCollapsed && (
                      <motion.div
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        transition={{ duration: 0.12 }}
                        className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span className="text-[13px] truncate">{label}</span>
                        {pro && <span className="badge-pro ml-auto">PRO</span>}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="px-2 pb-3 pt-2 space-y-0.5 border-t border-white/5">
        <Link href="/pricing"
          title={sidebarCollapsed ? 'Pricing' : undefined}
          className="sidebar-item">
          <CreditCard size={17} className="flex-shrink-0 text-brand-500" />
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.12 }}
                className="text-[13px] text-brand-400 font-medium">
                Upgrade to Pro
              </motion.span>
            )}
          </AnimatePresence>
        </Link>

        <Link href="/settings"
          title={sidebarCollapsed ? 'Settings' : undefined}
          className={`sidebar-item ${pathname === '/settings' ? 'active' : ''}`}>
          <Settings size={17} className="flex-shrink-0" />
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.12 }}
                className="text-[13px]">
                Settings
              </motion.span>
            )}
          </AnimatePresence>
        </Link>

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed(c => !c)}
          className="sidebar-item w-full"
          title={sidebarCollapsed ? 'Expand' : 'Collapse'}>
          {sidebarCollapsed
            ? <ChevronRight size={17} className="flex-shrink-0" />
            : <ChevronLeft  size={17} className="flex-shrink-0" />}
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.12 }}
                className="text-[13px]">
                Collapse
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}
