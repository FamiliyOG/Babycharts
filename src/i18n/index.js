import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import deCommon from './locales/de/common.json';
import enCommon from './locales/en/common.json';
import thCommon from './locales/th/common.json';

const resources = {
  de: { common: deCommon },
  en: { common: enCommon },
  th: { common: thCommon },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'de',
    defaultNS: 'common',
    ns: ['common'],
    interpolation: {
      escapeValue: false, // React already safes from XSS
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'babycharts_lng',
    },
  });

export default i18n;
