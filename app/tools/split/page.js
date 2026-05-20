'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Scissors, Loader, FileText, LayoutGrid } from 'lucide-react';
import ToolHeader from '@/components/tools/ToolHeader';
import UploadZone from '@/components/tools/UploadZone';
import PageGrid from '@/components/tools/PageGrid';
import { useToast } from '@/hooks/useToast';
import { splitPDF, renderAllPageThumbnails } from '@/lib/pdf-service';
import { formatSize } from '@/lib/utils';

export default function SplitPDFPage() {
  const [file, setFile]       = useState(null);
  const [mode, setMode]       = useState('extract'); // 'extract', 'ranges', 'fixed', 'all'
  const [rangeStr, setRangeStr] = useState('');
  const [fixedPages, setFixedPages] = useState(1);
  const [pages, setPages]     = useState([]); // {pageNumber, dataUrl}
  const [selectedPages, setSelectedPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [mergeIntoOne, setMergeIntoOne] = useState(true);
  const toast = useToast();

  const handleFile = async ([f]) => {
    setFile(f);
    setLoading(true);
    setPages([]);
    setSelectedPages([]);
    
    try {
      const thumbs = await renderAllPageThumbnails(f, 0.2, 100);
      setPages(thumbs);
    } catch (err) {
      console.error(err);
      toast.error('Failed to parse PDF pages.');
    } finally {
      setLoading(false);
    }
  };

  const togglePageSelection = (pageNum) => {
    setSelectedPages(prev => 
      prev.includes(pageNum) 
        ? prev.filter(p => p !== pageNum)
        : [...prev, pageNum]
    );
  };

  const handleSplit = async () => {
    if (!file) return;
    setExtracting(true);
    try {
      let finalRange = '';
      let shouldMerge = mergeIntoOne;

      if (mode === 'extract') {
        if (selectedPages.length === 0) {
          toast.warning('Please select at least one page to extract.');
          setExtracting(false);
          return;
        }
        finalRange = selectedPages.sort((a,b)=>a-b).join(',');
      } else if (mode === 'ranges') {
        if (!rangeStr.trim()) {
          toast.warning('Please enter a valid range.');
          setExtracting(false);
          return;
        }
        finalRange = rangeStr;
      } else if (mode === 'fixed') {
        shouldMerge = false; // Never merge chunks into one file
        const chunks = [];
        for (let i = 1; i <= pages.length; i += fixedPages) {
          const end = Math.min(i + fixedPages - 1, pages.length);
          chunks.push(`${i}-${end}`);
        }
        finalRange = chunks.join(',');
      } else if (mode === 'all') {
        shouldMerge = false; // Never merge 'all' into one file
        finalRange = Array.from({ length: pages.length }, (_, i) => i + 1).join(',');
      }

      await splitPDF(file, finalRange, shouldMerge);
      toast.success('PDF split successfully!');
    } catch (err) {
      toast.error('Failed to split PDF. Please check your settings.');
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div>
      <ToolHeader icon={Scissors} title="Split PDF"
        description="Extract specific pages or split your PDF visually." />

      {!file ? (
        <div className="max-w-2xl mx-auto">
          <UploadZone onFiles={handleFile} accept=".pdf" />
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left panel: File Info & Controls */}
          <div className="lg:w-80 space-y-4 shrink-0">
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-brand-500/15 flex items-center justify-center text-brand-400">
                  <FileText size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-dark-200 truncate">{file.name}</p>
                  <p className="text-xs text-dark-500">{pages.length} pages • {formatSize(file.size)}</p>
                </div>
              </div>
              <button onClick={() => setFile(null)} className="text-xs text-dark-500 hover:text-red-400 transition-colors">
                × Remove file
              </button>
            </div>

            <div className="glass rounded-2xl p-5">
              <p className="text-xs font-semibold text-dark-500 uppercase tracking-widest mb-3">Split Mode</p>
              <div className="grid grid-cols-2 gap-2 mb-5">
                <button onClick={() => setMode('extract')} className={`py-2 rounded-xl text-xs font-medium border transition-colors ${mode === 'extract' ? 'bg-brand-500/10 border-brand-500/40 text-brand-400' : 'border-white/5 text-dark-400 hover:bg-white/5'}`}>
                  Extract Pages
                </button>
                <button onClick={() => setMode('ranges')} className={`py-2 rounded-xl text-xs font-medium border transition-colors ${mode === 'ranges' ? 'bg-brand-500/10 border-brand-500/40 text-brand-400' : 'border-white/5 text-dark-400 hover:bg-white/5'}`}>
                  Custom Ranges
                </button>
                <button onClick={() => setMode('fixed')} className={`py-2 rounded-xl text-xs font-medium border transition-colors ${mode === 'fixed' ? 'bg-brand-500/10 border-brand-500/40 text-brand-400' : 'border-white/5 text-dark-400 hover:bg-white/5'}`}>
                  Split in Chunks
                </button>
                <button onClick={() => setMode('all')} className={`py-2 rounded-xl text-xs font-medium border transition-colors ${mode === 'all' ? 'bg-brand-500/10 border-brand-500/40 text-brand-400' : 'border-white/5 text-dark-400 hover:bg-white/5'}`}>
                  Split Every Page
                </button>
              </div>

              {mode === 'extract' && (
                <div>
                  <p className="text-xs text-dark-400 mb-3 leading-relaxed">
                    Click on the pages in the grid you want to extract into a new PDF.
                  </p>
                  <div className="flex items-center justify-between text-xs text-dark-300 bg-black/20 p-3 rounded-lg border border-white/5 mb-4">
                    <span>Selected:</span>
                    <span className="font-bold text-brand-400">{selectedPages.length} pages</span>
                  </div>
                  {selectedPages.length > 0 && (
                    <button onClick={() => setSelectedPages([])} className="text-xs text-dark-500 hover:text-dark-300 transition-colors mb-4 block text-center w-full">
                      Clear selection
                    </button>
                  )}
                </div>
              )}
              
              {mode === 'ranges' && (
                <div>
                  <label className="text-xs text-dark-400 block mb-2">Ranges (e.g., 1-5, 8, 11-13)</label>
                  <input
                    type="text"
                    value={rangeStr}
                    onChange={(e) => setRangeStr(e.target.value)}
                    placeholder="1-5, 8, 11-13"
                    className="input-dark w-full mb-4"
                  />
                </div>
              )}

              {mode === 'fixed' && (
                <div>
                  <label className="text-xs text-dark-400 block mb-2">Pages per chunk</label>
                  <input
                    type="number"
                    min="1"
                    max={pages.length}
                    value={fixedPages}
                    onChange={(e) => setFixedPages(parseInt(e.target.value) || 1)}
                    className="input-dark w-full mb-4"
                  />
                  <p className="text-xs text-dark-500 mb-4">
                    Will split into ~{Math.ceil(pages.length / fixedPages)} separate files.
                  </p>
                </div>
              )}

              {mode === 'all' && (
                <div>
                  <p className="text-xs text-dark-400 mb-4 leading-relaxed">
                    Every single page will be extracted as a separate PDF file ({pages.length} files total).
                  </p>
                </div>
              )}

              {(mode === 'extract' || mode === 'ranges') && (
                <div className="mb-5 flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="mergeIntoOne" 
                    checked={mergeIntoOne} 
                    onChange={(e) => setMergeIntoOne(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-dark-900 text-brand-500 focus:ring-brand-500 focus:ring-offset-dark-800"
                  />
                  <label htmlFor="mergeIntoOne" className="text-xs text-dark-300 cursor-pointer select-none">
                    Merge extracted pages into one PDF
                  </label>
                </div>
              )}

              <button onClick={handleSplit} disabled={extracting || loading} className="btn-action w-full justify-center">
                {extracting ? <><Loader size={18} className="animate-spin" /> Processing...</> : <><Scissors size={18} /> Split PDF</>}
              </button>
            </div>
          </div>

          {/* Right panel: Visual Page Grid */}
          <div className="flex-1 glass rounded-2xl p-6 min-h-[500px]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <LayoutGrid size={16} className="text-brand-400" /> Document Pages
              </h3>
              {loading && <p className="text-xs text-brand-400 flex items-center gap-1.5"><Loader size={12} className="animate-spin" /> Loading thumbnails...</p>}
            </div>

            {loading && pages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-dark-500">
                <Loader size={24} className="animate-spin mb-3 text-brand-400" />
                <p className="text-sm">Extracting pages visually...</p>
              </div>
            ) : (
              <PageGrid 
                pages={pages} 
                selected={mode === 'extract' ? selectedPages : []} 
                onSelect={mode === 'extract' ? togglePageSelection : null}
                mode={mode === 'extract' ? 'select' : 'view'}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
