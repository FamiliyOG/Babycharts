import { Check, Calendar, Camera, Plus, Edit2, Trash2 } from 'lucide-react';
import { getAuthorizedMediaUrl, sanitizeMediaUrl } from '../../utils/api.js';
import { calculateAge } from '../../utils/percentileCalc.js';

export function MilestoneCard({
  milestone,
  isDone,
  entry,
  activeChild,
  canEdit,
  failedImageUrls,
  setFailedImageUrls,
  onOpenEditModal,
  onDeleteCustomMilestone,
  onOpenLightbox,
  t,
}) {
  const m = milestone;
  const photoUrl = entry?.photo ? sanitizeMediaUrl(entry.photo) : null;

  return (
    <div
      className={`flex flex-col justify-between p-4 rounded-3xl border transition-all ${
        isDone
          ? 'bg-slate-950/70 border-amber-500/30 shadow-md shadow-amber-950/10'
          : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
      }`}
    >
      <div>
        {/* Header with Icon & Check status */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl p-2 rounded-2xl bg-slate-900 border border-slate-800 shrink-0">
              {m.icon || '⭐'}
            </span>
            <div>
              <h4 className="font-bold text-xs text-slate-200">
                {t(`milestones.items.${m.id}.title`) !== `milestones.items.${m.id}.title`
                  ? t(`milestones.items.${m.id}.title`)
                  : m.title}
              </h4>
              {m.avgAgeMonths && !isDone && (
                <span className="text-[10px] text-slate-500 font-medium">
                  {t('milestones.typical') || 'Typisch'}: ca. {m.avgAgeMonths}{' '}
                  {t('growth.monthsUnit') || 'M.'}
                </span>
              )}
            </div>
          </div>

          {isDone && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-950/90 text-amber-300 border border-amber-800/60 shrink-0">
              <Check className="w-3 h-3" /> {t('milestones.completed')}
            </span>
          )}
        </div>

        <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
          {t(`milestones.items.${m.id}.desc`) !== `milestones.items.${m.id}.desc`
            ? t(`milestones.items.${m.id}.desc`)
            : m.description || t('milestones.subtitle')}
        </p>

        {/* Achieved Card Content (Photo, Date, Notes) */}
        {isDone && (
          <div className="mb-3 space-y-2">
            {photoUrl && (
              <div className="w-full">
                {failedImageUrls[entry.photo] ? (
                  <div className="w-full rounded-2xl border border-dashed border-slate-700 bg-slate-900/80 p-4 text-center space-y-2">
                    <Camera className="w-6 h-6 text-slate-500 mx-auto" />
                    <p className="text-xs text-slate-400">{t('milestones.photoUpload')}</p>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => onOpenEditModal(m)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow transition-colors cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>{t('profileModal.photoLabel')}</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      onOpenLightbox({
                        photo: photoUrl,
                        title: m.title,
                        date: entry.date,
                        notes: entry.notes,
                      })
                    }
                    title={t('common.search') || 'Foto vergrößern'}
                    className="w-full rounded-2xl overflow-hidden border border-slate-700 h-44 bg-slate-950 block group cursor-pointer relative"
                  >
                    {entry.photo.startsWith('data:video/') ||
                    entry.photo.includes('.mp4') ||
                    entry.photo.includes('.webm') ? (
                      <span className="w-full h-full flex items-center justify-center bg-black/80">
                        <span className="text-3xl">🎬</span>
                      </span>
                    ) : (
                      <img
                        src={getAuthorizedMediaUrl(photoUrl)}
                        alt={m.title}
                        onError={() =>
                          setFailedImageUrls((prev) => ({ ...prev, [entry.photo]: true }))
                        }
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                    <span className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">
                      ▶️ {t('milestones.playMedia', 'Abspielen / Anzeigen')}
                    </span>
                  </button>
                )}
              </div>
            )}

            <div className="text-[11px] bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 text-slate-300 space-y-1">
              <div className="flex items-center justify-between gap-1.5 font-semibold text-amber-300">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{new Date(entry.date).toLocaleDateString(undefined)}</span>
                </span>
                {activeChild.birthdate && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-950/80 text-amber-400 border border-amber-800/40 font-medium">
                    {calculateAge(activeChild.birthdate, entry.date, t).text}
                  </span>
                )}
              </div>
              {entry.notes && (
                <p className="text-[11px] text-slate-300 italic pt-0.5">„{entry.notes}“</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {canEdit && (
        <div className="pt-2.5 border-t border-slate-800/60 flex items-center justify-between">
          {m.isCustom ? (
            <button
              type="button"
              onClick={() => onDeleteCustomMilestone(m.id)}
              className="p-1 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title={t('common.delete')}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={() => onOpenEditModal(m)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isDone
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                : 'bg-amber-600 hover:bg-amber-500 text-white shadow-xs'
            }`}
          >
            {isDone ? (
              <>
                <Edit2 className="w-3 h-3" />
                <span>{t('common.edit')}</span>
              </>
            ) : (
              <>
                <Plus className="w-3 h-3" />
                <span>{t('milestones.recordBtn') || 'Festhalten'}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
