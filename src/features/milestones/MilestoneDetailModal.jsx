import { Camera, Trash2 } from 'lucide-react';
import { getAuthorizedMediaUrl, sanitizeMediaUrl } from '../../utils/api.js';

export function MilestoneDetailModal({
  selectedMilestone,
  onClose,
  milestonesData,
  milestoneDate,
  setMilestoneDate,
  milestonePhoto,
  setMilestonePhoto,
  isUploadingPhoto,
  handlePhotoUpload,
  photoError,
  milestoneNotes,
  setMilestoneNotes,
  onSaveMilestone,
  onRemoveMilestone,
  t,
}) {
  if (!selectedMilestone) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="text-2xl">{selectedMilestone.icon}</span>
          <h3 className="text-base font-bold">{selectedMilestone.title}</h3>
        </div>
        <p className="text-xs text-slate-400 mb-4">{selectedMilestone.description}</p>

        <form onSubmit={onSaveMilestone} className="space-y-4">
          <div>
            <label
              htmlFor="milestone-date"
              className="block text-xs font-semibold text-slate-300 mb-1"
            >
              {t('milestones.achievedOn', 'Erreicht am *')}
            </label>
            <input
              id="milestone-date"
              type="date"
              required
              value={milestoneDate}
              onChange={(e) => setMilestoneDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Photo Upload Section */}
          <div>
            <span className="block text-xs font-semibold text-slate-300 mb-1">
              {t('milestones.photoMemory', 'Erinnerungsfoto (optional)')}
            </span>
            {milestonePhoto ? (
              <div className="space-y-2">
                <div className="relative group rounded-2xl overflow-hidden border border-slate-700 h-44 bg-slate-950">
                  <img
                    src={getAuthorizedMediaUrl(sanitizeMediaUrl(milestonePhoto))}
                    alt="Vorschau"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setMilestonePhoto(null)}
                    className="absolute top-2 right-2 p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-full shadow-md z-10 cursor-pointer"
                    title={t('common.delete', 'Foto entfernen')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <label
                  htmlFor="milestone-photo-input"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer transition-colors ${
                    isUploadingPhoto ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  <Camera className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {isUploadingPhoto
                      ? t('milestones.uploadingPhoto', 'Verschlüssele & speichere...')
                      : t('milestones.changePhoto', 'Anderes Foto wählen')}
                  </span>
                  <input
                    id="milestone-photo-input"
                    type="file"
                    accept="image/*,video/mp4,video/webm,video/quicktime"
                    disabled={isUploadingPhoto}
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <label
                htmlFor="milestone-photo-input"
                className={`flex flex-col items-center justify-center p-4 border border-dashed border-slate-700 rounded-2xl cursor-pointer hover:border-amber-500 hover:bg-slate-950/60 transition-all text-slate-400 hover:text-slate-200 ${
                  isUploadingPhoto ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <Camera className="w-6 h-6 mb-1 text-amber-400" />
                <span className="text-xs font-medium">
                  {isUploadingPhoto
                    ? t('milestones.uploadingPhoto', 'Verschlüssele & lade hoch...')
                    : t('milestones.uploadPhoto', 'Foto oder Video hochladen (verschlüsselt)')}
                </span>
                <input
                  id="milestone-photo-input"
                  type="file"
                  accept="image/*,video/mp4,video/webm,video/quicktime"
                  disabled={isUploadingPhoto}
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            )}
            {photoError && (
              <div className="mt-2 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <span>⚠️</span>
                <span>{photoError}</span>
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="milestone-notes"
              className="block text-xs font-semibold text-slate-300 mb-1"
            >
              {t('growth.notesLabel', 'Notizen')}
            </label>
            <textarea
              id="milestone-notes"
              rows={3}
              placeholder={t('growth.notesPlaceholder', 'z. B. Heute im Park...')}
              value={milestoneNotes}
              onChange={(e) => setMilestoneNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="pt-3 flex items-center justify-between border-t border-slate-800">
            {milestonesData[selectedMilestone.id] ? (
              <button
                type="button"
                onClick={() => onRemoveMilestone(selectedMilestone.id)}
                className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/50 text-xs font-semibold cursor-pointer"
              >
                {t('common.delete', 'Eintrag löschen')}
              </button>
            ) : (
              <div />
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
              >
                {t('common.cancel', 'Abbrechen')}
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-950 cursor-pointer"
              >
                {t('common.save', 'Speichern')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
