import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Download, Share, PlusSquare, X } from 'lucide-react';
import { usePwa } from '../../context/PwaContext.jsx';

export default function PwaPrompts() {
  const { t } = useTranslation();
  const { isInstallable, isIos, isStandalone, hasUpdate, installPwa, applyUpdate, dismissInstall } =
    usePwa();

  const [showIosPrompt, setShowIosPrompt] = useState(() => {
    if (!isIos || isStandalone) return false;
    if (typeof window === 'undefined') return false;
    const dismissed = localStorage.getItem('babycharts_ios_pwa_dismissed');
    return !dismissed;
  });

  const dismissIosPrompt = () => {
    setShowIosPrompt(false);
    localStorage.setItem('babycharts_ios_pwa_dismissed', 'true');
  };

  return (
    <>
      {/* PWA Update Available Toast (BC-138) */}
      {hasUpdate && (
        <aside
          aria-label={t('pwa.updateAvailable', 'App-Aktualisierung verfügbar')}
          className="fixed top-4 right-4 z-50 max-w-sm bg-slate-900 border border-cyan-500/60 rounded-2xl p-4 shadow-2xl text-white animate-slideDown flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 animate-spin">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-100">
                {t('pwa.newVersionTitle', 'Neue Version verfügbar!')}
              </p>
              <p className="text-[11px] text-slate-400">
                {t('pwa.newVersionDesc', 'Klicken Sie zum Neuladen auf Aktualisieren.')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={applyUpdate}
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition-colors shadow-md cursor-pointer shrink-0"
          >
            {t('pwa.updateBtn', 'Neu laden')}
          </button>
        </aside>
      )}

      {/* Android/Desktop PWA Install Banner (BC-141) */}
      {isInstallable && !isStandalone && (
        <aside
          aria-label={t('pwa.installApp', 'App installieren')}
          className="fixed bottom-20 md:bottom-6 left-4 md:left-6 z-40 max-w-sm bg-slate-950/95 border border-cyan-500/40 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md text-white flex items-center justify-between gap-3 animate-slideUp"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-600/20 text-cyan-300 flex items-center justify-center shrink-0">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200">
                {t('pwa.installPromptTitle', 'BabyCharts installieren')}
              </p>
              <p className="text-[10px] text-slate-400">
                {t('pwa.installPromptDesc', 'Schnellerer Zugriff & Offline-Nutzung')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={installPwa}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              {t('pwa.installBtn', 'Installieren')}
            </button>
            <button
              type="button"
              onClick={dismissInstall}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label={t('common.close', 'Schließen')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </aside>
      )}

      {/* iOS Safari Home Screen Banner (BC-142) */}
      {showIosPrompt && (
        <aside
          aria-label={t('pwa.iosInstallHint', 'Auf Home-Bildschirm hinzufügen')}
          className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-40 bg-slate-950/95 border border-slate-700/80 rounded-2xl p-4 shadow-2xl backdrop-blur-md text-white animate-slideUp"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 mb-2">
              <PlusSquare className="w-4 h-4 text-cyan-400" />
              <p className="text-xs font-bold text-slate-100">
                {t('pwa.iosTitle', 'App auf Home-Bildschirm')}
              </p>
            </div>
            <button
              type="button"
              onClick={dismissIosPrompt}
              className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              aria-label={t('common.close', 'Schließen')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            {t(
              'pwa.iosInstructions',
              'Tippen Sie unten auf das Teilen-Symbol und wählen Sie „Zum Home-Bildschirm“ für das beste App-Erlebnis.'
            )}
          </p>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-cyan-300 font-semibold">
            <Share className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t('pwa.iosShareStep', 'Teilen → Zum Home-Bildschirm')}</span>
          </div>
        </aside>
      )}
    </>
  );
}
