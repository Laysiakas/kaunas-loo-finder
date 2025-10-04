import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import lt from './locales/lt.json';
import en from './locales/en.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      lt: { translation: lt },
      en: { translation: en },
    },
    lng: 'lt', // Default language is Lithuanian
    fallbackLng: 'lt',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
