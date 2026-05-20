'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeftRight, Download, Loader, FileText, Image, ImageDown, Code, ChevronRight, Lock } from 'lucide-react';
import ToolHeader from '@/components/tools/ToolHeader';
import UploadZone from '@/components/tools/UploadZone';
import { useToast } from '@/hooks/useToast';
import { formatSize, downloadBlob } from '@/lib/utils';
import Link from 'next/link';

const TO_PDF = [
  { id: 'jpg-to-pdf',  label: 'JPG / Image to PDF', icon: Image,      accept: 'image/*',  href: '/tools/jpg-to-pdf',  available: true,  desc: 'Convert any image to a PDF page' },
  { id: 'html-to-pdf', label: 'HTML to PDF',         icon: Code,       accept: '.html',    href: null,                 available: false, desc: 'Render any webpage as a PDF' },
];

const FROM_PDF = [
  { id: 'pdf-to-jpg',  label: 'PDF to JPG',          icon: ImageDown,  accept: '.pdf',     href: '/tools/pdf-to-jpg',  available: true,  desc: 'Export every page as a JPG image' },
  { id: 'pdf-to-word', label: 'PDF to Word',          icon: FileText,   accept: '.pdf',     href: null,                 available: false, desc: 'Convert PDF to editable .docx' },
  { id: 'pdf-to-excel',label: 'PDF to Excel',         icon: FileText,   accept: '.pdf',     href: null,                 available: false, desc: 'Extract tables to spreadsheet' },
  { id: 'pdf-to-pptx', label: 'PDF to PowerPoint',   icon: FileText,   accept: '.pdf',     href: null,                 available: false, desc: 'Convert PDF slides to .pptx' },
];

function ConvertCard({ tool }) {
  return (
    <div className={`relative rounded-2xl border p-5 transition-all ${tool.available ? 'glass hover:border-brand-500/40 hover:bg-brand-500/5' : 'bg-dark-900/30 border-white/5 opacity-60'}`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tool.available ? 'bg-brand-500/15' : 'bg-dark-800'}`}>
          <tool.icon size={18} className={tool.available ? 'text-brand-400' : 'text-dark-500'} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-dark-100">{tool.label}</p>
            {!tool.available && (
              <span className="text-[10px] bg-dark-700 text-dark-500 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                <Lock size={9} /> Pro
              </span>
            )}
          </div>
          <p className="text-xs text-dark-500 mt-0.5">{tool.desc}</p>
        </div>
        {tool.available && tool.href && (
          <ChevronRight size={16} className="text-dark-500 shrink-0 mt-1" />
        )}
      </div>
      {tool.available && tool.href && (
        <Link href={tool.href} className="absolute inset-0 rounded-2xl" />
      )}
    </div>
  );
}

export default function ConvertPDFPage() {
  return (
    <div>
      <ToolHeader icon={ArrowLeftRight} title="Convert PDF" description="Convert PDFs to and from popular formats — images, documents, and more." />

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Convert TO PDF */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-5 bg-brand-500 rounded-full" />
            <h2 className="text-sm font-bold text-white uppercase tracking-widest">Convert To PDF</h2>
          </div>
          <div className="space-y-3">
            {TO_PDF.map(t => <ConvertCard key={t.id} tool={t} />)}
          </div>
        </div>

        {/* Convert FROM PDF */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-5 bg-violet-500 rounded-full" />
            <h2 className="text-sm font-bold text-white uppercase tracking-widest">Convert From PDF</h2>
          </div>
          <div className="space-y-3">
            {FROM_PDF.map(t => <ConvertCard key={t.id} tool={t} />)}
          </div>
        </div>
      </div>

      {/* Pro Banner */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="mt-10 rounded-2xl border border-brand-500/20 bg-gradient-to-r from-brand-500/10 to-violet-500/10 p-6 flex flex-col sm:flex-row items-center gap-4">
        <div className="flex-1">
          <p className="text-sm font-bold text-white mb-1">Need Word, Excel & PowerPoint Conversion?</p>
          <p className="text-xs text-dark-400">PDF ↔ Word, Excel, PowerPoint conversions require cloud processing. Available on the Pro plan.</p>
        </div>
        <Link href="/pricing" className="btn-action whitespace-nowrap shrink-0">
          Upgrade to Pro
        </Link>
      </motion.div>
    </div>
  );
}
