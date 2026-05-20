'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  FilePlus2, Scissors, Minimize2, ArrowLeftRight, PenLine,
  ScanLine, ScanText, Lock, LockOpen, Stamp, PenSquare,
  Hash, RotateCw, Sparkles, Zap, Shield, Globe, Download,
  ChevronRight, ArrowRight, Check, Star, Users, TrendingUp,
  FileText, Play, Code2, Building2, Search,
  Image, ImageDown, Trash2, Copy, Wrench
} from 'lucide-react';
import { AppProvider } from '@/context/AppContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Toast from '@/components/shared/Toast';

// ─── Data ──────────────────────────────────────────────────

const CATEGORIES = ['All', 'Convert', 'Organize', 'Optimize', 'Security', 'AI Tools'];

const ALL_TOOLS = [
  { icon: FilePlus2,     label: 'Merge PDF',       path: '/tools/merge',          cat: 'Organize',  color: 'from-blue-500 to-blue-700',     desc: 'Combine multiple PDFs into one document' },
  { icon: Scissors,      label: 'Split PDF',       path: '/tools/split',          cat: 'Organize',  color: 'from-purple-500 to-purple-700', desc: 'Split by page range or extract pages' },
  { icon: RotateCw,      label: 'Rotate PDF',      path: '/tools/rotate',         cat: 'Organize',  color: 'from-cyan-500 to-cyan-700',     desc: 'Rotate pages 90/180/270°' },
  { icon: Trash2,        label: 'Remove Pages',    path: '/tools/remove-pages',   cat: 'Organize',  color: 'from-red-500 to-red-700',       desc: 'Delete specific pages from PDF' },
  { icon: Copy,          label: 'Extract Pages',   path: '/tools/extract-pages',  cat: 'Organize',  color: 'from-teal-500 to-teal-700',     desc: 'Save selected pages as a new PDF' },
  { icon: Minimize2,     label: 'Compress',        path: '/tools/compress',       cat: 'Optimize',  color: 'from-green-500 to-green-700',   desc: 'Reduce file size, keep quality' },
  { icon: Wrench,        label: 'Repair PDF',      path: '/tools/repair',         cat: 'Optimize',  color: 'from-orange-500 to-orange-700', desc: 'Fix corrupted or broken PDFs' },
  { icon: PenLine,       label: 'Edit PDF',        path: '/tools/edit',           cat: 'Optimize',  color: 'from-pink-500 to-rose-700',     desc: 'Add text, draw, annotate & sign' },
  { icon: Hash,          label: 'Page Numbers',    path: '/tools/page-numbers',   cat: 'Optimize',  color: 'from-violet-500 to-purple-700', desc: 'Add custom page numbers' },
  { icon: Image,         label: 'JPG to PDF',      path: '/tools/jpg-to-pdf',     cat: 'Convert',   color: 'from-yellow-400 to-orange-500', desc: 'Convert images into a PDF file' },
  { icon: ImageDown,     label: 'PDF to JPG',      path: '/tools/pdf-to-jpg',     cat: 'Convert',   color: 'from-amber-500 to-yellow-600',  desc: 'Export PDF pages as JPG images' },
  { icon: ArrowLeftRight,label: 'Convert PDF',     path: '/tools/convert',        cat: 'Convert',   color: 'from-yellow-500 to-orange-500', desc: 'PDF ↔ Word, Excel, Images, HTML' },
  { icon: ScanLine,      label: 'Scan PDF',        path: '/tools/scan',           cat: 'Convert',   color: 'from-sky-500 to-blue-600',      desc: 'Scan documents using webcam' },
  { icon: ScanText,      label: 'OCR',             path: '/tools/ocr',            cat: 'Convert',   color: 'from-lime-500 to-green-600',    desc: 'Extract text from scanned PDFs' },
  { icon: Lock,          label: 'Protect PDF',     path: '/tools/protect',        cat: 'Security',  color: 'from-red-500 to-red-700',       desc: 'Password protect your PDF (AES-256)' },
  { icon: LockOpen,      label: 'Unlock PDF',      path: '/tools/unlock',         cat: 'Security',  color: 'from-teal-500 to-teal-700',     desc: 'Remove password from PDF' },
  { icon: Stamp,         label: 'Watermark',       path: '/tools/watermark',      cat: 'Security',  color: 'from-amber-500 to-amber-700',   desc: 'Add text or image watermarks' },
  { icon: PenSquare,     label: 'Signature',       path: '/tools/signature',      cat: 'Security',  color: 'from-indigo-500 to-indigo-700', desc: 'Draw & embed digital signatures' },
  { icon: Sparkles,      label: 'AI PDF Chat',     path: '/tools/ai-chat',        cat: 'AI Tools',  color: 'from-brand-500 to-violet-600',  desc: 'Chat with your PDF using GPT-4', pro: true },
];

