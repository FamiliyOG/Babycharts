import { U_CHECKUPS } from '../data/uCheckups.js';
import { calculateAge } from '../utils/percentileCalc.js';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export default function UCheckupTracker({ activeChild, measurements = [] }) {
  if (!activeChild) return null;

  const currentAge = calculateAge(activeChild.birthdate);
  const currentMonths = currentAge.monthsDecimal;

  // Set of checkups that have at least one measurement entry
  const completedCheckupIds = new Set(measurements.filter((m) => m.checkup).map((m) => m.checkup));

  const getCheckupStatusBadge = (isDone, isDueNow) => {
    if (isDone) {
      return <span className="text-emerald-400">✓ Erfasst</span>;
    }
    if (isDueNow) {
      return <span className="text-amber-400">⚡ Jetzt fällig!</span>;
    }
    return <span className="text-slate-300">Ausstehend</span>;
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-2xl mb-6">
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-base font-bold text-slate-100">
            U-Untersuchungen Übersicht (Deutschland)
          </h2>
          <p className="text-xs text-slate-400">
            Vorsorgeplan von U1 bis U9 für{' '}
            <span className="text-slate-200 font-semibold">{activeChild.name}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {U_CHECKUPS.map((u) => {
          const isDone = completedCheckupIds.has(u.id);
          const isDueNow =
            currentMonths >= u.periodMonthsMin &&
            currentMonths <= u.periodMonthsMax + 1.0 &&
            !isDone;
          const isPastDue = currentMonths > u.periodMonthsMax + 1.0 && !isDone;

          let statusBg = 'bg-slate-950/60 border-slate-800 text-slate-400';
          let icon = <Clock className="w-4 h-4 text-slate-400" />;

          if (isDone) {
            statusBg = 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200';
            icon = <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
          } else if (isDueNow) {
            statusBg = 'bg-amber-950/60 border-amber-500 text-amber-200 animate-pulse';
            icon = <AlertCircle className="w-4 h-4 text-amber-400" />;
          } else if (isPastDue) {
            statusBg = 'bg-slate-900/40 border-slate-800/80 text-slate-400 opacity-60';
          }

          return (
            <div
              key={u.id}
              className={`border rounded-xl p-3 flex flex-col justify-between transition-all ${statusBg}`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-white">{u.id}</span>
                  {icon}
                </div>
                <div className="text-[11px] font-medium text-slate-300 mb-1">{u.periodText}</div>
                <div className="text-[10px] text-slate-400 line-clamp-2">{u.description}</div>
              </div>

              <div className="mt-2 text-[10px] font-semibold">
                {getCheckupStatusBadge(isDone, isDueNow)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
