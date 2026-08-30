import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sparkles,
  ClipboardList,
  Clock,
  Scale,
  Calendar,
  Syringe,
  CheckCircle2,
  HeartPulse,
} from 'lucide-react';
import { ToothIcon } from './ToothIcon.jsx';
import { U_CHECKUPS } from '../data/uCheckups.js';
import { STIKO_VACCINATIONS } from '../data/vaccinations.js';
import { STANDARD_MILESTONES } from '../data/milestones.js';
import { MILK_TEETH } from '../data/teeth.js';

function NextCheckupCard({ nextCheckup, onNavigateTab, t }) {
  return (
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
            {t('common.view', 'Ansehen')} →
          </span>
        </div>
        <h3 className="text-sm font-bold text-slate-200">
          {t('uCheckups.title', 'U-Vorsorgeuntersuchung')}
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
            {t('dashboard.allCheckupsDone', 'Alle Vorsorgeuntersuchungen abgeschlossen')}
          </p>
        )}
      </div>
      <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 w-full">
        {nextCheckup?.description || ''}
      </div>
    </button>
  );
}

function MeasurementsCard({ latestMeasurement, onNavigateTab, onOpenAddMeasurement, t }) {
  return (
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
            {t('dashboard.viewCurves', 'Kurven')} →
          </span>
        </div>
        <h3 className="text-sm font-bold text-slate-200">
          {t('measurements.tableTitle', 'Messwert-Historie')}
        </h3>
        {latestMeasurement ? (
          <div className="mt-2 space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-400">{t('growth.weight', 'Gewicht')}:</span>
              <span className="text-sm font-bold text-white">
                {latestMeasurement.weight
                  ? `${Math.round(latestMeasurement.weight * 1000)} g`
                  : '—'}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-400">{t('growth.length', 'Körperlänge')}:</span>
              <span className="text-sm font-bold text-white">
                {latestMeasurement.length ? `${latestMeasurement.length} cm` : '—'}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-400">
                {t('growth.headCircumference', 'Kopfumfang')}:
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
            {onOpenAddMeasurement && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenAddMeasurement();
                }}
                className="inline-block px-3 py-1.5 rounded-xl bg-cyan-600/80 hover:bg-cyan-600 text-white text-xs font-semibold"
              >
                + {t('measurements.addTitle', 'Messwert eintragen')}
              </button>
            )}
          </div>
        )}
      </div>
      <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-1.5 w-full">
        <Calendar className="w-3.5 h-3.5 text-cyan-400" />
        <span>
          {latestMeasurement
            ? latestMeasurement.date
            : t('dashboard.noDateRecorded', 'Kein Datum vorhanden')}
        </span>
      </div>
    </button>
  );
}

function VaccinationsCard({ activeChild, pendingVaccinationsCount, onNavigateTab, t }) {
  return (
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
            {t('dashboard.viewVaccines', 'Impfpass')} →
          </span>
        </div>
        <h3 className="text-sm font-bold text-slate-200">
          {t('vaccinations.title', 'Impfpass & STIKO-Empfehlungen')}
        </h3>
        <div className="mt-2 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-bold text-white">
            {Object.keys(activeChild.vaccinations || {}).length} / {STIKO_VACCINATIONS.length}{' '}
            {t('dashboard.recorded', 'erfasst')}
          </span>
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 w-full">
        {pendingVaccinationsCount > 0
          ? t('dashboard.vaccinesRecommended', {
              count: pendingVaccinationsCount,
              defaultValue: `${pendingVaccinationsCount} Impfungen laut STIKO-Kalender empfohlen`,
            })
          : t('dashboard.allVaccinesUpToDate', 'Alle Standard-Impfungen aktuell eingetragen')}
      </div>
    </button>
  );
}

function MilestonesCard({ milestoneStats, onNavigateTab, t }) {
  return (
    <button
      type="button"
      onClick={() => onNavigateTab?.('milestones')}
      className="text-left w-full p-5 rounded-3xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-all cursor-pointer group shadow-lg flex flex-col justify-between"
    >
      <div className="w-full">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-amber-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">
            {t('common.view', 'Ansehen')} →
          </span>
        </div>
        <h3 className="text-sm font-bold text-slate-200">{t('nav.milestones', 'Meilensteine')}</h3>
        <div className="mt-2 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-amber-400" />
          <span className="text-sm font-bold text-white">
            {milestoneStats.recordedCount} / {milestoneStats.totalCount}{' '}
            {t('dashboard.recorded', 'erfasst')}
          </span>
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 w-full">
        {milestoneStats.recordedCount > 0
          ? `${milestoneStats.recordedCount} besondere Entwicklungsschritte festgehalten`
          : 'Wichtige Momente & Fotos dokumentieren'}
      </div>
    </button>
  );
}

function TeethCard({ teethStats, onNavigateTab, t }) {
  return (
    <button
      type="button"
      onClick={() => onNavigateTab?.('teeth')}
      className="text-left w-full p-5 rounded-3xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-pink-500/50 transition-all cursor-pointer group shadow-lg flex flex-col justify-between"
    >
      <div className="w-full">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center">
            <ToothIcon className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-pink-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">
            {t('common.view', 'Ansehen')} →
          </span>
        </div>
        <h3 className="text-sm font-bold text-slate-200">{t('nav.teeth', 'Milchzähne')}</h3>
        <div className="mt-2 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-pink-400" />
          <span className="text-sm font-bold text-white">
            {teethStats.eruptedCount} / {teethStats.totalCount}{' '}
            {t('teeth.teethCount', 'Zähne durchgebrochen')}
          </span>
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 w-full">
        {teethStats.eruptedCount > 0
          ? `${teethStats.eruptedCount} von 20 Milchzähnen durchgebrochen`
          : 'Zahndurchbruch im 20-Zähne-Gebiss festhalten'}
      </div>
    </button>
  );
}