const STATS = [
  { value: '2M+',    label: 'Files Processed',  icon: FileText },
  { value: '150K+',  label: 'Happy Users',       icon: Users },
  { value: '19',     label: 'PDF Tools',         icon: Zap },
  { value: '99.9%',  label: 'Uptime',            icon: TrendingUp },
];

const FEATURES = [
  {
    icon: Shield,
    title: '100% Private',
    desc: 'All processing in your browser. Files never uploaded. Complete data sovereignty.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    desc: 'WebAssembly-powered processing. No server round-trips, no waiting.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
  {
    icon: Sparkles,
    title: 'AI-Powered',
    desc: 'GPT-4 integration for summarization, translation, and smart form filling.',
    color: 'text-brand-400',
    bg: 'bg-brand-500/10',
  },
  {
    icon: Globe,
    title: 'Works Anywhere',
    desc: 'Web, mobile, desktop. One account, all devices, full offline support.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
];

const COMPETITORS = [
  { feature: 'Free tier',                sarthi: true,  ilovepdf: true,  smallpdf: true },
  { feature: 'No file uploads',          sarthi: true,  ilovepdf: false, smallpdf: false },
  { feature: 'AI chat with PDF',         sarthi: true,  ilovepdf: false, smallpdf: false },
  { feature: 'Offline desktop app',      sarthi: true,  ilovepdf: false, smallpdf: false },
  { feature: 'Mobile app',               sarthi: true,  ilovepdf: true,  smallpdf: true },
  { feature: 'API access',               sarthi: true,  ilovepdf: true,  smallpdf: true },
  { feature: 'Batch processing',         sarthi: true,  ilovepdf: true,  smallpdf: false },
  { feature: 'Enterprise SSO (SAML)',    sarthi: true,  ilovepdf: false, smallpdf: false },
  { feature: 'Dark mode',                sarthi: true,  ilovepdf: false, smallpdf: false },
];

// ─── Animated Counter ──────────────────────────────────────

function Counter({ target, suffix = '' }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const num = parseFloat(target.replace(/[^0-9.]/g, ''));
    const duration = 1200;
    const steps = 40;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(num * eased));
      if (step >= steps) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [inView, target]);

  const prefix = target.replace(/[0-9.]+.*/, '');
  const suf    = target.replace(/^[^0-9]*[0-9.]+/, '') || suffix;

  return <span ref={ref}>{prefix}{count}{suf}</span>;
}

