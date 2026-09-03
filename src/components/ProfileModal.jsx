import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Baby,
  Calendar,
  User,
  FileText,
  Check,
  Trash2,
  Scale,
  Ruler,
  Circle,
  Camera,
} from 'lucide-react';
import ModalContainer from './ModalContainer.jsx';
import ConfirmModal from './ConfirmModal.jsx';
import { getAuthorizedMediaUrl } from '../utils/api.js';
import { compressImage } from '../utils/imageCompressor.js';

export default function ProfileModal({
  isOpen,
  onClose,
  onSaveProfile,
  onDeleteProfile,
  initialData = null,
}) {
  if (!isOpen) return null;

  return (
    <ProfileModalDialog
      key={initialData ? initialData.id : 'new-profile'}
      isOpen={isOpen}
      onClose={onClose}
      onSaveProfile={onSaveProfile}
      onDeleteProfile={onDeleteProfile}
      initialData={initialData}
    />
  );
}

function ProfileModalDialog({ isOpen, onClose, onSaveProfile, onDeleteProfile, initialData }) {
  const { t } = useTranslation();
  const [name, setName] = useState(() => initialData?.name || '');
  const [gender, setGender] = useState(() => initialData?.gender || 'boy');
  const [avatar, setAvatar] = useState(() => initialData?.avatar || null);
  const [birthdate, setBirthdate] = useState(
    () => initialData?.birthdate || new Date().toISOString().split('T')[0]
  );
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  const initialBirthM =
    (initialData?.measurements || []).find((m) => m.checkup === 'U1') ||
    initialData?.measurements?.[0];

  const [birthWeightGrams, setBirthWeightGrams] = useState(() =>
    initialBirthM?.weight ? Math.round(initialBirthM.weight * 1000) : ''
  );
  const [birthLengthCm, setBirthLengthCm] = useState(() => initialBirthM?.length || '');
  const [birthHeadCm, setBirthHeadCm] = useState(() => initialBirthM?.headCircumference || '');
  const [notes, setNotes] = useState(() => initialData?.notes || '');
  const [avatarError, setAvatarError] = useState(null);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarError(null);

    if (!file.type.startsWith('image/')) {
      setAvatarError('Ungültiges Format: Bitte wählen Sie ein Bild aus (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setAvatarError('Das Bild ist zu groß. Bitte maximal 10 MB auswählen.');
      return;
    }

    // Compress avatar to thumbnail dimensions (max 512px, JPEG 0.8) to prevent 413 Payload Too Large errors
    compressImage(file, 512, 0.8)
      .then((compressedDataUrl) => {
        setAvatar(compressedDataUrl);
        setAvatarError(null);
      })
      .catch((err) => {
        setAvatarError(
          err?.message || 'Fehler beim Einlesen des Bildes. Bitte versuchen Sie es erneut.'
        );
      });
  };

  const handleRemoveAvatar = () => {
    setAvatar(null);
    setAvatarError(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !birthdate) return;

    let measurements = initialData?.measurements ? [...initialData.measurements] : [];

    // Create or update birth measurement (U1) if birth values were entered
    if (birthWeightGrams || birthLengthCm || birthHeadCm) {
      const parsedWeightKg = birthWeightGrams ? +birthWeightGrams / 1000 : null;
      const parsedLength = birthLengthCm ? +birthLengthCm : null;
      const parsedHead = birthHeadCm ? +birthHeadCm : null;

      const birthM = {
        id: initialBirthM?.id || 'm-birth-' + Date.now(),
        date: birthdate,
        checkup: 'U1',
        weight: parsedWeightKg,
        length: parsedLength,
        headCircumference: parsedHead,
        notes: t('profileModal.birthDataTitle', 'Geburtsdaten (U1)'),
      };

      const existingBirthIdx = measurements.findIndex((m) => m.checkup === 'U1');
      if (existingBirthIdx >= 0) {
        measurements[existingBirthIdx] = birthM;
      } else {
        measurements.unshift(birthM);
      }
    }

    onSaveProfile({
      id: initialData?.id || null,
      name: name.trim(),
      gender,
      avatar,
      birthdate,
      notes: notes.trim(),
      measurements,
    });

    onClose();
  };

  const handleDelete = () => {
    if (initialData && onDeleteProfile) {
      onDeleteProfile(initialData.id);
      onClose();
    }
  };

  return (
    <>
      <ModalContainer isOpen={isOpen} onClose={onClose} maxWidth="max-w-md" showCloseButton={false}>
        <div className="relative text-slate-900 dark:text-slate-100 max-h-[82vh] overflow-y-auto pr-1">
          {/* Modal Header with Avatar */}
          <div className="flex items-center gap-3.5 mb-5 pr-8">
            <div className="relative group shrink-0">
              {avatar ? (
                <img
                  src={getAuthorizedMediaUrl(avatar)}
                  alt={name || 'Kind'}
                  className="w-13 h-13 rounded-2xl object-cover border border-slate-700 shadow-md"
                />
              ) : (
                <div
                  className={`p-3.5 rounded-2xl shadow-lg ${
                    gender === 'girl'
                      ? 'bg-linear-to-tr from-rose-500 to-pink-500 text-white shadow-rose-950'
                      : 'bg-linear-to-tr from-cyan-500 to-blue-600 text-white shadow-cyan-950'
                  }`}
                >
                  <Baby className="w-6 h-6" />
                </div>
              )}
              {avatar && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  title={t('header.removeAvatar', 'Foto entfernen')}
                  aria-label={t('header.removeAvatar', 'Foto entfernen')}
                  className="absolute -top-1.5 -right-1.5 p-1 bg-rose-600 hover:bg-rose-500 text-white rounded-full shadow-md transition-all active:scale-95 z-10"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
              <label
                htmlFor="child-avatar-upload"
                title={t('header.changeAvatar', 'Foto hinzufügen / ändern')}
                className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 rounded-2xl flex items-center justify-center cursor-pointer transition-opacity text-cyan-300"
              >
                <Camera className="w-5 h-5" />
              </label>
              <input
                id="child-avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">
                {initialData ? t('profileModal.editTitle') : t('profileModal.createTitle')}
              </h2>
              <p className="text-xs text-slate-400">{t('profileModal.subtitle')}</p>
            </div>
          </div>

          {avatarError && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <span>⚠️</span>
              <span>{avatarError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label
                htmlFor="child-name-input"
                className="block text-xs font-semibold text-slate-300 mb-1"
              >
                {t('profileModal.nameLabel')} *
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  id="child-name-input"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('profileModal.namePlaceholder')}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            {/* Gender selection */}
            <div>
              <span className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t('profileModal.genderLabel')} *
              </span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => setGender('boy')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border font-semibold text-sm transition-all cursor-pointer ${
                    gender === 'boy'
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-950'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span>👦 {t('profileModal.boy')}</span>
                  {gender === 'boy' && <Check className="w-4 h-4 text-cyan-400" />}
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => setGender('girl')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border font-semibold text-sm transition-all cursor-pointer ${
                    gender === 'girl'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-md shadow-rose-950'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span>👧 {t('profileModal.girl')}</span>
                  {gender === 'girl' && <Check className="w-4 h-4 text-rose-400" />}
                </button>
              </div>
            </div>

            {/* Geburtsdatum */}
            <div>
              <label
                htmlFor="child-birthdate-input"
                className="block text-xs font-semibold text-slate-300 mb-1"
              >
                {t('profileModal.birthdateLabel')} *
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  id="child-birthdate-input"
                  type="date"
                  required
                  value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            {/* Geburtsmesswerte (U1) */}
            <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-2xl space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                <Scale className="w-3.5 h-3.5" />
                <span>{t('profileModal.birthDataTitle')}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label
                    htmlFor="birth-weight-input"
                    className="block text-[11px] font-semibold text-slate-400 mb-1 truncate"
                  >
                    {t('profileModal.birthWeightLabel')}
                  </label>
                  <div className="relative">
                    <Scale className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                    <input
                      id="birth-weight-input"
                      type="number"
                      placeholder={t('profileModal.birthWeightPlaceholder')}
                      value={birthWeightGrams}
                      onChange={(e) => setBirthWeightGrams(e.target.value)}
                      className="w-full pl-8 pr-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="birth-length-input"
                    className="block text-[11px] font-semibold text-slate-400 mb-1 truncate"
                  >
                    {t('profileModal.birthLengthLabel')}
                  </label>
                  <div className="relative">
                    <Ruler className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                    <input
                      id="birth-length-input"
                      type="number"
                      step="0.1"
                      placeholder={t('profileModal.birthLengthPlaceholder')}
                      value={birthLengthCm}
                      onChange={(e) => setBirthLengthCm(e.target.value)}
                      className="w-full pl-8 pr-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="birth-head-input"
                    className="block text-[11px] font-semibold text-slate-400 mb-1 truncate"
                  >
                    {t('profileModal.birthHeadLabel')}
                  </label>
                  <div className="relative">
                    <Circle className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                    <input
                      id="birth-head-input"
                      type="number"
                      step="0.1"
                      placeholder={t('profileModal.birthHeadPlaceholder')}
                      value={birthHeadCm}
                      onChange={(e) => setBirthHeadCm(e.target.value)}
                      className="w-full pl-8 pr-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label
                htmlFor="child-notes-textarea"
                className="block text-xs font-semibold text-slate-300 mb-1"
              >
                {t('profileModal.notesLabel')}
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <textarea
                  id="child-notes-textarea"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('profileModal.notesPlaceholder')}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            {/* Submit & Delete Actions */}
            <div className="pt-3 flex items-center justify-between border-t border-slate-800/80">
              {initialData ? (
                <button
                  type="button"
                  onClick={() => setIsConfirmDeleteOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/50 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t('profileModal.deleteChild')}</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-lg transition-all cursor-pointer ${
                    gender === 'girl'
                      ? 'bg-linear-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 shadow-rose-950'
                      : 'bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-cyan-950'
                  }`}
                >
                  {initialData ? t('common.save') : t('common.add')}
                </button>
              </div>
            </div>
          </form>
        </div>
      </ModalContainer>

      {/* Delete Child Profile Confirmation Modal (BC-208) */}
      {isConfirmDeleteOpen && (
        <ConfirmModal
          isOpen={isConfirmDeleteOpen}
          onClose={() => setIsConfirmDeleteOpen(false)}
          onConfirm={handleDelete}
          title={t('profileModal.deleteChild')}
          message={t('profileModal.deleteConfirm')}
          confirmLabel={t('common.delete')}
          isDestructive
        />
      )}
    </>
  );
}
