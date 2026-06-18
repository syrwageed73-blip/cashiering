import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LANGUAGE_META,
  SUPPORTED_LANGUAGES,
  type AppLanguage,
} from './config';

function normalize(lng: string | undefined): AppLanguage {
  const base = (lng ?? '').split('-')[0] as AppLanguage;
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(base) ? base : 'ar';
}

/**
 * Keeps the document <html lang/dir> in sync with the active i18next language.
 * Mount once near the app root. Returns helpers for building a language switch.
 */
export function useDirection() {
  const { i18n } = useTranslation();
  const lang = normalize(i18n.resolvedLanguage ?? i18n.language);
  const dir = LANGUAGE_META[lang].dir;

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('lang', lang);
    root.setAttribute('dir', dir);
  }, [lang, dir]);

  const setLanguage = (next: AppLanguage) => {
    if (next !== lang) void i18n.changeLanguage(next);
  };

  const toggleLanguage = () => setLanguage(lang === 'ar' ? 'en' : 'ar');

  return { lang, dir, setLanguage, toggleLanguage };
}
