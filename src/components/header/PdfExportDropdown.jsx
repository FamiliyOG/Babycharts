import { useTranslation } from 'react-i18next';
import { Download, FileText, Calendar, Table } from 'lucide-react';
import { useModalDismissal } from '../../utils/useModalDismissal.js';

export default function PdfExportDropdown({
  isOpen,
  onToggle,
  onManualPdfExport,
  onExportCalendar,
  onExportCsv,
  isMobile = false,
}) {
  const { t } = useTranslation();
  const { dialogRef } = useModalDismissal(isOpen, onToggle);

  return (
    <div ref={dialogRef} className={`relative ${isMobile ? 'block' : 'hidden md:block'}`}>
      {isMobile ? (
        <button
          type="button"
          onClick={onToggle}
          title={t('header.exportReport') || 'Exportieren'}
          aria-label={t('header.exportReport') || 'Exportieren'}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/80 dark:hover:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-800 active:scale-95 flex items-center justify-center transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={onToggle}
          title={t('header.exportReport') || 'Exportieren'}
          aria-label={t('header.exportReport') || 'Exportieren'}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/60 transition-all hover:border-slate-400 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>{t('common.export') || 'Exportieren'}</span>
        </button>
      )}

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-fadeIn text-xs text-slate-800 dark:text-slate-100">
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('header.exportReport') || 'PDF-Dokumente'}
          </div>

          <button
            type="button"
            onClick={() => {
              onToggle();
              onManualPdfExport('a4');
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer"
          >
            <FileText className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
            <div>
              <div className="font-semibold text-slate-900 dark:text-slate-100">DIN A4 Bericht</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                {t('growth.subtitle')}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              onToggle();
              onManualPdfExport('a5');
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left mt-0.5 cursor-pointer"
          >
            <span className="text-base leading-none shrink-0">📒</span>
            <div>
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                DIN A5 U-Heft Einleger
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                {t('uCheckups.subtitle')}
              </div>
            </div>
          </button>

          <div className="my-1.5 border-t border-slate-200 dark:border-slate-800/80" />

          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('header.calendar') || 'Kalender & Tabellen'}
          </div>

          {onExportCalendar && (
            <button
              type="button"
              onClick={() => {
                onToggle();
                onExportCalendar();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  {t('header.calendar') || 'Kalender-Export (.ics)'}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  Apple, Google, Outlook
                </div>
              </div>
            </button>
          )}

          {onExportCsv && (
            <button
              type="button"
              onClick={() => {
                onToggle();
                onExportCsv();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left mt-0.5 cursor-pointer"
            >
              <Table className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  Excel / CSV Export
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  {t('exportImport.exportDesc')}
                </div>
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
