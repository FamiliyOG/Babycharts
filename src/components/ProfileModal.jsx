import { useState } from 'react';
import {
  X,
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
import { useModalDismissal } from '../utils/useModalDismissal.js';

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
      onClose={onClose}
      onSaveProfile={onSaveProfile}
      onDeleteProfile={onDeleteProfile}
      initialData={initialData}
    />
  );
}

function ProfileModalDialog({ onClose, onSaveProfile, onDeleteProfile, initialData }) {
  const { dialogRef } = useModalDismissal(true, onClose);
  const [name, setName] = useState(() => initialData?.name || '');
  const [gender, setGender] = useState(() => initialData?.gender || 'boy');
  const [avatar, setAvatar] = useState(() => initialData?.avatar || null);
  const [birthdate, setBirthdate] = useState(
    () => initialData?.birthdate || new Date().toISOString().split('T')[0]
  );

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

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Datei zu groß: Das Bild darf maximal 2 MB groß sein.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAvatar(reader.result);
      setAvatarError(null);
    };
    reader.onerror = () => {
      setAvatarError('Fehler beim Einlesen des Bildes. Bitte versuchen Sie es erneut.');
    };
    reader.readAsDataURL(file);
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
        notes: 'Geburtsdaten (U1)',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div
        ref={dialogRef}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Schließen"
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header with Avatar */}
        <div className="flex items-center gap-3.5 mb-5 pr-8">
          <div className="relative group shrink-0">
            {avatar ? (
              <img
                src={avatar}
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
                title="Foto entfernen"
                aria-label="Foto entfernen"
                className="absolute -top-1.5 -right-1.5 p-1 bg-rose-600 hover:bg-rose-500 text-white rounded-full shadow-md transition-all active:scale-95 z-10"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
            <label
              htmlFor="child-avatar-upload"
              title="Foto hinzufügen / ändern"
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
              {initialData ? 'Profil bearbeiten' : 'Neues Kind anlegen'}
            </h2>
            <p className="text-xs text-slate-400">
              {initialData
                ? 'Passen Sie die Daten und das Profilfoto an'
                : 'Erfassen Sie die Basis- und Geburtsdaten'}
            </p>
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
              Name des Kindes *
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                id="child-name-input"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z. B. Matheo, Emma, Noah, Mia..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* Gender selection */}
          <div>
            <span className="block text-xs font-semibold text-slate-300 mb-1.5">
              Geschlecht (bestimmt die WHO-Perzentilenkurve) *
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setGender('boy')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  gender === 'boy'
                    ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200 shadow-md shadow-cyan-950'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="inline-flex items-center justify-center text-base leading-none">
                  ♂
                </span>
                <span>Junge</span>
                {gender === 'boy' && <Check className="w-3.5 h-3.5 ml-1 text-cyan-400" />}
              </button>

              <button
                type="button"
                onClick={() => setGender('girl')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  gender === 'girl'
                    ? 'bg-pink-950/80 border-pink-500 text-pink-200 shadow-md shadow-pink-950'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="inline-flex items-center justify-center text-base leading-none">
                  ♀
                </span>
                <span>Mädchen</span>
                {gender === 'girl' && <Check className="w-3.5 h-3.5 ml-1 text-pink-400" />}
              </button>
            </div>
          </div>

          {/* Birthdate */}
          <div>
            <label
              htmlFor="child-birthdate-input"
              className="block text-xs font-semibold text-slate-300 mb-1"
            >
              Geburtsdatum *
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

          {/* Geburtswerte (optional) */}
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
            <span className="block text-xs font-bold text-slate-200 mb-1">
              Geburtswerte (U1 Erstuntersuchung)
            </span>
            <div className="grid grid-cols-3 gap-2 items-start">
              <div className="flex flex-col">
                <label
                  htmlFor="birth-weight-input"
                  className="text-[11px] font-semibold text-slate-400 mb-1.5 h-8 flex items-end leading-tight"
                >
                  Gewicht (in g)
                </label>
                <div className="relative">
                  <Scale className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                  <input
                    id="birth-weight-input"
                    type="number"
                    step="1"
                    placeholder="z. B. 3515"
                    value={birthWeightGrams}
                    onChange={(e) => setBirthWeightGrams(e.target.value)}
                    className="w-full pl-8 pr-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex flex-col">
                <label
                  htmlFor="birth-length-input"
                  className="text-[11px] font-semibold text-slate-400 mb-1.5 h-8 flex items-end leading-tight"
                >
                  Größe (in cm)
                </label>
                <div className="relative">
                  <Ruler className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                  <input
                    id="birth-length-input"
                    type="number"
                    step="0.1"
                    placeholder="z. B. 51"
                    value={birthLengthCm}
                    onChange={(e) => setBirthLengthCm(e.target.value)}
                    className="w-full pl-8 pr-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex flex-col">
                <label
                  htmlFor="birth-head-input"
                  className="text-[11px] font-semibold text-slate-400 mb-1.5 h-8 flex items-end leading-tight"
                >
                  Kopf (in cm)
                </label>
                <div className="relative">
                  <Circle className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                  <input
                    id="birth-head-input"
                    type="number"
                    step="0.1"
                    placeholder="z. B. 35"
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
              Bemerkungen / Besonderheiten (optional)
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <textarea
                id="child-notes-textarea"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="z. B. Geburtsort, Besonderheiten..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* Submit & Delete Actions */}
          <div className="pt-3 flex items-center justify-between border-t border-slate-800/80">
            {initialData ? (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/50 rounded-xl text-xs font-medium transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Kind löschen</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className={`px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-lg transition-all ${
                  gender === 'girl'
                    ? 'bg-linear-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 shadow-rose-950'
                    : 'bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-cyan-950'
                }`}
              >
                {initialData ? 'Speichern' : 'Kind anlegen'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
