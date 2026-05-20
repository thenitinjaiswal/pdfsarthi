'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Send, Loader, FileText, Bot, User, Lock } from 'lucide-react';
import Link from 'next/link';
import ToolHeader from '@/components/tools/ToolHeader';
import UploadZone from '@/components/tools/UploadZone';
import { formatSize } from '@/lib/utils';

const SAMPLE_QUESTIONS = [
  'Summarize this document in 5 bullet points',
  'What are the key dates mentioned?',
  'Extract all action items',
  'What is the main topic of this PDF?',
];

export default function AIChatPage() {
  const [file, setFile]       = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async (text) => {
    if (!text.trim()) return;
    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    // Simulate AI response (real implementation requires API key)
    await new Promise(r => setTimeout(r, 1200));
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: '🔐 AI PDF Chat requires a Pro plan. Upgrade to unlock GPT-4 powered document analysis, summarization, and Q&A.',
    }]);
    setLoading(false);
  };

  return (
    <div>
      <ToolHeader icon={Sparkles} title="AI PDF Chat" description="Chat with your PDF using GPT-4. Ask questions, get summaries, extract insights." badge="PRO" />

      <div className="grid lg:grid-cols-3 gap-6" style={{ minHeight: 480 }}>
        {/* Upload sidebar */}
        <div className="space-y-4">
          {!file
            ? <UploadZone onFiles={([f]) => setFile(f)} accept=".pdf" label="Upload PDF to Chat" />
            : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="glass rounded-2xl p-5 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-500/15 flex items-center justify-center">
                    <FileText size={16} className="text-brand-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dark-200 truncate">{file.name}</p>
                    <p className="text-xs text-dark-500">{formatSize(file.size)}</p>
                  </div>
                </div>
                <button onClick={() => { setFile(null); setMessages([]); }}
                  className="text-xs text-dark-600 hover:text-red-400 transition-colors">× Remove</button>
              </motion.div>
            )}

          <div className="glass rounded-2xl p-5">
            <p className="text-xs font-semibold text-dark-500 uppercase tracking-widest mb-3">Sample Questions</p>
            <div className="space-y-2">
              {SAMPLE_QUESTIONS.map(q => (
                <button key={q} onClick={() => sendMessage(q)}
                  className="w-full text-left text-xs text-dark-400 hover:text-brand-400 py-2 px-3 rounded-lg hover:bg-brand-500/8 transition-all border border-transparent hover:border-brand-500/20">
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Upgrade CTA */}
          <div className="glass rounded-2xl p-5 border border-brand-500/20 bg-brand-500/5">
            <div className="flex items-center gap-2 mb-2">
              <Lock size={14} className="text-brand-400" />
              <p className="text-sm font-semibold text-brand-300">Pro Feature</p>
            </div>
            <p className="text-xs text-dark-500 mb-4">Upgrade to Pro for GPT-4 powered chat with unlimited questions.</p>
            <Link href="/pricing" className="btn-primary w-full justify-center py-2.5 text-sm">
              <Sparkles size={14} /> Upgrade to Pro
            </Link>
          </div>
        </div>

        {/* Chat panel */}
        <div className="lg:col-span-2 flex flex-col glass rounded-2xl overflow-hidden" style={{ minHeight: 480 }}>
          <div className="px-4 py-3 border-b border-white/8 flex items-center gap-2">
            <Bot size={16} className="text-brand-400" />
            <p className="text-sm font-semibold text-dark-300">AI Chat</p>
            <span className="badge-pro ml-auto">PRO</span>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 space-y-4 overflow-y-auto custom-scroll">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12">
                <div className="w-14 h-14 rounded-2xl bg-brand-500/15 flex items-center justify-center">
                  <Sparkles size={24} className="text-brand-400" />
                </div>
                <p className="text-sm text-dark-400">Upload a PDF and start chatting with AI</p>
                <p className="text-xs text-dark-600">Powered by GPT-4 — requires Pro plan</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-brand-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot size={13} className="text-brand-400" />
                  </div>
                )}
                <div className={`max-w-xs sm:max-w-sm px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-brand-500/20 text-brand-100 rounded-tr-sm'
                    : 'glass text-dark-300 rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-dark-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User size={13} className="text-dark-400" />
                  </div>
                )}
              </motion.div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                  <Bot size={13} className="text-brand-400" />
                </div>
                <div className="glass px-4 py-3 rounded-2xl rounded-tl-sm">
                  <div className="flex gap-1">
                    {[0,1,2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/8">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
                placeholder="Ask anything about your PDF..."
                className="input-dark flex-1"
                disabled={!file}
              />
              <button onClick={() => sendMessage(input)}
                disabled={!file || loading || !input.trim()}
                className="btn-primary px-4 py-2 rounded-xl">
                {loading ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
