import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  ClipboardList,
  Syringe,
  Scale,
  Sparkles,
  ChevronRight,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { U_CHECKUPS } from '../data/uCheckups.js';
import { STIKO_VACCINATIONS } from '../data/vaccinations.js';

/**
 * Modern Today Dashboard (BC-223).
 * Serves as the central homepage summarizing upcoming checkups, vaccinations, latest measurements and milestones.
 */
export default function TodayDashboard({
  activeChild,
  ageInfo,
  measurements = [],
  onNavigateTab,
  onOpenAddMeasurement,
  onOpenQuickAdd,
}) {
  const { t } = useTranslation();

  // Find next upcoming U-Checkup
  const nextCheckup = useMemo(() => {
    if (!ageInfo || !activeChild) return null;
    const currentMonths = ageInfo.monthsDecimal;
    const completedCheckups = new Set(measurements.filter((m) => m.checkup).map((m) => m.checkup));

    return (
      U_CHECKUPS.find(
        (u) => !completedCheckups.has(u.id) && u.periodMonthsMax >= currentMonths - 1
      ) || U_CHECKUPS[U_CHECKUPS.length - 1]
    );
  }, [ageInfo, activeChild, measurements]);

  // Count pending vaccinations
  const pendingVaccinationsCount = useMemo(() => {
    if (!activeChild?.vaccinations) return 0;
    const recorded = Object.keys(activeChild.vaccinations);
    return Math.max(0, STIKO_VACCINATIONS.length - recorded.length);
  }, [activeChild]);

  // Latest measurement record
  const latestMeasurement = measurements[0] || null;

  if (!activeChild) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Welcome Header Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-cyan-900/60 via-slate-900/90 to-indigo-950/70 border border-cyan-800/40 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t('dashboard.today') || 'Heute im Überblick'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{activeChild.name}</h1>
            <p className="text-sm text-slate-300 mt-1">
              {ageInfo
                ? `${ageInfo.years > 0 ? `${ageInfo.years} ${t('growth.yearsUnit') || 'Jahre'} ` : ''}${ageInfo.months} ${t('growth.monthsUnit') || 'Monate'} (${ageInfo.totalDays} ${t('growth.days') || 'Tage'})`
                : ''}
            </p>
          </div>
          {onOpenQuickAdd && (
            <button
              type="button"
              onClick={onOpenQuickAdd}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-sm shadow-lg shadow-cyan-950 transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              <span>+ {t('common.add') || 'Eintrag hinzufügen'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of Key Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Next U-Checkup */}
        <button
          type="button"
          onClick={() => onNavigateTab?.('ucheckups')}
          className="text-left w-full p-5 rounded-3xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 transition-all cursor-pointer group shadow-lg flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <ClipboardList className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-cyan-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                {t('common.view') || 'Ansehen'} <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-200">
              {t('ucheckups.title') || 'U-Vorsorgeuntersuchung'}
            </h3>
            {nextCheckup ? (
              <div className="mt-2">
                <p className="text-base font-extrabold text-white">{nextCheckup.name}</p>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  {nextCheckup.periodText}
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400 mt-2">
                Alle Vorsorgeuntersuchungen abgeschlossen
              </p>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 w-full">
            {nextCheckup?.description || ''}
          </div>
        </button>

        {/* Card 2: Latest Measurements */}
        <button
          type="button"
          onClick={() => onNavigateTab?.('growth')}
          className="text-left w-full p-5 rounded-3xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 transition-all cursor-pointer group shadow-lg flex flex-col justify-between"
        >
          <div className="w-full">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Scale className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-cyan-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                {t('common.view') || 'Kurven'} <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-200">
              {t('measurements.tableTitle') || 'Letzte Messung'}
            </h3>
            {latestMeasurement ? (
              <div className="mt-2 space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-slate-400">{t('growth.weight') || 'Gewicht'}:</span>
                  <span className="text-sm font-bold text-white">
                    {latestMeasurement.weight
                      ? `${Math.round(latestMeasurement.weight * 1000)} g`
                      : '—'}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-slate-400">{t('growth.length') || 'Größe'}:</span>
                  <span className="text-sm font-bold text-white">
                    {latestMeasurement.length ? `${latestMeasurement.length} cm` : '—'}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-slate-400">
                    {t('growth.headCircumference') || 'Kopf'}:
                  </span>
                  <span className="text-sm font-bold text-white">
                    {latestMeasurement.headCircumference
                      ? `${latestMeasurement.headCircumference} cm`
                      : '—'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-3">
                <span className="inline-block px-3 py-1.5 rounded-xl bg-cyan-600/80 hover:bg-cyan-600 text-white text-xs font-semibold">
                  + {t('measurements.addTitle') || 'Erste Messung eintragen'}
                </span>
              </div>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-1.5 w-full">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <span>{latestMeasurement ? latestMeasurement.date : 'Kein Datum vorhanden'}</span>
          </div>
        </button>

        {/* Card 3: Vaccinations & Health */}
        <button
          type="button"
          onClick={() => onNavigateTab?.('vaccines')}
          className="text-left w-full p-5 rounded-3xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition-all cursor-pointer group shadow-lg flex flex-col justify-between"
        >
          <div className="w-full">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Syringe className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                {t('common.view') || 'Impfpass'} <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-200">
              {t('vaccinations.title') || 'STIKO-Impfungen'}
            </h3>
            <div className="mt-2 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-bold text-white">
                {Object.keys(activeChild.vaccinations || {}).length} / {STIKO_VACCINATIONS.length}{' '}
                {t('vaccinations.recorded') || 'erfasst'}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 w-full">
            {pendingVaccinationsCount > 0
              ? `${pendingVaccinationsCount} Impfungen laut STIKO-Kalender empfohlen`
              : 'Alle Standard-Impfungen aktuell eingetragen'}
          </div>
        </button>
      </div>
    </div>
  );
}
