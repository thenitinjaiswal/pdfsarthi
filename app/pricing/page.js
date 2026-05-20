'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, X, Zap, Star, Users, Building2, Sparkles, ChevronRight } from 'lucide-react';
import { AppProvider } from '@/context/AppContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Toast from '@/components/shared/Toast';



const PLANS = [
  {
    id: 'free',
    name: 'Free',
    icon: Zap,
    price: { monthly: 0, yearly: 0 },
    description: 'Perfect for occasional use',
    color: 'from-dark-700 to-dark-800',
    features: [
      { text: 'All 14 PDF tools',        included: true },
      { text: 'Up to 2 files/hour',       included: true },
      { text: '15 MB max file size',      included: true },
      { text: 'Browser-based processing', included: true },
      { text: 'No watermark on output',   included: false },
      { text: 'AI tools',                 included: false },
      { text: 'Cloud storage',            included: false },
      { text: 'Priority processing',      included: false },
      { text: 'API access',               included: false },
    ],
    cta: 'Get Started Free',
    ctaHref: '/dashboard',
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: Star,
    price: { monthly: 9.99, yearly: 79 },
    description: 'For professionals & power users',
    color: 'from-brand-500 to-violet-600',
    features: [
      { text: 'All 14 PDF tools',         included: true },
      { text: 'Unlimited files',           included: true },
      { text: 'Up to 1 GB file size',      included: true },
      { text: 'No ads, no watermarks',     included: true },
      { text: '50 AI operations/month',    included: true },
      { text: '50 GB cloud storage',       included: true },
      { text: 'Priority processing',       included: true },
      { text: 'API access (1K calls/mo)',  included: true },
      { text: 'SSO / SAML',               included: false },
    ],
    cta: 'Start Pro Free Trial',
    ctaHref: '/signup?plan=pro',
    highlight: true,
    badge: 'Most Popular',
  },
  {
    id: 'teams',
    name: 'Teams',
    icon: Users,
    price: { monthly: 24.99, yearly: 199 },
    priceSuffix: '/seat/mo',
    description: 'For growing teams (min 3 seats)',
    color: 'from-violet-500 to-purple-700',
    features: [
      { text: 'Everything in Pro',         included: true },
      { text: 'Team workspace',            included: true },
      { text: 'Shared file library',       included: true },
      { text: '200 AI ops/seat/month',     included: true },
      { text: '500 GB shared storage',     included: true },
      { text: 'Admin dashboard',           included: true },
      { text: 'Usage analytics',           included: true },
      { text: 'SSO (SAML)',                included: true },
      { text: 'Priority support',          included: true },
    ],
    cta: 'Start Teams Trial',
    ctaHref: '/signup?plan=teams',
    highlight: false,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    icon: Building2,
    price: { monthly: null, yearly: null },
    description: 'For large organizations',
    color: 'from-amber-500 to-orange-600',
    features: [
      { text: 'Everything in Teams',       included: true },
      { text: 'On-premise deployment',     included: true },
      { text: 'White-label & custom domain',included: true },
      { text: 'Unlimited AI operations',   included: true },
      { text: 'Custom storage',            included: true },
      { text: 'HIPAA / SOC2 / GDPR',       included: true },
      { text: 'Dedicated infrastructure',  included: true },
      { text: '99.9% SLA uptime',          included: true },
      { text: 'Dedicated CSM',             included: true },
    ],
    cta: 'Contact Sales',
    ctaHref: '/enterprise',
    highlight: false,
  },
];

const FAQ = [
  { q: 'Can I cancel anytime?', a: 'Yes. Cancel anytime from your account settings. You keep access until the end of your billing period.' },
  { q: 'Is there a free trial for Pro?', a: 'Yes — 14-day free trial on Pro and Teams plans, no credit card required.' },
  { q: 'Are my files secure?', a: 'All processing happens in your browser for free tools. Pro users get encrypted cloud storage with AES-256.' },
  { q: 'Can I get a refund?', a: 'We offer a 30-day money-back guarantee on all paid plans.' },
  { q: 'What payment methods do you accept?', a: 'Visa, Mastercard, American Express, PayPal, and UPI/Razorpay for India.' },
  { q: 'Do you offer discounts for nonprofits?', a: 'Yes — contact us at sales@sarthipdf.com for nonprofit and educational discounts.' },
];

