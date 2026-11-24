'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { TE } from './te';

export type Lang = 'en' | 'te';
type Vars = Record<string, string | number | undefined>;

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  /**
   * Translate an English UI string. The English text itself is the key, so code stays readable
   * and anything without a Telugu entry simply shows in English.
   * Placeholders like {n} are filled from `vars`.
   */
  t: (text: string, vars?: Vars) => string;
}

const STORAGE_KEY = 'SOLAR_TRACKER_LANG';

const fill = (text: string, vars?: Vars) =>
  vars ? text.replace(/\{(\w+)\}/g, (_, k) => (vars[k] === undefined ? `{${k}}` : String(vars[k]))) : text;

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>('en');

  // Restore the saved choice
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'te' || saved === 'en') setLangState(saved);
    } catch {
      /* private mode */
    }
  }, []);

  // Keep <html lang> correct for screen readers and the browser's font choice
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private mode */
    }
  }, []);

  const t = useCallback(
    (text: string, vars?: Vars) => fill(lang === 'te' ? TE[text] ?? text : text, vars),
    [lang]
  );

  const value = useMemo(
    () => ({ lang, setLang, toggleLang: () => setLang(lang === 'en' ? 'te' : 'en'), t }),
    [lang, setLang, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLang = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used within a LanguageProvider');
  return ctx;
};

/** Identity translator, for helpers that are sometimes called without a language */
export const noTranslate = (text: string, vars?: Vars) => fill(text, vars);
export type Translate = (text: string, vars?: Vars) => string;
