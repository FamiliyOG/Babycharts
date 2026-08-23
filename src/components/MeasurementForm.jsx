import { useState } from 'react';
import { X, Scale, Ruler, Circle, Calendar, FileText, Award } from 'lucide-react';
import { calculateAge, estimatePercentile } from '../utils/percentileCalc.js';
import { U_CHECKUPS } from '../data/uCheckups.js';
import confetti from 'canvas-confetti';
import { useModalDismissal } from '../utils/useModalDismissal.js';

export default function MeasurementForm({
  isOpen,
  onClose,
  onSaveMeasurement,
  activeChild,
  initialData = null,
}) {
  if (!isOpen || !activeChild) return null;

  return (
    <MeasurementFormDialog
      key={initialData ? initialData.id : 'new-measurement'}
      onClose={onClose}
      onSaveMeasurement={onSaveMeasurement}
      activeChild={activeChild}
      initialData={initialData}
    />
  );
}

function MeasurementFormDialog({ onClose, onSaveMeasurement, activeChild, initialData }) {
  const { dialogRef } = useModalDismissal(true, onClose);
  const todayIso = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState(() => initialData?.date || todayIso);
  const [weightGrams, setWeightGrams] = useState(() =>
    initialData?.weight ? Math.round(initialData.weight * 1000) : ''
  );
  const [length, setLength] = useState(() => initialData?.length || '');
  const [headCircumference, setHeadCircumference] = useState(
    () => initialData?.headCircumference || ''
  );
  const [checkup, setCheckup] = useState(() => initialData?.checkup || '');
  const [notes, setNotes] = useState(() => initialData?.notes || '');

  const isGirl = activeChild?.gender === 'girl';
  const ageInfo = calculateAge(activeChild.birthdate, date);

  // Real-time percentile estimations
  const weightVal = weightGrams ? Number.parseFloat(weightGrams) / 1000 : null;
  const lengthVal = length ? Number.parseFloat(length) : null;
  const headVal = headCircumference ? Number.parseFloat(headCircumference) : null;

  const pWeight =
    weightVal && ageInfo.totalMonths <= 60
      ? estimatePercentile('weight', activeChild.gender, ageInfo.totalMonths, weightVal)
      : null;

  const pLength =
    lengthVal && ageInfo.totalMonths <= 60
      ? estimatePercentile('length', activeChild.gender, ageInfo.totalMonths, lengthVal)
      : null;

  const pHead =
    headVal && ageInfo.totalMonths <= 60
      ? estimatePercentile('head', activeChild.gender, ageInfo.totalMonths, headVal)
      : null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!weightGrams && !length && !headCircumference) return;

    onSaveMeasurement({
      id: initialData?.id || undefined,
      date,
      weight: weightGrams ? Number.parseFloat(weightGrams) / 1000 : null,
      length: length ? Number.parseFloat(length) : null,
      headCircumference: headCircumference ? Number.parseFloat(headCircumference) : null,
      checkup,
      notes: notes.trim(),
    });

    // Trigger celebration confetti
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.7 },
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div
        ref={dialogRef}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Schließen"
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div
            className={`p-2.5 rounded-xl ${isGirl ? 'bg-pink-500/20 text-pink-400' : 'bg-cyan-500/20 text-cyan-400'}`}
          >
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold">
              {initialData ? 'Messwert bearbeiten' : 'Neuen Messwert eintragen'}
            </h2>
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span>Kind:</span>
              <span className="font-semibold text-slate-200">{activeChild.name}</span>
              <span className="inline-flex items-center gap-1">
                (
                {isGirl ? (
                  <>
                    <svg
                      className="w-3.5 h-3.5 text-pink-400 fill-none stroke-current stroke-2 shrink-0"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="8" r="5" />
                      <line x1="12" y1="13" x2="12" y2="21" />
                      <line x1="9" y1="17" x2="15" y2="17" />
                    </svg>
                    <span>Mädchen</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-3.5 h-3.5 text-cyan-400 fill-none stroke-current stroke-2 shrink-0"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle cx="10" cy="14" r="5" />
                      <line x1="14" y1="10" x2="21" y2="3" />
                      <polyline points="15 3 21 3 21 9" />
                    </svg>
                    <span>Junge</span>
                  </>
                )}
                )
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Datum & berechnetes Alter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="measurement-date-input"
                className="block text-xs font-semibold text-slate-300 mb-1"
              >
                Messdatum *
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  id="measurement-date-input"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-300 mb-1">
                Berechnetes Alter
              </span>
              <div className="py-2 px-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-cyan-300 font-medium">
                {ageInfo.text}
              </div>
            </div>
          </div>

          {/* Messwerte: Gewicht in Gramm, Größe in cm, Kopfumfang in cm */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 items-start">
            {/* Gewicht in Gramm */}
            <div className="flex flex-col">
              <label
                htmlFor="measurement-weight-input"
                className="text-xs font-semibold text-slate-300 mb-1.5 sm:h-8 flex items-end leading-tight"
              >
                Gewicht (in g)
              </label>
              <div className="relative">
                <Scale className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  id="measurement-weight-input"
                  type="number"
                  step="1"
                  min="300"
                  max="40000"
                  value={weightGrams}
                  onChange={(e) => setWeightGrams(e.target.value)}
                  placeholder="z. B. 3515"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
              {pWeight && (
                <span className="text-[11px] text-emerald-400 mt-1 block">
                  ~ {pWeight.percentile}. Perzentile ({weightVal.toFixed(2)} kg)
                </span>
              )}
            </div>

            {/* Größe / Länge in cm */}
            <div className="flex flex-col">
              <label
                htmlFor="measurement-length-input"
                className="text-xs font-semibold text-slate-300 mb-1.5 sm:h-8 flex items-end leading-tight"
              >
                Größe / Länge (cm)
              </label>
              <div className="relative">
                <Ruler className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  id="measurement-length-input"
                  type="number"
                  step="0.1"
                  min="25"
                  max="130"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  placeholder="z. B. 51.5"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
              {pLength && (
                <span className="text-[11px] text-emerald-400 mt-1 block">
                  ~ {pLength.percentile}. Perzentile
                </span>
              )}
            </div>

            {/* Kopfumfang in cm */}
            <div className="flex flex-col">
              <label
                htmlFor="measurement-head-input"
                className="text-xs font-semibold text-slate-300 mb-1.5 sm:h-8 flex items-end leading-tight"
              >
                Kopfumfang (cm)
              </label>
              <div className="relative">
                <Circle className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  id="measurement-head-input"
                  type="number"
                  step="0.1"
                  min="25"
                  max="60"
                  value={headCircumference}
                  onChange={(e) => setHeadCircumference(e.target.value)}
                  placeholder="z. B. 35.0"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
              {pHead && (
                <span className="text-[11px] text-emerald-400 mt-1 block">
                  ~ {pHead.percentile}. Perzentile
                </span>
              )}
            </div>
          </div>

          {/* U-Untersuchung Zuordnung */}
          <div>
            <label
              htmlFor="measurement-checkup-select"
              className="block text-xs font-semibold text-slate-300 mb-1"
            >
              U-Untersuchung (optional)
            </label>
            <div className="relative">
              <Award className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <select
                id="measurement-checkup-select"
                value={checkup}
                onChange={(e) => setCheckup(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-cyan-500"
              >
                <option value="">Keine U-Untersuchung (reguläre Messung)</option>
                {U_CHECKUPS.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.periodText})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="measurement-notes-textarea"
              className="block text-xs font-semibold text-slate-300 mb-1"
            >
              Notizen / Meilensteine (optional)
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <textarea
                id="measurement-notes-textarea"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="z. B. Erste feste Nahrung probiert, guter Appetit..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2 flex justify-end gap-2">
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
                isGirl
                  ? 'bg-linear-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 shadow-rose-950'
                  : 'bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-cyan-950'
              }`}
            >
              {initialData ? 'Speichern' : 'Messung speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
