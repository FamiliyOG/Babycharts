import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Scale,
  Ruler,
  Circle,
  Calendar,
  FileText,
  Award,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { calculateAge, estimatePercentile } from '../utils/percentileCalc.js';
import { U_CHECKUPS } from '../data/uCheckups.js';
import confetti from 'canvas-confetti';
import ModalContainer from './ModalContainer.jsx';

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
      isOpen={isOpen}
      onClose={onClose}
      onSaveMeasurement={onSaveMeasurement}
      activeChild={activeChild}
      initialData={initialData}
    />
  );
}

function calculatePercentileEstimates(ageMonths, gender, weightVal, lengthVal, headVal) {
  const isEligible = ageMonths <= 60;
  return {
    pWeight:
      isEligible && weightVal ? estimatePercentile('weight', gender, ageMonths, weightVal) : null,
    pLength:
      isEligible && lengthVal ? estimatePercentile('length', gender, ageMonths, lengthVal) : null,
    pHead: isEligible && headVal ? estimatePercentile('head', gender, ageMonths, headVal) : null,
  };
}

function WarningBanners({ isFutureDate, existingSameDay, t }) {
  if (!isFutureDate && !existingSameDay) return null;
  return (
    <>
      {isFutureDate && (
        <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            {t('measurements.futureDateWarning', 'Das Messdatum darf nicht in der Zukunft liegen.')}
          </span>
        </div>
      )}
      {existingSameDay && (
        <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-800 text-amber-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            {t(
              'measurements.duplicateDateWarning',
              'Für dieses Datum existiert bereits ein Messwert. Beim Speichern wird dieser Eintrag ergänzt/aktualisiert.'
            )}
          </span>
        </div>
      )}
    </>
  );
}

function MetricInputFields({
  weightGrams,
  setWeightGrams,
  length,
  setLength,
  headCircumference,
  setHeadCircumference,
  pWeight,
  pLength,
  pHead,
  weightVal,
  t,
}) {
  const weightNum = weightGrams ? Number.parseFloat(weightGrams) : null;
  const isWeightUnusual = weightNum !== null && (weightNum < 500 || weightNum > 35000);

  const lengthNum = length ? Number.parseFloat(length) : null;
  const isLengthUnusual = lengthNum !== null && (lengthNum < 30 || lengthNum > 140);

  const headNum = headCircumference ? Number.parseFloat(headCircumference) : null;
  const isHeadUnusual = headNum !== null && (headNum < 25 || headNum > 60);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 items-start">
      {/* Weight */}
      <div className="flex flex-col">
        <label
          htmlFor="measurement-weight-input"
          className="text-xs font-semibold text-slate-300 mb-1.5 sm:h-8 flex items-end leading-tight"
        >
          {t('measurements.weightLabel')}
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
            placeholder={t('measurements.weightPlaceholder')}
            className={`w-full pl-9 pr-3 py-2 bg-slate-950 border rounded-xl text-sm focus:outline-none ${
              isWeightUnusual
                ? 'border-amber-500 text-amber-200'
                : 'border-slate-800 focus:border-cyan-500'
            }`}
          />
        </div>
        {pWeight && (
          <span className="text-[11px] text-emerald-400 mt-1 block">
            ~ P{pWeight.percentile} ({weightVal?.toFixed(2)} kg)
          </span>
        )}
        {isWeightUnusual && (
          <span className="text-[10px] text-amber-400 mt-0.5 block">
            ⚠️ {t('measurements.unusualWeightWarning', 'Ungewöhnlicher Wert (500g–35kg)')}
          </span>
        )}
      </div>

      {/* Length */}
      <div className="flex flex-col">
        <label
          htmlFor="measurement-length-input"
          className="text-xs font-semibold text-slate-300 mb-1.5 sm:h-8 flex items-end leading-tight"
        >
          {t('measurements.lengthLabel')}
        </label>
        <div className="relative">
          <Ruler className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            id="measurement-length-input"
            type="number"
            step="0.1"
            min="25"
            max="140"
            value={length}
            onChange={(e) => setLength(e.target.value)}
            placeholder={t('measurements.lengthPlaceholder')}
            className={`w-full pl-9 pr-3 py-2 bg-slate-950 border rounded-xl text-sm focus:outline-none ${
              isLengthUnusual
                ? 'border-amber-500 text-amber-200'
                : 'border-slate-800 focus:border-cyan-500'
            }`}
          />
        </div>
        {pLength && (
          <span className="text-[11px] text-emerald-400 mt-1 block">~ P{pLength.percentile}</span>
        )}
        {isLengthUnusual && (
          <span className="text-[10px] text-amber-400 mt-0.5 block">
            ⚠️ {t('measurements.unusualLengthWarning', 'Ungewöhnlicher Wert (30–140 cm)')}
          </span>
        )}
      </div>

      {/* Head */}
      <div className="flex flex-col">
        <label
          htmlFor="measurement-head-input"
          className="text-xs font-semibold text-slate-300 mb-1.5 sm:h-8 flex items-end leading-tight"
        >
          {t('measurements.headLabel')}
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
            placeholder={t('measurements.headPlaceholder')}
            className={`w-full pl-9 pr-3 py-2 bg-slate-950 border rounded-xl text-sm focus:outline-none ${
              isHeadUnusual
                ? 'border-amber-500 text-amber-200'
                : 'border-slate-800 focus:border-cyan-500'
            }`}
          />
        </div>
        {pHead && (
          <span className="text-[11px] text-emerald-400 mt-1 block">~ P{pHead.percentile}</span>
        )}
        {isHeadUnusual && (
          <span className="text-[10px] text-amber-400 mt-0.5 block">
            ⚠️ {t('measurements.unusualHeadWarning', 'Ungewöhnlicher Wert (25–60 cm)')}
          </span>
        )}
      </div>
    </div>
  );
}

