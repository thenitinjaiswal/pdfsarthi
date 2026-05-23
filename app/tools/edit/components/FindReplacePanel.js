'use client';

import { useEditor } from '../context/EditorContext';
import {
  Search, X, ChevronUp, ChevronDown,
  CaseSensitive, Replace, ReplaceAll
} from 'lucide-react';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Helper: build highlighted HTML for a text item ────────────────────────────
export function buildHighlightHtml(text, query, matchCase, isCurrentMatch) {
  if (!query || !text) return null;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, matchCase ? 'g' : 'gi');
  const parts = text.split(regex);
  if (parts.length < 3) return null; // no match (split with capture keeps delimiters)

  // Check if any odd-index segment is non-empty (i.e., a real match)
  const hasMatch = parts.some((p, i) => i % 2 === 1 && p.length > 0);
  if (!hasMatch) return null;

  return parts
    .map((part, i) => {
      if (i % 2 === 1 && part.length > 0) {
        const bg = isCurrentMatch
          ? 'rgba(255,150,0,0.55)'   // orange = current focused match
          : 'rgba(255,220,0,0.35)';  // yellow = other matches
        return `<mark style="background:${bg};border-radius:2px;padding:0 1px;color:inherit">${part}</mark>`;
      }
      return part;
    })
    .join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// FIND & REPLACE PANEL
