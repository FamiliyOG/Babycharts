import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext.jsx';
import { useModalDismissal } from '../../utils/useModalDismissal.js';
import { useState } from 'react';

export default function LanguageSwitcherDropdown({ isMobile = false }) {
  const { i18n } = useTranslation();
  const { user, updateUserProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const { dialogRef } = useModalDismissal(isOpen, () => setIsOpen(false));

  const languages = [
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'th', label: 'ไทย (Thai)', flag: '🇹🇭' },
  ];

  const currentLang =
    languages.find((l) => l.code === (i18n.language?.substring(0, 2) || 'de')) || languages[0];

  const handleSelectLanguage = async (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('babycharts_lng', code);
    setIsOpen(false);
    if (user) {
      await updateUserProfile({ language: code });
    }
  };

  return (
    <div ref={dialogRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Sprache wechseln / Change Language"
        aria-label="Sprache auswählen"
        className={`p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 transition-colors flex items-center gap-1.5 cursor-pointer ${
          isMobile ? 'text-xs' : 'text-xs px-2.5 py-1.5'
        }`}
      >
        <span className="text-sm leading-none">{currentLang.flag}</span>
        {!isMobile && (
          <span className="font-bold text-[11px] uppercase tracking-wider">{currentLang.code}</span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-1.5 z-50 animate-fadeIn text-xs text-slate-800 dark:text-slate-100">
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Sprache / Language
          </div>
          {languages.map((lang) => {
            const isSelected = (i18n.language?.substring(0, 2) || 'de') === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelectLanguage(lang.code)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 font-bold'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-base leading-none">{lang.flag}</span>
                  <span>{lang.label}</span>
                </span>
                {isSelected && <Check className="w-3.5 h-3.5 text-cyan-500" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
