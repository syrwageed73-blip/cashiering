import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ar from '../locales/ar/translation.json';
import en from '../locales/en/translation.json';

export const SUPPORTED_LANGUAGES = ['ar', 'en'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_META: Record<
  AppLanguage,
  { label: string; nativeLabel: string; dir: 'rtl' | 'ltr' }
> = {
  ar: { label: 'Arabic', nativeLabel: 'العربية', dir: 'rtl' },
  en: { label: 'English', nativeLabel: 'English', dir: 'ltr' },
};

export const DEFAULT_LANGUAGE: AppLanguage = 'ar';
const STORAGE_KEY = 'mulham.lang';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ar: { translation: ar },
      en: { translation: en },
    },
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    interpolation: {
      // React already escapes; i18next escaping would double-encode.
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'htmlTag', 'navigator'],
      lookupLocalStorage: STORAGE_KEY,
      caches: ['localStorage'],
    },
    returnNull: false,
  });

export default i18n;
