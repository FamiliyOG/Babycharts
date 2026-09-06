import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X, Calendar, Activity, HeartPulse, Award } from 'lucide-react';
import { useModalDismissal } from '../../utils/useModalDismissal.js';

export default function GlobalSearchModal({ isOpen, onClose, activeFamily, onSelectResult }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  const { dialogRef } = useModalDismissal(isOpen, onClose);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleQueryChange = (val) => {
    setQuery(val);
    if (val.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const familyParam = activeFamily?.id
          ? `&familyId=${encodeURIComponent(activeFamily.id)}`
          : '';
        const res = await fetch(
          `/api/v1/profiles/search?q=${encodeURIComponent(trimmed)}${familyParam}`,
          {
            credentials: 'include',
          }
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
        } else {
          setResults([]);
        }
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, activeFamily]);

  if (!isOpen) return null;

  const renderIcon = (type) => {
    switch (type) {
      case 'measurement':
        return <Activity className="w-4 h-4 text-cyan-500" />;
      case 'health_log':
        return <HeartPulse className="w-4 h-4 text-rose-500" />;
      case 'milestone':
        return <Award className="w-4 h-4 text-amber-500" />;
      default:
        return <Calendar className="w-4 h-4 text-indigo-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <dialog
        open
        ref={dialogRef}
        aria-label={t('search.title', 'Globale Suche')}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-4 sm:p-5 shadow-2xl relative text-slate-900 dark:text-slate-100 space-y-4 m-0"
      >
        <div className="relative flex items-center">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder={t('search.placeholder', 'Messungen, Meilensteine, Notizen suchen...')}
            className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 transition-colors"
          />
          {query ? (
            <button
              type="button"
              onClick={() => handleQueryChange('')}
              className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800/60">
          {isLoading && (
            <p className="text-xs text-slate-400 text-center py-4">
              {t('common.loading', 'Laden...')}
            </p>
          )}

          {!isLoading && query.trim().length >= 2 && results.length === 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-6">
              {t('search.noResults', 'Keine Treffer in dieser Familie gefunden.')}
            </p>
          )}

          {!isLoading && query.trim().length < 2 && (
            <p className="text-xs text-slate-400 text-center py-4">
              {t(
                'search.hint',
                'Mindestens 2 Zeichen eingeben, um Meilensteine, Messungen und Gesundheitseinträge zu durchsuchen.'
              )}
            </p>
          )}

          {!isLoading &&
            results.map((item, idx) => (
              <button
                key={`${item.type}-${item.profileId}-${idx}`}
                type="button"
                onClick={() => {
                  onSelectResult?.(item);
                  onClose();
                }}
                className="w-full text-left p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 flex items-start gap-3 transition-colors cursor-pointer group"
              >
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0 group-hover:scale-105 transition-transform">
                  {renderIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {item.title}
                    </span>
                    {item.date && (
                      <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                        {item.date.split('T')[0]}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-cyan-600 dark:text-cyan-400 font-medium">
                    {item.childName}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                    {item.snippet}
                  </p>
                </div>
              </button>
            ))}
        </div>
      </dialog>
    </div>
  );
}
