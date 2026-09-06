import { Smartphone, Check, Download } from 'lucide-react';

export function PwaInstallCard({ isInstalled, deferredPrompt, onInstallPwa, t }) {
  return (
    <div className="md:hidden mb-4 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 shadow-xs">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
              {t('exportImport.pwaTitle', 'App auf Startbildschirm installieren')}
            </div>
            <div className="text-[11px] text-indigo-700 dark:text-indigo-400 font-medium">
              {isInstalled
                ? t('exportImport.pwaDescInstalled', 'Als eigenständige PWA installiert')
                : t(
                    'exportImport.pwaDescNotInstalled',
                    'BabyCharts als native App auf dem Smartphone nutzen'
                  )}
            </div>
          </div>
        </div>

        {isInstalled && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60 shrink-0">
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Bereits installiert
          </span>
        )}
        {!isInstalled && deferredPrompt && (
          <button
            type="button"
            onClick={onInstallPwa}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all active:scale-95 shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('exportImport.pwaInstallBtn', 'Jetzt installieren')}</span>
          </button>
        )}
      </div>

      {!isInstalled && (
        <div className="mt-3 pt-3 border-t border-indigo-200/80 dark:border-indigo-900/50 text-[11px] text-slate-600 dark:text-slate-300 space-y-1.5">
          <p className="font-semibold text-indigo-900 dark:text-indigo-300">
            {t('exportImport.pwaGuideTitle', 'Anleitung für Ihr Smartphone:')}
          </p>
          <div className="flex items-start gap-1.5">
            <span className="font-bold text-indigo-500">
              {t('exportImport.pwaAndroid', 'Android / Samsung:')}
            </span>
            <span>
              {t(
                'exportImport.pwaAndroidStep',
                'Oben rechts auf das Menü (⋮) tippen → „App installieren“ oder „Zum Startbildschirm hinzufügen“.'
              )}
            </span>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="font-bold text-indigo-500">
              {t('exportImport.pwaIos', 'iPhone / iPad (Safari):')}
            </span>
            <span>
              {t(
                'exportImport.pwaIosStep',
                'Unten auf das Teilen-Symbol tippen → Scrollen zu „Zum Home-Bildschirm“.'
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