function MeasurementFormDialog({ isOpen, onClose, onSaveMeasurement, activeChild, initialData }) {
  const { t } = useTranslation();
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

  const weightVal = weightGrams ? Number.parseFloat(weightGrams) / 1000 : null;
  const lengthVal = length ? Number.parseFloat(length) : null;
  const headVal = headCircumference ? Number.parseFloat(headCircumference) : null;

  const { pWeight, pLength, pHead } = calculatePercentileEstimates(
    ageInfo.totalMonths,
    activeChild.gender,
    weightVal,
    lengthVal,
    headVal
  );

  const isFutureDate = date > todayIso;
  const existingSameDay = (activeChild?.measurements || []).find(
    (m) => m.date === date && m.id !== initialData?.id
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!weightGrams && !length && !headCircumference) return;
    if (isFutureDate) return;

    onSaveMeasurement({
      id: initialData?.id || undefined,
      date,
      weight: weightGrams ? Number.parseFloat(weightGrams) / 1000 : null,
      length: length ? Number.parseFloat(length) : null,
      headCircumference: headCircumference ? Number.parseFloat(headCircumference) : null,
      checkup,
      notes: notes.trim(),
    });

    confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
    onClose();
  };

  return (
    <ModalContainer isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg" showCloseButton={false}>
      <div className="relative text-slate-900 dark:text-slate-100 max-h-[82vh] overflow-y-auto pr-1">
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`p-2.5 rounded-xl ${isGirl ? 'bg-pink-500/20 text-pink-400' : 'bg-cyan-500/20 text-cyan-400'}`}
          >
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">
              {initialData ? t('measurements.editTitle') : t('measurements.addTitle')}
            </h2>
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span>{t('header.selectChild')}:</span>
              <span className="font-semibold text-slate-200">{activeChild.name}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="measurement-date-input"
                className="block text-xs font-semibold text-slate-300 mb-1"
              >
                {t('measurements.dateLabel')} *
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  id="measurement-date-input"
                  type="date"
                  required
                  max={todayIso}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2 bg-slate-950 border rounded-xl text-sm focus:outline-none ${
                    isFutureDate
                      ? 'border-rose-500 text-rose-300'
                      : 'border-slate-800 focus:border-cyan-500'
                  }`}
                />
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-300 mb-1">
                {t('percentiles.age')}
              </span>
              <div className="py-2 px-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-cyan-300 font-medium">
                {ageInfo.text}
              </div>
            </div>
          </div>

          <WarningBanners isFutureDate={isFutureDate} existingSameDay={existingSameDay} t={t} />

          <MetricInputFields
            weightGrams={weightGrams}
            setWeightGrams={setWeightGrams}
            length={length}
            setLength={setLength}
            headCircumference={headCircumference}
            setHeadCircumference={setHeadCircumference}
            pWeight={pWeight}
            pLength={pLength}
            pHead={pHead}
            weightVal={weightVal}
            t={t}
          />

          <div>
            <label
              htmlFor="measurement-checkup-select"
              className="block text-xs font-semibold text-slate-300 mb-1"
            >
              {t('measurements.checkupLabel')}
            </label>
            <div className="relative">
              <Award className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <select
                id="measurement-checkup-select"
                value={checkup}
                onChange={(e) => setCheckup(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="">{t('measurements.checkupNone')}</option>
                {U_CHECKUPS.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.periodText})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="measurement-notes-textarea"
              className="block text-xs font-semibold text-slate-300 mb-1"
            >
              {t('common.notes')}
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <textarea
                id="measurement-notes-textarea"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('measurements.notesPlaceholder')}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
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
                isGirl
                  ? 'bg-linear-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 shadow-rose-950'
                  : 'bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-cyan-950'
              }`}
            >
              {initialData ? t('common.save') : t('common.add')}
            </button>
          </div>
        </form>
      </div>
    </ModalContainer>
  );
}
