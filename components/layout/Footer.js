'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Zap, Shield, Globe, Mail, ExternalLink
} from 'lucide-react';

const GithubIcon = ({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>;

const TwitterIcon = ({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>;

const LinkedinIcon = ({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>;

const FOOTER_LINKS = [
  {
    heading: 'Tools',
    links: [
      { label: 'Merge PDF',    href: '/tools/merge' },
      { label: 'Split PDF',    href: '/tools/split' },
      { label: 'Compress PDF', href: '/tools/compress' },
      { label: 'Convert PDF',  href: '/tools/convert' },
      { label: 'Edit PDF',     href: '/tools/edit' },
      { label: 'Sign PDF',     href: '/tools/signature' },
    ],
  },
  {
    heading: 'Security',
    links: [
      { label: 'Protect PDF',  href: '/tools/protect' },
      { label: 'Unlock PDF',   href: '/tools/unlock' },
      { label: 'Watermark',    href: '/tools/watermark' },
      { label: 'OCR',          href: '/tools/ocr' },
    ],
  },
  {
    heading: 'Product',
    links: [
      { label: 'Pricing',      href: '/pricing' },
      { label: 'Enterprise',   href: '/enterprise' },
      { label: 'API',          href: '/api-docs' },
      { label: 'Changelog',    href: '/changelog' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About',        href: '/about' },
      { label: 'Blog',         href: '/blog' },
      { label: 'Privacy',      href: '/privacy' },
      { label: 'Terms',        href: '/terms' },
      { label: 'Security',     href: '/security' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-dark-950/80">
      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8">
          {/* Brand col */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600
                flex items-center justify-center shadow-glow-sm">
                <Zap size={16} className="text-white" />
              </div>
              <span className="text-base font-bold">
                Sarthi<span className="text-gradient">PDF</span>
              </span>
            </Link>
            <p className="text-sm text-dark-500 leading-relaxed mb-4 max-w-xs">
              The most powerful free PDF toolkit. 100% private, no file uploads, AI-powered features.
            </p>
            {/* Trust badges */}
            <div className="flex flex-wrap gap-2 mb-5">
              {[
                { icon: Shield, label: 'GDPR Compliant' },
                { icon: Globe,  label: 'HTTPS Always' },
              ].map(({ icon: Icon, label }) => (
                <span key={label}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg
                    bg-white/4 border border-white/8 text-xs text-dark-400">
                  <Icon size={11} className="text-brand-400" />
                  {label}
                </span>
              ))}
            </div>
            {/* Social icons */}
            <div className="flex items-center gap-2">
              {[
                { icon: GithubIcon,   href: 'https://github.com/sarthipdf',   label: 'GitHub' },
                { icon: TwitterIcon,  href: 'https://twitter.com/sarthipdf',  label: 'Twitter' },
                { icon: LinkedinIcon, href: 'https://linkedin.com/company/sarthipdf', label: 'LinkedIn' },
                { icon: Mail,         href: 'mailto:hello@sarthipdf.com',     label: 'Email' },
              ].map(({ icon: Icon, href, label }) => (
                <a key={label} href={href} target="_blank" rel="noreferrer"
                  aria-label={label}
                  className="w-8 h-8 rounded-lg bg-white/4 border border-white/8
                    flex items-center justify-center text-dark-500
                    hover:text-brand-400 hover:border-brand-500/30
                    hover:bg-brand-500/10 transition-all">
                  <Icon size={14} />
                </a>
              ))}
            </div>
          </div>

          {/* Link cols */}
          {FOOTER_LINKS.map(col => (
            <div key={col.heading}>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-dark-500 mb-3">
                {col.heading}
              </h4>
              <ul className="space-y-2">
                {col.links.map(l => (
                  <li key={l.href}>
                    <Link href={l.href}
                      className="text-sm text-dark-500 hover:text-dark-200 transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row
          items-center justify-between gap-3">
          <p className="text-xs text-dark-600 text-center">
            © {new Date().getFullYear()} SarthiPDF · All rights reserved
          </p>
          <p className="text-xs text-dark-700 text-center">
            All PDF processing happens in your browser · Zero data collection
          </p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-xs text-dark-600 hover:text-dark-400 transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-xs text-dark-600 hover:text-dark-400 transition-colors">
              Terms
            </Link>
            <Link href="/security" className="text-xs text-dark-600 hover:text-dark-400 transition-colors">
              Security
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
