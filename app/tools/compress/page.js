'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minimize2, Download, Loader, FileText, TrendingDown, CheckCircle, Zap, Shield, Star, Target, AlertTriangle } from 'lucide-react';
import ToolHeader from '@/components/tools/ToolHeader';
import UploadZone from '@/components/tools/UploadZone';
import { useToast } from '@/hooks/useToast';
import { compressPDF, compressPDFToTargetSize } from '@/lib/pdf-service';
import { formatSize, downloadBlob } from '@/lib/utils';

const LEVELS = [
  {
    id: 'low',
    label: 'Low Compression',
    desc: 'Best quality, moderate size reduction',
    icon: Shield,
    iconColor: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderActive: 'border-blue-500/50 bg-blue-500/10',
    tag: 'Best Quality',
    tagColor: 'bg-blue-500/20 text-blue-400',
    pct: '~20–35%',
  },
  {
    id: 'medium',
    label: 'Balanced',
    desc: 'Great balance of quality and size',
    icon: Zap,
    iconColor: 'text-brand-400',
    bgColor: 'bg-brand-500/10',
    borderActive: 'border-brand-500/50 bg-brand-500/10',
    tag: 'Recommended',
    tagColor: 'bg-brand-500/20 text-brand-400',
    pct: '~40–60%',
  },
  {
    id: 'high',
    label: 'High Compression',
    desc: 'Maximum size reduction',
    icon: Star,
    iconColor: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderActive: 'border-orange-500/50 bg-orange-500/10',
    tag: 'Smallest File',
    tagColor: 'bg-orange-500/20 text-orange-400',
    pct: '~60–80%',
  },
];

