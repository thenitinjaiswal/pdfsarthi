'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [theme, setThemeState]           = useState('dark');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [recentFiles, setRecentFiles]    = useState([]);
  const [pinnedTools, setPinnedTools]    = useState([]);
  const [toasts, setToasts]              = useState([]);
  const [settings, setSettings]          = useState({
    compressionDefault: 'medium',
    ocrLanguage: 'eng',
    exportQuality: 'high',
    autoSave: true,
    theme: 'dark',
  });

  // Hydrate from localStorage once mounted
  useEffect(() => {
    try {
      const s = localStorage.getItem('sarthipdf_settings');
      if (s) setSettings(JSON.parse(s));
      const r = localStorage.getItem('sarthipdf_recent');
      if (r) setRecentFiles(JSON.parse(r));
      const p = localStorage.getItem('sarthipdf_pinned');
      if (p) setPinnedTools(JSON.parse(p));
      const t = localStorage.getItem('sarthipdf_theme');
      if (t) setThemeState(t);
    } catch (_) {}
  }, []);

  // Persist settings
  useEffect(() => {
    localStorage.setItem('sarthipdf_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('sarthipdf_recent', JSON.stringify(recentFiles));
  }, [recentFiles]);

  useEffect(() => {
    localStorage.setItem('sarthipdf_pinned', JSON.stringify(pinnedTools));
  }, [pinnedTools]);

  useEffect(() => {
    localStorage.setItem('sarthipdf_theme', theme);
  }, [theme]);

  // Toast system
  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, duration }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Recent files
  const addRecentFile = useCallback((file) => {
    setRecentFiles(prev => {
      const filtered = prev.filter(f => f.name !== file.name);
      return [{ ...file, openedAt: new Date().toISOString() }, ...filtered].slice(0, 20);
    });
  }, []);

  // Pinned tools
  const togglePinned = useCallback((toolPath) => {
    setPinnedTools(prev =>
      prev.includes(toolPath)
        ? prev.filter(p => p !== toolPath)
        : [...prev, toolPath]
    );
  }, []);

  const updateSettings = useCallback((newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const setTheme = useCallback((t) => {
    const next = typeof t === 'function' ? t(theme) : t;
    setThemeState(next);
  }, [theme]);

  return (
    <AppContext.Provider value={{
      theme, setTheme,
      sidebarCollapsed, setSidebarCollapsed,
      recentFiles, addRecentFile,
      pinnedTools, togglePinned,
      toasts, addToast, removeToast,
      settings, updateSettings,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
