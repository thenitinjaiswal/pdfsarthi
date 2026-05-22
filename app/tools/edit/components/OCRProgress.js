'use client';

import { useState } from 'react';
import { X, Cpu, Loader, Check, ScanText } from 'lucide-react';
import { OCR_LANGUAGES } from '@/lib/ocr-service';

export default function OCRProgress({ isOpen, onClose, onStart, status }) {
  const [selectedLang, setSelectedLang] = useState('eng');

  if (!isOpen) return null;

  const { running, progress, step } = status;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-dark-900 border border-white/8 rounded-2xl w-full max-w-md overflow-hidden shadow-glow flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-brand-400">
            <ScanText size={18} />
            <h3 className="font-bold text-white text-base">OCR Text Recognition</h3>
          </div>
          {!running && (
            <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-lg text-dark-500 hover:text-white transition-colors">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 flex-1 flex flex-col gap-4">
          {!running ? (
            <div className="flex flex-col gap-4">
              <div className="bg-brand-500/10 border border-brand-500/20 p-4 rounded-xl flex gap-3 text-xs leading-relaxed text-dark-300">
                <Cpu size={24} className="text-brand-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-white mb-1">Make Scanned Documents Editable</p>
                  We will analyze this page with artificial intelligence to recognize text. Once complete, you will be able to edit, delete, or highlight any text on the page.
                </div>
              </div>

              {/* Language Selection */}
              <div className="flex flex-col gap-2">
                <label className="text-xs text-dark-400">Recognition Language</label>
                <select
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value)}
                  className="bg-dark-950 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-dark-200 outline-none focus:border-brand-500 w-full cursor-pointer"
                >
                  {OCR_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.label} ({lang.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Loader size={36} className="text-brand-400 animate-spin mb-4" />
              
              <h4 className="font-bold text-white text-sm mb-1">{step}</h4>
              <p className="text-xs text-dark-500 mb-5">Please keep this window open</p>
              
              {/* Progress Bar */}
              <div className="w-full bg-dark-950 border border-white/5 rounded-full h-3 overflow-hidden p-0.5 mb-2">
                <div 
                  className="bg-brand-500 h-full rounded-full transition-all duration-300 shadow-glow-sm"
                  style={{ width: `${progress}%` }}
                />
              </div>
              
              <span className="text-xs font-mono font-bold text-brand-400">
                {progress}%
              </span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {!running && (
          <div className="px-5 py-4 border-t border-white/5 shrink-0 bg-dark-950/40 flex items-center justify-end gap-2.5">
            <button
              onClick={onClose}
              className="btn-secondary px-4 py-2 text-xs rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={() => onStart(selectedLang)}
              className="btn-primary px-5 py-2 text-xs rounded-xl shadow-glow-sm"
            >
              <Check size={14} />
              <span>Run OCR</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
