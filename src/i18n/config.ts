import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ar from '../locales/ar/translation.json';

export const SUPPORTED_LANGUAGES = ['ar'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_META: Record<
  AppLanguage,
  { label: string; nativeLabel: string; dir: 'rtl' | 'ltr' }
> = {
  ar: { label: 'Arabic', nativeLabel: 'العربية', dir: 'rtl' },
};

export const DEFAULT_LANGUAGE: AppLanguage = 'ar';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ar: { translation: ar },
    },
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
    interpolation: {
      // React already escapes; i18next escaping would double-encode.
      escapeValue: false,
    },
    returnNull: false,
  });

export default i18n;