// ─────────────────────────────────────────────────────────────────────────────
export default function FindReplacePanel() {
  const {
    activeTool, setActiveTool,
    findQuery, setFindQuery,
    replaceQuery, setReplaceQuery,
    matchCase, setMatchCase,
    pagesData,
    setSelectedElement,
    findAndReplaceOne,
    findAndReplaceAll,
  } = useEditor();

  const [currentIdx, setCurrentIdx] = useState(0);
  const findInputRef  = useRef(null);

  // ── Compute all matches across all pages ────────────────────────────────────
  const matches = useMemo(() => {
    if (!findQuery.trim() || !pagesData.length) return [];
    const searchFor = matchCase ? findQuery : findQuery.toLowerCase();
    const results = [];
    pagesData.forEach(page => {
      (page.originalTextItems || []).forEach(item => {
        const text = (item.newText ?? item.str ?? '');
        const searchIn = matchCase ? text : text.toLowerCase();
        if (searchIn.includes(searchFor)) {
          results.push({ pageNum: page.pageNum, itemId: item.id });
        }
      });
    });
    return results;
  }, [pagesData, findQuery, matchCase]);

  // Reset idx when query or case changes
  useEffect(() => { setCurrentIdx(0); }, [findQuery, matchCase]);

  // Auto-focus find input when panel opens
  useEffect(() => {
    if (activeTool === 'find-replace') {
      setTimeout(() => findInputRef.current?.focus(), 80);
    }
  }, [activeTool]);

  // ── Navigate to a specific match ────────────────────────────────────────────
  const navigateTo = useCallback((idx) => {
    if (!matches.length) return;
    const match = matches[idx];
    setSelectedElement({ pageNum: match.pageNum, type: 'text-item', id: match.itemId });
    // Scroll the overlay div into view
    setTimeout(() => {
      const el = document.getElementById(`text-item-wrapper-${match.itemId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  }, [matches, setSelectedElement]);

  const handlePrev = () => {
    if (!matches.length) return;
    const newIdx = (currentIdx - 1 + matches.length) % matches.length;
    setCurrentIdx(newIdx);
    navigateTo(newIdx);
  };

  const handleNext = () => {
    if (!matches.length) return;
    const newIdx = (currentIdx + 1) % matches.length;
    setCurrentIdx(newIdx);
    navigateTo(newIdx);
  };

  const handleReplaceOne = () => {
    if (!matches.length) return;
    const match = matches[currentIdx];
    findAndReplaceOne(match.pageNum, match.itemId);
    // After replace, that match disappears; the same index now points to the next
    // (matches list will re-compute and shrink by 1)
  };

  const handleReplaceAll = () => {
    findAndReplaceAll();
    setCurrentIdx(0);
  };

  const close = () => {
    setActiveTool('select');
    setFindQuery('');
  };

  const noQuery = !findQuery.trim();
  const matchLabel = noQuery
    ? ''
    : matches.length === 0
      ? 'No results'
      : `${currentIdx + 1} of ${matches.length}`;

  if (activeTool !== 'find-replace') return null;

  return (
    <motion.div
      key="find-replace-panel"
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="overflow-hidden border-b border-white/5 bg-dark-900/80 backdrop-blur"
    >
      <div className="px-6 py-2.5 flex flex-wrap items-center gap-3">

        {/* ── Find row ──────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Search size={14} className="text-dark-500 shrink-0" />

          {/* Find input */}
          <div className="relative flex items-center flex-1 min-w-0 max-w-xs">
            <input
              ref={findInputRef}
              id="find-replace-find-input"
              type="text"
              value={findQuery}
              onChange={e => setFindQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.shiftKey ? handlePrev() : handleNext(); }
                if (e.key === 'Escape') close();
              }}
              placeholder="Find text…"
              className="w-full bg-dark-800 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-dark-500
                         focus:outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/30 transition-all pr-20"
            />
            {/* Match counter badge */}
            {!noQuery && (
              <span className={`absolute right-8 text-[10px] font-mono font-semibold px-1 ${
                matches.length === 0 ? 'text-red-400' : 'text-dark-400'
              }`}>
                {matchLabel}
              </span>
            )}
            {/* Clear find */}
            {findQuery && (
              <button
                onClick={() => setFindQuery('')}
                className="absolute right-2 p-0.5 text-dark-500 hover:text-white transition-colors"
              >
                <X size={11} />
              </button>
            )}
          </div>

          {/* Case-sensitive toggle */}
          <button
            onClick={() => setMatchCase(v => !v)}
            title="Match case"
            className={`p-1.5 rounded-lg border transition-all text-xs font-bold ${
              matchCase
                ? 'bg-brand-500/20 border-brand-500/50 text-brand-400'
                : 'border-white/10 text-dark-500 hover:text-white hover:border-white/20'
            }`}
          >
            <CaseSensitive size={13} />
          </button>

          {/* Prev / Next */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={handlePrev}
              disabled={matches.length === 0}
              title="Previous match (Shift+Enter)"
              className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            >
              <ChevronUp size={14} />
            </button>
            <button
              onClick={handleNext}
              disabled={matches.length === 0}
              title="Next match (Enter)"
              className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            >
              <ChevronDown size={14} />
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-white/10 shrink-0" />

        {/* ── Replace row ───────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Replace size={14} className="text-dark-500 shrink-0" />

          {/* Replace input */}
          <div className="relative flex items-center flex-1 min-w-0 max-w-xs">
            <input
              id="find-replace-replace-input"
              type="text"
              value={replaceQuery}
              onChange={e => setReplaceQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') close(); }}
              placeholder="Replace with…"
              className="w-full bg-dark-800 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-dark-500
                         focus:outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/30 transition-all pr-7"
            />
            {replaceQuery && (
              <button
                onClick={() => setReplaceQuery('')}
                className="absolute right-2 p-0.5 text-dark-500 hover:text-white transition-colors"
              >
                <X size={11} />
              </button>
            )}
          </div>

          {/* Replace one */}
          <button
            onClick={handleReplaceOne}
            disabled={matches.length === 0 || noQuery}
            title="Replace this occurrence"
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/5 border border-white/10
                       text-dark-300 hover:text-white hover:bg-white/10 disabled:opacity-30
                       disabled:hover:bg-white/5 transition-all flex items-center gap-1.5 shrink-0"
          >
            <Replace size={12} />
            Replace
          </button>

          {/* Replace all */}
          <button
            onClick={handleReplaceAll}
            disabled={matches.length === 0 || noQuery}
            title="Replace all occurrences"
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-500/20 border border-brand-500/30
                       text-brand-400 hover:bg-brand-500/30 disabled:opacity-30
                       disabled:hover:bg-brand-500/20 transition-all flex items-center gap-1.5 shrink-0"
          >
            <ReplaceAll size={12} />
            Replace All
          </button>
        </div>

        {/* Close */}
        <button
          onClick={close}
          title="Close Find & Replace"
          className="p-1.5 rounded-lg text-dark-500 hover:text-white hover:bg-white/5 transition-all shrink-0"
        >
          <X size={14} />
        </button>
      </div>
    </motion.div>
  );
}