export default function PricingPage() {
  const [billing, setBilling] = useState('monthly');

  return (
    <AppProvider>
      <div className="min-h-screen bg-dark-950 text-dark-50">
        <Navbar />

        {/* Hero */}
        <section className="pt-28 pb-16 px-4 sm:px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-brand-500/25 text-brand-400 text-sm font-medium mb-6">
              <Sparkles size={14} /> Simple, transparent pricing
            </div>
            <h1 className="font-display text-5xl sm:text-6xl font-black text-white mb-4">
              Plans for <span className="text-gradient">Every Team</span>
            </h1>
            <p className="text-dark-400 text-lg max-w-xl mx-auto mb-8">
              Start free. Upgrade when you need more power. No hidden fees.
            </p>

            {/* Billing toggle */}
            <div className="inline-flex items-center gap-3 glass rounded-xl p-1.5 border border-white/8">
              <button onClick={() => setBilling('monthly')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${billing === 'monthly' ? 'bg-brand-500 text-white shadow-glow-sm' : 'text-dark-400 hover:text-dark-200'}`}>
                Monthly
              </button>
              <button onClick={() => setBilling('yearly')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${billing === 'yearly' ? 'bg-brand-500 text-white shadow-glow-sm' : 'text-dark-400 hover:text-dark-200'}`}>
                Yearly
                <span className="ml-2 text-xs font-bold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded-full">
                  Save 34%
                </span>
              </button>
            </div>
          </motion.div>
        </section>

        {/* Plans grid */}
        <section className="px-4 sm:px-6 pb-24">
          <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`pricing-card relative flex flex-col p-6 ${plan.highlight ? 'featured' : ''}`}
                style={{ background: plan.highlight ? 'rgba(99,102,241,0.07)' : 'rgba(255,255,255,0.02)' }}>

                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-brand-500 to-violet-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-glow-sm">
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Plan header */}
                <div className="mb-6">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-4 shadow-md`}>
                    <plan.icon size={18} className="text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
                  <p className="text-xs text-dark-500">{plan.description}</p>

                  <div className="mt-4">
                    {plan.price.monthly === null ? (
                      <p className="text-3xl font-black text-white">Custom</p>
                    ) : plan.price.monthly === 0 ? (
                      <p className="text-3xl font-black text-white">Free</p>
                    ) : (
                      <div>
                        <span className="text-3xl font-black text-white">
                          ${billing === 'yearly' ? (plan.price.yearly / 12).toFixed(2) : plan.price.monthly}
                        </span>
                        <span className="text-dark-500 text-sm ml-1">
                          {plan.priceSuffix || '/month'}
                        </span>
                        {billing === 'yearly' && plan.price.yearly && (
                          <p className="text-xs text-emerald-400 mt-1">
                            ${plan.price.yearly}/year — save ${Math.round(plan.price.monthly * 12 - plan.price.yearly)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Features */}
                <ul className="flex-1 space-y-2.5 mb-6">
                  {plan.features.map(f => (
                    <li key={f.text} className={`flex items-start gap-2 text-sm ${f.included ? 'text-dark-300' : 'text-dark-700'}`}>
                      {f.included
                        ? <Check size={15} className="text-brand-400 flex-shrink-0 mt-0.5" />
                        : <X size={15} className="text-dark-700 flex-shrink-0 mt-0.5" />}
                      {f.text}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link href={plan.ctaHref}
                  className={`w-full py-3 rounded-xl text-center text-sm font-semibold transition-all ${
                    plan.highlight
                      ? 'btn-primary justify-center'
                      : 'btn-secondary justify-center'
                  }`}>
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="py-24 px-4 sm:px-6 bg-dark-900/40">
          <div className="max-w-3xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="text-center mb-12">
              <h2 className="font-display text-4xl font-bold text-white mb-4">Frequently Asked Questions</h2>
              <p className="text-dark-400">Everything you need to know about SarthiPDF pricing.</p>
            </motion.div>
            <div className="space-y-3">
              {FAQ.map((item, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                  className="glass rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-white mb-2">{item.q}</h3>
                  <p className="text-sm text-dark-400 leading-relaxed">{item.a}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Enterprise CTA */}
        <section className="py-20 px-4 sm:px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="font-display text-3xl font-bold text-white mb-4">Need a custom plan?</h2>
            <p className="text-dark-400 mb-8 max-w-lg mx-auto">
              Enterprise plans with custom pricing, on-premise deployment, and dedicated support are available.
            </p>
            <Link href="/enterprise" className="btn-primary px-10 py-4 text-base rounded-xl inline-flex shadow-2xl shadow-brand-500/25">
              <Building2 size={18} /> Talk to Sales <ChevronRight size={16} />
            </Link>
          </motion.div>
        </section>

        <Footer />
        <Toast />
      </div>
    </AppProvider>
  );
}
