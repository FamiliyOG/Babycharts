import { useTranslation } from 'react-i18next';
import { Edit2, Trash2, Calendar, Award, Scale, Ruler, Circle } from 'lucide-react';
import { calculateAge, calculateBMI, estimatePercentile } from '../utils/percentileCalc.js';
import { useAuth } from '../context/AuthContext.jsx';
import EmptyState from './EmptyState.jsx';

export default function MeasurementTable({
  activeChild,
  measurements = [],
  onEditMeasurement,
  onDeleteMeasurement,
}) {
  const { t } = useTranslation();
  const { canEdit } = useAuth();
  if (!activeChild) return null;

  const isGirl = activeChild.gender === 'girl';

  // Sort measurements newest first
  const sortedMeasurements = [...measurements].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (sortedMeasurements.length === 0) {
    return (
      <EmptyState
        icon={Scale}
        title={t('measurements.tableNoData') || 'Keine Messwerte erfasst'}
        description={
          t('measurements.emptyDescription') ||
          'Fügen Sie die erste Messung hinzu, um Perzentilen und Verlaufskurven zu berechnen.'
        }
      />
    );
  }

  const formatWeight = (kg) => {
    if (!kg) return null;
    const grams = Math.round(kg * 1000);
    return `${grams.toLocaleString()} g`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl mb-6">
      <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
            <span>{t('measurements.tableTitle')}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
              {sortedMeasurements.length}
            </span>
          </h2>
        </div>
      </div>

      {/* ── MOBILE CARD VIEW (< md screens) ─────────────────────────────────── */}
      <div className="md:hidden divide-y divide-slate-800/80">
        {sortedMeasurements.map((m) => {
          const age = calculateAge(activeChild.birthdate, m.date, t);
          const bmiVal = calculateBMI(m.weight, m.length);
          const weightPct = m.weight
            ? estimatePercentile(m.weight, activeChild.gender, 'weight', age.monthsDecimal)
            : null;
          const lengthPct = m.length
            ? estimatePercentile(m.length, activeChild.gender, 'length', age.monthsDecimal)
            : null;

          return (
            <div key={m.id} className="p-4 space-y-2.5">
              {/* Top Row: Date, Age, U-Heft & Action Buttons */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-bold text-xs text-slate-100">{formatDate(m.date)}</span>
                  <span className="text-[11px] text-cyan-400">({age.text})</span>
                </div>

                <div className="flex items-center gap-1">
                  {m.checkup && (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                        isGirl
                          ? 'bg-pink-950/60 text-pink-300 border-pink-700/50'
                          : 'bg-cyan-950/60 text-cyan-300 border-cyan-700/50'
                      }`}
                    >
                      <Award className="w-3 h-3" />
                      <span>{m.checkup}</span>
                    </span>
                  )}
                  {canEdit && (
                    <>
                      <button
                        type="button"
                        onClick={() => onEditMeasurement(m)}
                        title={t('common.edit')}
                        aria-label={t('common.edit')}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800/60 active:scale-95 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteMeasurement(m.id)}
                        title={t('common.delete')}
                        aria-label={t('common.delete')}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 bg-slate-800/60 active:scale-95 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Stat Chips in 3 Columns */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="text-[10px] text-slate-400 font-semibold mb-0.5 flex items-center justify-center gap-1">
                    <Scale className="w-3 h-3 text-cyan-400" />
                    <span>{t('growth.weight')}</span>
                  </div>
                  <div className="font-bold text-slate-100">{formatWeight(m.weight) || '—'}</div>
                  {weightPct && (
                    <div className="text-[9px] text-slate-400">P{weightPct.percentile}</div>
                  )}
                </div>

                <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="text-[10px] text-slate-400 font-semibold mb-0.5 flex items-center justify-center gap-1">
                    <Ruler className="w-3 h-3 text-emerald-400" />
                    <span>{t('growth.length')}</span>
                  </div>
                  <div className="font-bold text-slate-100">
                    {m.length ? `${m.length} cm` : '—'}
                  </div>
                  {lengthPct && (
                    <div className="text-[9px] text-slate-400">P{lengthPct.percentile}</div>
                  )}
                </div>

                <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="text-[10px] text-slate-400 font-semibold mb-0.5 flex items-center justify-center gap-1">
                    <Circle className="w-3 h-3 text-amber-400" />
                    <span>{t('growth.headCircumference')}</span>
                  </div>
                  <div className="font-bold text-slate-100">
                    {m.headCircumference ? `${m.headCircumference} cm` : '—'}
                  </div>
                  {bmiVal !== null && (
                    <div className="text-[9px] text-purple-300">BMI {bmiVal}</div>
                  )}
                </div>
              </div>

              {/* Notes if present */}
              {m.notes && (
                <div className="text-[11px] text-slate-400 bg-slate-950/40 p-2 rounded-lg border border-slate-800/40">
                  {m.notes}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── DESKTOP TABLE VIEW (>= md screens) ─────────────────────────────── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">
                {t('common.date')} &amp; {t('percentiles.age')}
              </th>
              <th className="py-3 px-4">{t('nav.uCheckups')}</th>
              <th className="py-3 px-4">{t('growth.weight')} (g)</th>
              <th className="py-3 px-4">{t('growth.length')} (cm)</th>
              <th className="py-3 px-4">{t('growth.headCircumference')} (cm)</th>
              <th className="py-3 px-4">{t('growth.bmi')}</th>
              <th className="py-3 px-4">{t('common.notes')}</th>
              <th className="py-3 px-4 text-right">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-200">
            {sortedMeasurements.map((m) => {
              const age = calculateAge(activeChild.birthdate, m.date, t);
              const bmiVal = calculateBMI(m.weight, m.length);

              const weightPct = m.weight
                ? estimatePercentile(m.weight, activeChild.gender, 'weight', age.monthsDecimal)
                : null;

              const lengthPct = m.length
                ? estimatePercentile(m.length, activeChild.gender, 'length', age.monthsDecimal)
                : null;

              return (
                <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                  {/* Datum & Alter */}
                  <td className="py-3 px-4 font-medium whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <div>
                        <div className="text-slate-100 font-semibold">{formatDate(m.date)}</div>
                        <div className="text-[11px] text-cyan-400">{age.text}</div>
                      </div>
                    </div>
                  </td>

                  {/* U-Untersuchung Badge */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    {m.checkup ? (
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                          isGirl
                            ? 'bg-pink-950/60 text-pink-300 border-pink-700/50'
                            : 'bg-cyan-950/60 text-cyan-300 border-cyan-700/50'
                        }`}
                      >
                        <Award className="w-3 h-3" />
                        <span>{m.checkup}</span>
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>

                  {/* Gewicht in Gramm */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    {m.weight ? (
                      <div>
                        <span className="font-bold text-slate-100">{formatWeight(m.weight)}</span>
                        {weightPct && (
                          <div className="text-[10px] text-slate-400">P{weightPct.percentile}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>

                  {/* Größe in cm */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    {m.length ? (
                      <div>
                        <span className="font-bold text-slate-100">{m.length} cm</span>
                        {lengthPct && (
                          <div className="text-[10px] text-slate-400">P{lengthPct.percentile}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>

                  {/* Kopfumfang in cm */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    {m.headCircumference ? (
                      <span className="font-semibold text-slate-200">{m.headCircumference} cm</span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>

                  {/* BMI */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    {bmiVal ? (
                      <span className="font-semibold text-purple-300">{bmiVal}</span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>

                  {/* Notizen */}
                  <td className="py-3 px-4 max-w-xs truncate text-slate-400">
                    {m.notes || <span className="text-slate-600">—</span>}
                  </td>

                  {/* Actions (only for editors & admins) */}
                  {canEdit && (
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEditMeasurement(m)}
                          title="Messwert bearbeiten"
                          aria-label="Messwert bearbeiten"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteMeasurement(m.id)}
                          title="Messwert löschen"
                          aria-label="Messwert löschen"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
