'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Building2, Shield, Globe, CheckCircle, ChevronRight,
  BarChart3, Users, Lock, Zap, Star, ArrowRight,
  Mail, Phone, Calendar, FileText, Briefcase, Heart, BookOpen, DollarSign
} from 'lucide-react';
import { AppProvider } from '@/context/AppContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Toast from '@/components/shared/Toast';

const ENTERPRISE_FEATURES = [
  { icon: Shield,   title: 'HIPAA / SOC2 / GDPR',     desc: 'Full compliance packages with BAA available for healthcare.' },
  { icon: Globe,    title: 'On-Premise Deployment',    desc: 'Run SarthiPDF on your own infrastructure. Full data sovereignty.' },
  { icon: Zap,      title: 'White-Label',              desc: 'Your branding, your domain, your product — powered by SarthiPDF.' },
  { icon: Users,    title: 'SSO / SAML',               desc: 'Single sign-on with Okta, Azure AD, Google Workspace, and more.' },
  { icon: BarChart3,'title': 'Usage Analytics',        desc: 'Detailed dashboards for admin teams — usage, costs, productivity.' },
  { icon: Lock,     title: 'Dedicated Infrastructure', desc: 'No shared infrastructure. Isolated compute for your org\'s data.' },
];

const SOLUTIONS = [
  { id: 'legal',    icon: Briefcase, label: 'Legal',      desc: 'Contract management, redaction, e-signatures, audit trails for law firms and legal teams.' },
  { id: 'health',   icon: Heart,     label: 'Healthcare', desc: 'HIPAA-compliant PDF workflows, patient form digitization, medical record management.' },
  { id: 'finance',  icon: DollarSign,label: 'Finance',    desc: 'Secure document processing, financial report generation, regulatory compliance.' },
  { id: 'edu',      icon: BookOpen,  label: 'Education',  desc: 'Exam PDF creation, student form processing, bulk document distribution.' },
  { id: 'hr',       icon: Users,     label: 'HR',         desc: 'Onboarding forms, e-signatures, policy document distribution, bulk processing.' },
];

const TRUST = [
  { label: '99.9%', sub: 'Uptime SLA' },
  { label: 'AES-256', sub: 'Encryption' },
  { label: 'SOC2', sub: 'Type II Ready' },
  { label: '24/7', sub: 'Support' },
];

