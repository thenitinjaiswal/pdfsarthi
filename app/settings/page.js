'use client';

import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Save, Moon, Sun, Monitor, AlertCircle } from 'lucide-react';
import ToolHeader from '@/components/tools/ToolHeader';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/hooks/useToast';

export default function SettingsPage() {
  const { settings, updateSettings, theme, setTheme } = useApp();
  const toast = useToast();

  const handleSave = () => {
    toast.success('Settings saved successfully!');
  };

  return (
    <div>
      <ToolHeader icon={SettingsIcon} title="Settings" description="Manage your preferences and default behaviors." />

      <div className="max-w-3xl space-y-6">
        {/* Appearance */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6">
          <h2 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">Appearance</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'light', label: 'Light', icon: Sun },
              { id: 'dark',  label: 'Dark',  icon: Moon },
              { id: 'system',label: 'System',icon: Monitor },
            ].map(t => (
              <button key={t.id} onClick={() => setTheme(t.id)}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                  theme === t.id
                    ? 'border-brand-500/40 bg-brand-500/10 text-brand-400'
                    : 'border-white/10 text-dark-400 hover:border-white/20 hover:text-dark-200'
                }`}>
                <t.icon size={20} className="mb-2" />
                <span className="text-xs font-semibold">{t.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* PDF Defaults */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl p-6">
          <h2 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">PDF Processing Defaults</h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-dark-400 mb-2 block">Default Compression Level</label>
              <select value={settings.compressionDefault}
                onChange={e => updateSettings({ compressionDefault: e.target.value })}
                className="input-dark w-full md:w-1/2">
                <option value="low">Low (High Quality)</option>
                <option value="medium">Medium (Balanced)</option>
                <option value="high">High (Smallest Size)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-dark-400 mb-2 block">Default OCR Language</label>
              <select value={settings.ocrLanguage}
                onChange={e => updateSettings({ ocrLanguage: e.target.value })}
                className="input-dark w-full md:w-1/2">
                <option value="eng">English</option>
                <option value="hin">Hindi</option>
                <option value="fra">French</option>
                <option value="spa">Spanish</option>
              </select>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <input type="checkbox" id="autosave" checked={settings.autoSave}
                onChange={e => updateSettings({ autoSave: e.target.checked })}
                className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-brand-500 focus:ring-brand-500 focus:ring-offset-dark-900" />
              <label htmlFor="autosave" className="text-sm text-dark-300">Auto-save generated PDFs to Recent Files</label>
            </div>
          </div>
        </motion.div>

        {/* Privacy & Data */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-2xl p-6">
          <h2 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">Privacy & Data</h2>
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-400 mb-1">Local Processing Guarantee</p>
                <p className="text-xs text-amber-400/80 leading-relaxed">
                  All PDF processing (except AI Chat) happens entirely within your browser. 
                  Your files are never uploaded to our servers, ensuring 100% data privacy.
                </p>
              </div>
            </div>
          </div>
          <button onClick={() => {
            if (confirm('Are you sure? This will clear all recent files and settings.')) {
              localStorage.clear();
              window.location.reload();
            }
          }} className="btn-secondary text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/20">
            Clear Local Data
          </button>
        </motion.div>

        <div className="flex justify-end pt-4">
          <button onClick={handleSave} className="btn-primary px-8">
            <Save size={16} /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