// ─── Home Page ─────────────────────────────────────────────

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [toolSearch, setToolSearch]         = useState('');

  const filteredTools = ALL_TOOLS.filter(t => {
    const matchCat = activeCategory === 'All' || t.cat === activeCategory;
    const matchQ   = !toolSearch || t.label.toLowerCase().includes(toolSearch.toLowerCase());
    return matchCat && matchQ;
  });

  return (
    <AppProvider>
      <div className="min-h-screen bg-dark-950 text-dark-50 overflow-x-hidden">
        <Navbar />

        {/* ── Hero ──────────────────────────────────────── */}
        <section className="relative min-h-screen flex flex-col items-center justify-center
          text-center px-4 pt-20 pb-16 overflow-hidden">

          {/* Background effects */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2
              w-[900px] h-[900px] bg-brand-500/6 rounded-full blur-3xl animate-pulse" />
            <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-3xl" />
            <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-blue-500/4 rounded-full blur-3xl" />
            <div className="absolute inset-0 bg-grid opacity-100" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="relative z-10 max-w-5xl mx-auto">

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full
                glass border border-brand-500/25 text-brand-400 text-sm font-medium mb-8">
              <Sparkles size={14} />
              AI-Powered PDF Toolkit — 100% Free & Private
            </motion.div>

            {/* Headline */}
            <h1 className="font-display text-5xl sm:text-6xl md:text-7xl font-black
              text-white leading-[1.05] tracking-tight mb-6">
              The PDF Toolkit
              <br />
              <span className="text-gradient">Built for Everyone</span>
            </h1>

            <p className="text-xl text-dark-300 max-w-2xl mx-auto mb-10 leading-relaxed">
              Merge, split, compress, convert, edit, sign & protect PDFs.{' '}
              <strong className="text-white">14 tools</strong>, all{' '}
              <strong className="text-white">free</strong>, all{' '}
              <strong className="text-white">private</strong>. Nothing ever leaves your browser.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Link href="/dashboard"
                  className="btn-primary px-8 py-4 text-base rounded-xl shadow-2xl shadow-brand-500/25">
                  <Zap size={18} />
                  Start Free — No Signup
                  <ChevronRight size={16} />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Link href="/pricing"
                  className="btn-secondary px-8 py-4 text-base rounded-xl">
                  <Star size={16} />
                  View Pricing
                </Link>
              </motion.div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
              {STATS.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.08 }}
                  className="glass rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-brand-400">
                    <Counter target={s.value} />
                  </p>
                  <p className="text-xs text-dark-500 mt-1">{s.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ── Tools Grid ────────────────────────────────── */}
        <section className="py-24 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12">
              <h2 className="font-display text-4xl font-bold text-white mb-4">
                Everything You Need
              </h2>
              <p className="text-dark-400 text-lg max-w-xl mx-auto">
                14 powerful PDF tools — all free, all running in your browser.
              </p>
            </motion.div>

            {/* Search + category tabs */}
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                <input
                  type="text"
                  placeholder="Search tools..."
                  value={toolSearch}
                  onChange={e => setToolSearch(e.target.value)}
                  className="input-dark pl-9 py-2 text-sm"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      activeCategory === cat
                        ? 'bg-brand-500 text-white shadow-glow-sm'
                        : 'text-dark-400 hover:text-dark-200 hover:bg-white/5'
                    }`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7 gap-3">
              <AnimatePresence>
                {filteredTools.map((tool, i) => (
                  <motion.div
                    key={tool.path}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: i * 0.03 }}
                    whileHover={{ scale: 1.05, y: -4 }}
                    whileTap={{ scale: 0.97 }}>
                    <Link href={tool.path} className="tool-card block h-full">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${tool.color}
                        flex items-center justify-center shadow-lg`}>
                        <tool.icon size={20} className="text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <p className="text-xs font-semibold text-dark-100">{tool.label}</p>
                          {tool.pro && <span className="badge-pro">PRO</span>}
                        </div>
                        <p className="text-[11px] text-dark-500 mt-0.5 leading-tight">{tool.desc}</p>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {filteredTools.length === 0 && (
              <div className="text-center py-16">
                <p className="text-dark-500">No tools found for &ldquo;{toolSearch}&rdquo;</p>
              </div>
            )}

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-center mt-10">
              <Link href="/dashboard" className="btn-primary px-8 py-3 text-base rounded-xl inline-flex">
                Open All Tools <ArrowRight size={16} />
              </Link>
            </motion.div>
          </div>
        </section>

        {/* ── Features ──────────────────────────────────── */}
        <section className="py-24 px-4 sm:px-6 bg-dark-900/40">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16">
              <h2 className="font-display text-4xl font-bold text-white mb-4">Why SarthiPDF?</h2>
              <p className="text-dark-400 text-lg">Built for privacy, speed, and power users.</p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass rounded-2xl p-7 group hover:border-white/12 transition-all card-hover">
                  <div className={`w-12 h-12 rounded-2xl ${f.bg} flex items-center justify-center mb-5
                    group-hover:scale-110 transition-transform`}>
                    <f.icon size={22} className={f.color} />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-dark-400 leading-relaxed">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How It Works ──────────────────────────────── */}
        <section className="py-24 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16">
              <h2 className="font-display text-4xl font-bold text-white mb-4">As Easy As 1-2-3</h2>
              <p className="text-dark-400 text-lg">No sign-ups. No waiting. Select a tool and go.</p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                { step: '01', title: 'Choose a Tool', desc: 'Pick from 14 powerful PDF tools.', icon: FileText },
                { step: '02', title: 'Upload Your File', desc: 'Drag & drop or click to upload any PDF.', icon: ArrowRight },
                { step: '03', title: 'Download Result', desc: 'Processed in-browser. Download instantly.', icon: Download },
              ].map((item, i) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12 }}
                  className="relative glass rounded-2xl p-8">
                  <div className="text-5xl font-black text-brand-500/15 mb-4 font-display">{item.step}</div>
                  <item.icon size={22} className="text-brand-400 mb-3" />
                  <h3 className="text-base font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-dark-400 leading-relaxed">{item.desc}</p>
                  {i < 2 && (
                    <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-0.5 bg-brand-500/30" />
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Comparison Table ──────────────────────────── */}
        <section className="py-24 px-4 sm:px-6 bg-dark-900/40">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12">
              <h2 className="font-display text-4xl font-bold text-white mb-4">
                SarthiPDF vs The Rest
              </h2>
              <p className="text-dark-400 text-lg">See why developers and teams choose us.</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8">
                    <th className="text-left px-6 py-4 text-dark-400 font-medium">Feature</th>
                    <th className="px-6 py-4 text-center text-brand-400 font-bold">SarthiPDF</th>
                    <th className="px-6 py-4 text-center text-dark-500 font-medium">ilovepdf</th>
                    <th className="px-6 py-4 text-center text-dark-500 font-medium">SmallPDF</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPETITORS.map((row, i) => (
                    <tr key={row.feature}
                      className={`border-b border-white/5 ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                      <td className="px-6 py-3.5 text-dark-300">{row.feature}</td>
                      <td className="px-6 py-3.5 text-center">
                        {row.sarthi
                          ? <Check size={16} className="text-brand-400 mx-auto" />
                          : <span className="text-dark-700 mx-auto block text-center">—</span>}
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        {row.ilovepdf
                          ? <Check size={16} className="text-emerald-400 mx-auto" />
                          : <span className="text-dark-700 mx-auto block text-center">—</span>}
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        {row.smallpdf
                          ? <Check size={16} className="text-emerald-400 mx-auto" />
                          : <span className="text-dark-700 mx-auto block text-center">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          </div>
        </section>

        {/* ── Enterprise CTA ────────────────────────────── */}
        <section className="py-24 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass rounded-3xl p-10 sm:p-16 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-500/6 to-violet-500/6 pointer-events-none" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-px bg-gradient-to-r from-transparent via-brand-500 to-transparent" />

              <div className="relative z-10">
                <div className="flex items-center justify-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600
                    flex items-center justify-center shadow-glow">
                    <Building2 size={22} className="text-white" />
                  </div>
                </div>
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
                  Need Enterprise Features?
                </h2>
                <p className="text-dark-400 text-lg max-w-xl mx-auto mb-8 leading-relaxed">
                  White-label, on-premise deployment, HIPAA/GDPR compliance, 
                  custom integrations, and dedicated support. Built for teams at scale.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link href="/enterprise"
                    className="btn-primary px-8 py-4 text-base rounded-xl shadow-2xl shadow-brand-500/25">
                    <Building2 size={18} />
                    Explore Enterprise
                  </Link>
                  <Link href="/pricing"
                    className="btn-secondary px-8 py-4 text-base rounded-xl">
                    View All Plans
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Final CTA ─────────────────────────────────── */}
        <section className="py-20 px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}>
              <h2 className="font-display text-4xl sm:text-5xl font-black text-white mb-4">
                Start Working With PDFs —{' '}
                <span className="text-gradient">Right Now</span>
              </h2>
              <p className="text-dark-400 text-lg mb-8">
                Free. Private. No sign-up. No limits on core tools.
              </p>
              <Link href="/dashboard"
                className="btn-primary px-12 py-5 text-lg rounded-2xl shadow-2xl shadow-brand-500/30 inline-flex">
                <Zap size={20} />
                Open SarthiPDF Free
              </Link>
            </motion.div>
          </div>
        </section>

        <Footer />
        <Toast />
      </div>
    </AppProvider>
  );
}