function HealthCard({ latestHealthEntry, onNavigateTab, t }) {
  return (
    <button
      type="button"
      onClick={() => onNavigateTab?.('health')}
      className="text-left w-full p-5 rounded-3xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-rose-500/50 transition-all cursor-pointer group shadow-lg flex flex-col justify-between"
    >
      <div className="w-full">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
            <HeartPulse className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-rose-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">
            {t('common.view', 'Ansehen')} →
          </span>
        </div>
        <h3 className="text-sm font-bold text-slate-200">{t('nav.health', 'Gesundheit')}</h3>
        {latestHealthEntry ? (
          <div className="mt-2">
            <p className="text-base font-extrabold text-white">
              {latestHealthEntry.temperature
                ? `${latestHealthEntry.temperature} °C`
                : 'Symptomeintrag'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              {latestHealthEntry.symptoms || latestHealthEntry.medication || latestHealthEntry.date}
            </p>
          </div>
        ) : (
          <div className="mt-2 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-medium text-slate-300">
              Keine akuten Krankheitseinträge
            </span>
          </div>
        )}
      </div>
      <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 w-full">
        {latestHealthEntry
          ? `Letzter Eintrag am ${latestHealthEntry.date}`
          : 'Fieber, Symptome & Medikamente protokollieren'}
      </div>
    </button>
  );
}

/**
 * Modern Today Dashboard (BC-223).
 * Serves as the central homepage summarizing upcoming checkups, vaccinations, latest measurements, milestones, teeth & fever stats.
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

  const nextCheckup = useMemo(() => {
    if (!ageInfo || !activeChild) return null;
    const currentMonths = ageInfo.monthsDecimal;
    const completedCheckups = new Set(measurements.filter((m) => m.checkup).map((m) => m.checkup));

    return (
      U_CHECKUPS.find(
        (u) => !completedCheckups.has(u.id) && u.periodMonthsMax >= currentMonths - 1
      ) || U_CHECKUPS.at(-1)
    );
  }, [ageInfo, activeChild, measurements]);

  const pendingVaccinationsCount = useMemo(() => {
    if (!activeChild?.vaccinations) return 0;
    const recorded = Object.keys(activeChild.vaccinations);
    return Math.max(0, STIKO_VACCINATIONS.length - recorded.length);
  }, [activeChild]);

  const milestoneStats = useMemo(() => {
    const customList = activeChild?.customMilestones || [];
    const totalCount = STANDARD_MILESTONES.length + customList.length;
    const recordedCount = Object.keys(activeChild?.milestones || {}).length;
    return { recordedCount, totalCount };
  }, [activeChild]);

  const teethStats = useMemo(() => {
    const teethMap = activeChild?.teeth || {};
    const eruptedCount = Object.keys(teethMap).length;
    return { eruptedCount, totalCount: MILK_TEETH.length };
  }, [activeChild]);

  const latestHealthEntry = useMemo(() => {
    const log = activeChild?.symptomLog || [];
    return log.length > 0 ? log[0] : null;
  }, [activeChild]);

  const latestMeasurement = measurements[0] || null;

  const ageDescription = useMemo(() => {
    if (!ageInfo) return '';
    const yearsPart = ageInfo.years > 0 ? `${ageInfo.years} ${t('growth.yearsUnit', 'J.')} ` : '';
    const monthsPart = `${ageInfo.months} ${t('growth.monthsUnit', 'M.')}`;
    const daysPart = `(${ageInfo.totalDays} ${t('dashboard.daysUnit', 'Tage')})`;
    return `${yearsPart}${monthsPart} ${daysPart}`;
  }, [ageInfo, t]);

  if (!activeChild) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Welcome Header Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-cyan-900/60 via-slate-900/90 to-indigo-950/70 border border-cyan-800/40 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t('dashboard.todayOverview', 'Heute im Überblick')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{activeChild.name}</h1>
            <p className="text-sm text-slate-300 mt-1">{ageDescription}</p>
          </div>
          {onOpenQuickAdd && (
            <button
              type="button"
              onClick={onOpenQuickAdd}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-sm shadow-lg shadow-cyan-950 transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              <span>+ {t('common.add', 'Eintrag hinzufügen')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of Key Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <NextCheckupCard nextCheckup={nextCheckup} onNavigateTab={onNavigateTab} t={t} />
        <MeasurementsCard
          latestMeasurement={latestMeasurement}
          onNavigateTab={onNavigateTab}
          onOpenAddMeasurement={onOpenAddMeasurement}
          t={t}
        />
        <VaccinationsCard
          activeChild={activeChild}
          pendingVaccinationsCount={pendingVaccinationsCount}
          onNavigateTab={onNavigateTab}
          t={t}
        />
        <MilestonesCard milestoneStats={milestoneStats} onNavigateTab={onNavigateTab} t={t} />
        <TeethCard teethStats={teethStats} onNavigateTab={onNavigateTab} t={t} />
        <HealthCard latestHealthEntry={latestHealthEntry} onNavigateTab={onNavigateTab} t={t} />
      </div>
    </div>
  );
}