export default function CompressPDFPage() {
  const [file, setFile]             = useState(null);
  const [level, setLevel]           = useState('medium');
  const [targetMode, setTargetMode] = useState(false);
  const [targetSizeKB, setTargetSizeKB] = useState('');
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState(null);
  const [progress, setProgress]     = useState({ current: 0, total: 0 });
  const toast = useToast();

  const handleFile = ([f]) => { setFile(f); setResult(null); setProgress({ current: 0, total: 0 }); };

  const handleCompress = async () => {
    if (!file) { toast.warning('Please select a PDF file.'); return; }

    if (targetMode) {
      const kb = parseFloat(targetSizeKB);
      if (!targetSizeKB || isNaN(kb) || kb <= 0) {
        toast.warning('Please enter a valid target size in KB.'); return;
      }
      if (kb * 1024 >= file.size) {
        toast.info('Target size is already larger than the original file.'); return;
      }
    }

    setLoading(true);
    setResult(null);
    setProgress({ current: 0, total: 0 });

    try {
      let res;
      if (targetMode) {
        const targetBytes = Math.round(parseFloat(targetSizeKB) * 1024);
        res = await compressPDFToTargetSize(file, targetBytes, (current, total) => {
          setProgress({ current, total });
        });
      } else {
        res = await compressPDF(file, level, (current, total) => {
          setProgress({ current, total });
        });
      }
      setResult(res);
      if (res.alreadyOptimized) {
        toast.info('This PDF is already at optimal size for browser-based tools.');
      } else if (targetMode && res.targetMet === false) {
        toast.warning(`Target unreachable — best result: ${formatSize(res.newSize)}`);
      } else {
        toast.success(`Saved ${formatSize(res.savedBytes)} — ${savedPctFrom(res)}% smaller!`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Compression failed. The file may be encrypted or corrupted.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (result) downloadBlob(result.blob, `compressed-${file.name}`);
  };

  const savedPctFrom = (r) =>
    r ? Math.max(0, Math.round(((r.originalSize - r.newSize) / r.originalSize) * 100)) : 0;

  const savedPct = savedPctFrom(result);
  const progressPct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  const selectedLevel = LEVELS.find(l => l.id === level);

  return (
    <div>
      <ToolHeader icon={Minimize2} title="Compress PDF" description="Reduce file size intelligently using our hybrid compression engine." />

      {!file ? (
        <div className="max-w-2xl mx-auto">
          <UploadZone onFiles={handleFile} accept=".pdf" label="Drop your PDF here to compress" />

          {/* Feature Pills */}
          <div className="flex flex-wrap gap-3 mt-6 justify-center">
            {['JPEG Flatten Engine', 'Object Stream Stripping', 'Always Smaller Guarantee', 'No Upload Needed'].map(f => (
              <span key={f} className="text-xs bg-dark-800/80 border border-white/8 text-dark-400 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <CheckCircle size={10} className="text-brand-400" /> {f}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-5 gap-6 items-start">

          {/* Left: File + Result */}
          <div className="lg:col-span-3 space-y-4">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <FileText size={20} className="text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-dark-100 truncate">{file.name}</p>
                  <p className="text-xs text-dark-500 mt-0.5">Original size: <span className="text-dark-300 font-medium">{formatSize(file.size)}</span></p>
                </div>
                <button onClick={() => { setFile(null); setResult(null); }} className="text-xs text-dark-600 hover:text-red-400 transition-colors shrink-0 px-2 py-1 rounded-lg hover:bg-red-500/10">
                  Remove
                </button>
              </div>

              {/* Loading Progress */}
              <AnimatePresence>
                {loading && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="bg-dark-900/60 rounded-xl p-4 border border-white/5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Loader size={14} className="animate-spin text-brand-400" />
                          <p className="text-sm font-medium text-dark-200">Compressing…</p>
                        </div>
                        <span className="text-xs text-brand-400 font-bold">{progressPct}%</span>
                      </div>
                      <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full"
                          animate={{ width: `${Math.max(progressPct, 5)}%` }}
                          transition={{ ease: 'easeOut', duration: 0.3 }}
                        />
                      </div>
                      {progress.total > 0 && (
                        <p className="text-xs text-dark-500 mt-2">Processing page {progress.current} of {progress.total}</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Result Card */}
              <AnimatePresence>
                {result && !loading && (
                  <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
                    {result.alreadyOptimized ? (
                      <div className="bg-blue-500/10 border border-blue-500/25 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-1.5">
                          <CheckCircle size={16} className="text-blue-400" />
                          <p className="text-sm font-bold text-blue-300">Already at Optimal Size</p>
                        </div>
                        <p className="text-xs text-dark-400 leading-relaxed">
                          This is a pure text-based PDF. Its content is already stored in the most compact format possible without a server-side tool like Ghostscript. The file has been returned unchanged.
                        </p>
                      </div>
                    ) : result.cannotCompress ? (
                      <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-1.5">
                          <AlertTriangle size={16} className="text-amber-400" />
                          <p className="text-sm font-bold text-amber-300">Target Not Reachable</p>
                        </div>
                        <p className="text-xs text-dark-400 leading-relaxed">
                          This PDF is primarily text — JPEG-flattening it produces a <span className="text-dark-200 font-medium">larger</span> file even at minimum quality.
                          A target of <span className="text-amber-300 font-bold">{targetSizeKB} KB</span> cannot be met client-side.
                          The original file has been kept unchanged ({formatSize(result.originalSize)}).
                        </p>
                      </div>
                    ) : (
                      <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-xs text-dark-500 uppercase tracking-widest font-bold mb-1">Compression Result</p>
                            <p className="text-2xl font-black text-emerald-400">−{savedPct}% <span className="text-sm font-normal text-dark-400">smaller</span></p>
                          </div>
                          <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
                            <TrendingDown size={28} className="text-emerald-400" />
                          </div>
                        </div>

                        {/* Before / After Visual */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="bg-dark-900/60 rounded-xl p-3 text-center">
                            <p className="text-[10px] text-dark-500 uppercase font-bold mb-1">Before</p>
                            <p className="text-base font-bold text-dark-200">{formatSize(result.originalSize)}</p>
                          </div>
                          <div className="bg-emerald-500/15 rounded-xl p-3 text-center">
                            <p className="text-[10px] text-emerald-600 uppercase font-bold mb-1">After</p>
                            <p className="text-base font-bold text-emerald-400">{formatSize(result.newSize)}</p>
                          </div>
                        </div>

                        {/* Visual Bar */}
                        <div className="space-y-1">
                          <div className="h-3 bg-dark-800 rounded-full overflow-hidden relative">
                            <div className="absolute inset-y-0 left-0 bg-dark-600 rounded-full" style={{ width: '100%' }} />
                            <motion.div
                              className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
                              initial={{ width: '100%' }}
                              animate={{ width: `${100 - savedPct}%` }}
                              transition={{ delay: 0.2, duration: 0.8, ease: 'easeOut' }}
                            />
                          </div>
                          <p className="text-[10px] text-dark-600 text-right">Saved {formatSize(result.savedBytes)}</p>
                        </div>

                        {/* Target not met warning */}
                        {result.targetMet === false && (
                          <div className="mt-3 flex items-start gap-2 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">
                            <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-amber-300 leading-relaxed">
                              Target size of <span className="font-bold">{targetSizeKB} KB</span> could not be reached client-side.
                              This is the smallest possible result at minimum JPEG quality.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Right: Settings + Actions */}
          <div className="lg:col-span-2 space-y-4">
            <div className="glass rounded-2xl p-5">
              <p className="text-xs font-bold text-dark-400 uppercase tracking-widest mb-3">Compression Level</p>
              <div className="space-y-2">
                {LEVELS.map(l => {
                  const Icon = l.icon;
                  const isActive = !targetMode && level === l.id;
                  return (
                    <button
                      key={l.id}
                      onClick={() => { setLevel(l.id); setTargetMode(false); setResult(null); }}
                      className={`w-full rounded-xl px-4 py-3.5 text-left border transition-all ${isActive ? l.borderActive : 'border-white/8 hover:border-white/15'}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg ${l.bgColor} flex items-center justify-center shrink-0 mt-0.5`}>
                          <Icon size={15} className={l.iconColor} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-sm font-semibold ${isActive ? 'text-dark-100' : 'text-dark-400'}`}>{l.label}</p>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? l.tagColor : 'bg-dark-800 text-dark-600'}`}>
                              {isActive ? l.tag : l.pct}
                            </span>
                          </div>
                          <p className={`text-xs mt-0.5 ${isActive ? 'text-dark-400' : 'text-dark-600'}`}>{l.desc}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}

                {/* Custom Target Size card */}
                <button
                  onClick={() => { setTargetMode(true); setResult(null); }}
                  className={`w-full rounded-xl px-4 py-3.5 text-left border transition-all ${
                    targetMode
                      ? 'border-violet-500/50 bg-violet-500/10'
                      : 'border-white/8 hover:border-white/15'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Target size={15} className="text-violet-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-semibold ${targetMode ? 'text-dark-100' : 'text-dark-400'}`}>Custom Target</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          targetMode ? 'bg-violet-500/20 text-violet-400' : 'bg-dark-800 text-dark-600'
                        }`}>
                          {targetMode ? 'Active' : 'Set KB'}
                        </span>
                      </div>
                      <p className={`text-xs mt-0.5 ${targetMode ? 'text-dark-400' : 'text-dark-600'}`}>Compress to an exact file size</p>
                    </div>
                  </div>

                  {/* Inline KB input — only visible when this card is active */}
                  <AnimatePresence>
                    {targetMode && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="overflow-hidden"
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-2 bg-dark-900/70 rounded-lg px-3 py-2 border border-violet-500/25">
                          <input
                            id="target-size-kb"
                            type="number"
                            min="1"
                            step="1"
                            placeholder="e.g. 100"
                            value={targetSizeKB}
                            onChange={e => { setTargetSizeKB(e.target.value); setResult(null); }}
                            className="flex-1 bg-transparent text-sm text-dark-100 placeholder-dark-600 outline-none min-w-0"
                          />
                          <span className="text-xs font-bold text-violet-400 shrink-0">KB</span>
                        </div>
                        {file && targetSizeKB && parseFloat(targetSizeKB) > 0 && (
                          <p className="text-[10px] text-dark-500 mt-1.5">
                            Target: {formatSize(Math.round(parseFloat(targetSizeKB) * 1024))} &nbsp;·&nbsp; Original: {formatSize(file.size)}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {result && !result.alreadyOptimized && (
                <motion.button
                  initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                  onClick={handleDownload}
                  className="btn-action w-full justify-center"
                >
                  <Download size={18} /> Download ({formatSize(result.newSize)})
                </motion.button>
              )}

              <button
                onClick={handleCompress}
                disabled={loading}
                className={`w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-semibold text-sm transition-all ${result ? 'btn-secondary' : 'btn-action'} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading
                  ? <><Loader size={18} className="animate-spin" /> Compressing…</>
                  : result
                    ? targetMode
                      ? <><Target size={18} /> Try Again with {targetSizeKB} KB Target</>
                      : <><Minimize2 size={18} /> Try Again with {selectedLevel?.label}</>
                    : targetMode
                      ? <><Target size={18} /> Compress to {targetSizeKB ? `${targetSizeKB} KB` : 'Target'}</>
                      : <><Minimize2 size={18} /> Compress PDF</>
                }
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
