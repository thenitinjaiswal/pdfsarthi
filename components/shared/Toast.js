'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';

const ICONS = {
  success: CheckCircle,
  error:   XCircle,
  warning: AlertCircle,
  info:    Info,
};

const COLORS = {
  success: 'text-emerald-400',
  error:   'text-red-400',
  warning: 'text-amber-400',
  info:    'text-brand-400',
};

export default function Toast() {
  const { toasts, removeToast } = useApp();

  return (
    <div className="fixed bottom-4 right-4 z-[300] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => {
          const Icon = ICONS[toast.type] || Info;
          const color = COLORS[toast.type] || 'text-brand-400';
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0,  scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.22 }}
              className={`pointer-events-auto flex items-start gap-3 max-w-sm w-full
                glass-strong rounded-xl px-4 py-3 shadow-2xl border
                toast-${toast.type}`}>
              <Icon size={17} className={`${color} flex-shrink-0 mt-0.5`} />
              <p className="flex-1 text-sm text-dark-200 leading-snug">{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 text-dark-600 hover:text-dark-300 transition-colors">
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
