import { useEffect } from 'react';
import {
  LANGUAGE_META,
  DEFAULT_LANGUAGE,
} from './config';

/**
 * Keeps the document <html lang/dir> in sync with the active i18next language.
 * Mount once near the app root. Returns helpers for building a language switch.
 */
export function useDirection() {
  const lang = DEFAULT_LANGUAGE;
  const dir = LANGUAGE_META[lang].dir;

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('lang', lang);
    root.setAttribute('dir', dir);
  }, [lang, dir]);

  return { lang, dir };
}
