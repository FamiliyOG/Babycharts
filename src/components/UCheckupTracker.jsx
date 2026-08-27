import { useTranslation } from 'react-i18next';
import { U_CHECKUPS } from '../data/uCheckups.js';
import { calculateAge } from '../utils/percentileCalc.js';
import { CheckCircle2, Clock, AlertCircle, ClipboardList, Plus } from 'lucide-react';

export default function UCheckupTracker({ activeChild, measurements = [], onAddCheckupClick }) {
  const { t } = useTranslation();

  if (!activeChild) return null;

  const currentAge = calculateAge(activeChild.birthdate);
  const currentMonths = currentAge.monthsDecimal;

  // Set of checkups that have at least one measurement entry
  const checkupMeasurementsMap = new Map();
  measurements.forEach((m) => {
    if (m.checkup) {
      checkupMeasurementsMap.set(m.checkup, m);
    }
  });

  const completedCount = U_CHECKUPS.filter((u) => checkupMeasurementsMap.has(u.id)).length;

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl mb-6 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 border-b border-slate-200 dark:border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-blue-100 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/50 text-blue-600 dark:text-blue-400">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>{t('uCheckups.title')}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-md font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
                {completedCount} / {U_CHECKUPS.length} {t('uCheckups.completed')}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('uCheckups.subtitle')}</p>
          </div>
        </div>

        {onAddCheckupClick && (
          <button
            type="button"
            onClick={onAddCheckupClick}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-950/50 transition-all active:scale-95 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('uCheckups.addCheckup')}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {U_CHECKUPS.map((u) => {
          const entry = checkupMeasurementsMap.get(u.id);
          const isDone = Boolean(entry);
          const isDueNow =
            currentMonths >= u.periodMonthsMin &&
            currentMonths <= u.periodMonthsMax + 1.0 &&
            !isDone;
          const isPastDue = currentMonths > u.periodMonthsMax + 1.0 && !isDone;

          let cardStyle =
            'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 text-slate-600 dark:text-slate-400';
          let statusBadge = (
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              {t('uCheckups.pending')}
            </span>
          );
          let icon = <Clock className="w-4 h-4 text-slate-400" />;

          if (isDone) {
            cardStyle =
              'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-200 shadow-xs';
            const formattedDate = entry.date
              ? new Date(entry.date).toLocaleDateString('de-DE', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })
              : '';
            statusBadge = (
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                ✓ {t('uCheckups.recordedOn', { date: formattedDate })}
              </span>
            );
            icon = <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
          } else if (isDueNow) {
            cardStyle =
              'bg-amber-50 dark:bg-amber-950/50 border-amber-400 dark:border-amber-500/80 text-amber-950 dark:text-amber-200 shadow-md ring-2 ring-amber-400/40';
            statusBadge = (
              <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 animate-pulse">
                ⚡ {t('uCheckups.dueNow')}
              </span>
            );
            icon = <AlertCircle className="w-4 h-4 text-amber-500" />;
          } else if (isPastDue) {
            cardStyle =
              'bg-slate-100/50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800/50 text-slate-400 opacity-65';
          }

          return (
            <div
              key={u.id}
              className={`border rounded-2xl p-3.5 flex flex-col justify-between transition-all hover:border-slate-400 dark:hover:border-slate-700 ${cardStyle}`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-black/5 dark:border-white/5">
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {u.id}
                  </span>
                  {icon}
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  {u.periodText}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-3">
                  {u.description}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                {statusBadge}
                {isDone && entry.weight && (
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    {entry.weight} kg
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
