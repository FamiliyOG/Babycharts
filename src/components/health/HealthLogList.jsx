import { Clock, Edit2, Trash2, Thermometer, Pill } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function HealthLogList({
  healthLog,
  sortedDesc,
  canEdit,
  openEditModal,
  handleDeleteEntry,
  getTempBadge,
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
        {t('health.historyTitle')} ({healthLog.length} {t('health.entriesCount')})
      </h4>

      {healthLog.length === 0 ? (
        <div className="text-center py-8 text-xs text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800/60">
          {t('health.noEntries')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sortedDesc.map((entry) => {
            const d = new Date(entry.dateTime);
            const dateStr = d.toLocaleDateString(undefined, {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            });
            const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            const tempBadge = getTempBadge(entry.temperature);

            return (
              <div
                key={entry.id}
                className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800/60">
                    <div className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {dateStr} ({timeStr})
                      </span>
                    </div>

                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(entry)}
                          className="p-1 text-slate-400 hover:text-cyan-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Eintrag bearbeiten"
                          aria-label="Eintrag bearbeiten"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Eintrag löschen"
                          aria-label="Eintrag löschen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs">
                    {entry.temperature !== null && tempBadge && (
                      <div className="flex items-center gap-2">
                        <Thermometer className="w-4 h-4 text-rose-400 shrink-0" />
                        <span className="font-bold text-slate-100">{entry.temperature} °C</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${tempBadge.badgeClass}`}
                        >
                          {tempBadge.label}
                        </span>
                      </div>
                    )}

                    {entry.medication && (
                      <div className="flex items-center gap-2 text-indigo-300">
                        <Pill className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span>Medikament: {entry.medication}</span>
                      </div>
                    )}

                    {entry.symptoms && entry.symptoms.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {entry.symptoms.map((s) => (
                          <span
                            key={s}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700/80 text-slate-300"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    {entry.notes && (
                      <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800/40">
                        „{entry.notes}“
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