export default function EnterprisePage() {
  const [activeSolution, setActiveSolution] = useState('legal');
  const [formData, setFormData] = useState({ name: '', email: '', company: '', size: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const currentSolution = SOLUTIONS.find(s => s.id === activeSolution);

  return (
    <AppProvider>
      <div className="min-h-screen bg-dark-950 text-dark-50 overflow-x-hidden">
        <Navbar />

        {/* Hero */}
        <section className="relative pt-28 pb-20 px-4 sm:px-6 text-center overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-brand-500/5 rounded-full blur-3xl" />
            <div className="absolute inset-0 bg-grid opacity-60" />
          </div>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-brand-500/25 text-brand-400 text-sm font-medium mb-6">
              <Building2 size={14} /> Enterprise-Grade PDF Infrastructure
            </div>
            <h1 className="font-display text-5xl sm:text-6xl font-black text-white mb-6 leading-tight">
              PDF Tools Built for<br /><span className="text-gradient">Enterprise Scale</span>
            </h1>
            <p className="text-dark-400 text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              White-label deployment, on-premise options, HIPAA/SOC2/GDPR compliance,
              dedicated infrastructure, and a team that treats your success as ours.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="#demo-form" className="btn-primary px-8 py-4 text-base rounded-xl shadow-2xl shadow-brand-500/25">
                <Calendar size={18} /> Request a Demo
              </a>
              <Link href="/pricing" className="btn-secondary px-8 py-4 text-base rounded-xl">
                View Pricing <ChevronRight size={16} />
              </Link>
            </div>
          </motion.div>
        </section>

        {/* Trust stats */}
        <section className="py-12 px-4 sm:px-6 border-y border-white/5">
          <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6">
            {TRUST.map((t, i) => (
              <motion.div key={t.sub} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="text-center">
                <p className="text-2xl font-black text-brand-400 font-display">{t.label}</p>
                <p className="text-xs text-dark-500 mt-1">{t.sub}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Enterprise features */}
        <section className="py-24 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
              <h2 className="font-display text-4xl font-bold text-white mb-4">Built for Security & Scale</h2>
              <p className="text-dark-400 text-lg">Everything you need to deploy SarthiPDF across your organization.</p>
            </motion.div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {ENTERPRISE_FEATURES.map((f, i) => (
                <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                  className="glass rounded-2xl p-6 group hover:border-brand-500/20 transition-all card-hover">
                  <div className="w-11 h-11 rounded-xl bg-brand-500/15 flex items-center justify-center mb-4 group-hover:bg-brand-500/25 transition-all">
                    <f.icon size={20} className="text-brand-400" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-dark-400 leading-relaxed">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Industry Solutions */}
        <section className="py-24 px-4 sm:px-6 bg-dark-900/40">
          <div className="max-w-5xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
              <h2 className="font-display text-4xl font-bold text-white mb-4">Solutions by Industry</h2>
              <p className="text-dark-400 text-lg">Tailored PDF workflows for your sector.</p>
            </motion.div>
            <div className="flex items-center gap-2 flex-wrap justify-center mb-8">
              {SOLUTIONS.map(s => (
                <button key={s.id} onClick={() => setActiveSolution(s.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                    activeSolution === s.id
                      ? 'bg-brand-500 border-brand-500 text-white shadow-glow-sm'
                      : 'border-white/8 text-dark-400 hover:border-white/15 hover:text-dark-200'
                  }`}>
                  <s.icon size={14} /> {s.label}
                </button>
              ))}
            </div>
            {currentSolution && (
              <motion.div key={activeSolution} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-brand-500/15 flex items-center justify-center mx-auto mb-4">
                  <currentSolution.icon size={24} className="text-brand-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{currentSolution.label} Solutions</h3>
                <p className="text-dark-400 max-w-xl mx-auto leading-relaxed">{currentSolution.desc}</p>
                <Link href="#demo-form" className="btn-primary px-6 py-3 rounded-xl inline-flex mt-6 text-sm">
                  Get {currentSolution.label} Demo <ArrowRight size={15} />
                </Link>
              </motion.div>
            )}
          </div>
        </section>

        {/* ROI Calculator */}
        <section className="py-24 px-4 sm:px-6">
          <div className="max-w-3xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="glass rounded-3xl p-10 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-violet-500/5 pointer-events-none" />
              <div className="relative z-10">
                <BarChart3 size={36} className="text-brand-400 mx-auto mb-4" />
                <h2 className="font-display text-3xl font-bold text-white mb-3">Calculate Your ROI</h2>
                <p className="text-dark-400 mb-6">Teams using SarthiPDF Enterprise save an average of 8 hours/week on document workflows.</p>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { value: '8h', label: 'Saved per week' },
                    { value: '60%', label: 'Faster processing' },
                    { value: '$12K', label: 'Avg annual savings' },
                  ].map(r => (
                    <div key={r.label} className="glass rounded-xl p-4">
                      <p className="text-2xl font-black text-brand-400">{r.value}</p>
                      <p className="text-xs text-dark-500 mt-1">{r.label}</p>
                    </div>
                  ))}
                </div>
                <a href="#demo-form" className="btn-primary px-8 py-3 rounded-xl inline-flex">
                  <Calendar size={16} /> Schedule ROI Assessment
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Demo request form */}
        <section id="demo-form" className="py-24 px-4 sm:px-6 bg-dark-900/40">
          <div className="max-w-2xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
              <h2 className="font-display text-4xl font-bold text-white mb-3">Request a Demo</h2>
              <p className="text-dark-400">Talk to our enterprise team. We'll set up a personalized walkthrough within 24 hours.</p>
            </motion.div>

            {submitted ? (
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                className="glass rounded-2xl p-10 text-center">
                <CheckCircle size={48} className="text-emerald-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Demo Request Received!</h3>
                <p className="text-dark-400">Our enterprise team will contact you within 24 hours at <strong className="text-white">{formData.email}</strong></p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="glass rounded-2xl p-8 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-dark-400 mb-2 block">Full Name *</label>
                    <input required type="text" value={formData.name}
                      onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                      placeholder="Jane Smith" className="input-dark" />
                  </div>
                  <div>
                    <label className="text-xs text-dark-400 mb-2 block">Work Email *</label>
                    <input required type="email" value={formData.email}
                      onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                      placeholder="jane@company.com" className="input-dark" />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-dark-400 mb-2 block">Company *</label>
                    <input required type="text" value={formData.company}
                      onChange={e => setFormData(p => ({ ...p, company: e.target.value }))}
                      placeholder="Acme Corp" className="input-dark" />
                  </div>
                  <div>
                    <label className="text-xs text-dark-400 mb-2 block">Team Size</label>
                    <select value={formData.size} onChange={e => setFormData(p => ({ ...p, size: e.target.value }))}
                      className="input-dark">
                      {['1-10', '11-50', '51-200', '201-1000', '1000+'].map(s => (
                        <option key={s} value={s} style={{ background: '#1a1a1a' }}>{s} employees</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-dark-400 mb-2 block">How can we help?</label>
                  <textarea value={formData.message}
                    onChange={e => setFormData(p => ({ ...p, message: e.target.value }))}
                    placeholder="Tell us about your PDF workflow needs..."
                    rows={4} className="input-dark resize-none" />
                </div>
                <button type="submit" className="btn-action">
                  <Calendar size={18} /> Request Enterprise Demo
                </button>
                <p className="text-xs text-dark-600 text-center">
                  By submitting, you agree to our <Link href="/privacy" className="text-brand-400 hover:underline">Privacy Policy</Link>.
                </p>
              </form>
            )}
          </div>
        </section>

        <Footer />
        <Toast />
      </div>
    </AppProvider>
  );
}
