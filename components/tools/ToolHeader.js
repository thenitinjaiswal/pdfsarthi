'use client';

import { motion } from 'framer-motion';

/**
 * ToolHeader — standardized header for all tool pages.
 * Props: icon, title, description, badge
 */
export default function ToolHeader({ icon: Icon, title, description, badge }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-8">
      <div className="flex items-center gap-4">
        {Icon && (
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600
            flex items-center justify-center shadow-glow-sm flex-shrink-0">
            <Icon size={22} className="text-white" />
          </div>
        )}
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            {badge && (
              <span className="badge-pro">{badge}</span>
            )}
          </div>
          {description && (
            <p className="text-sm text-dark-400">{description}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
