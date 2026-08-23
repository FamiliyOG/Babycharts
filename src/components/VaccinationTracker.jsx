import { useState } from 'react';
import { Syringe, Check, Calendar, Plus, Edit2 } from 'lucide-react';
import { STIKO_VACCINATIONS } from '../data/vaccinations.js';

export default function VaccinationTracker({ activeChild, onUpdateChild, canEdit }) {
  const [selectedVaccine, setSelectedVaccine] = useState(null);
  const [vaxDate, setVaxDate] = useState('');
  const [vaxDoctor, setVaxDoctor] = useState('');
  const [vaxBatch, setVaxBatch] = useState('');
  const [vaxNotes, setVaxNotes] = useState('');

  if (!activeChild) return null;

  const vaccinations = activeChild.vaccinations || {};

  const openEntryModal = (vaccine) => {
    const existing = vaccinations[vaccine.id] || {};
    setSelectedVaccine(vaccine);
    setVaxDate(existing.date || new Date().toISOString().split('T')[0]);
    setVaxDoctor(existing.doctor || '');
    setVaxBatch(existing.batch || '');
    setVaxNotes(existing.notes || '');
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!selectedVaccine || !canEdit) return;

    const updated = {
      ...vaccinations,
      [selectedVaccine.id]: {
        completed: true,
        date: vaxDate,
        doctor: vaxDoctor.trim(),
        batch: vaxBatch.trim(),
        notes: vaxNotes.trim(),
        updatedAt: new Date().toISOString(),
      },
    };

    onUpdateChild({
      ...activeChild,
      vaccinations: updated,
    });

    setSelectedVaccine(null);
  };

  const handleRemove = (vaccineId) => {
    if (!canEdit) return;
    const updated = { ...vaccinations };
    delete updated[vaccineId];

    onUpdateChild({
      ...activeChild,
      vaccinations: updated,
    });

    setSelectedVaccine(null);
  };

  const completedCount = Object.keys(vaccinations).filter((k) => vaccinations[k]?.completed).length;

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-xl mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-950/60 border border-emerald-800/50 text-emerald-400">
            <Syringe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>STIKO-Impfkalender</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-800/40">
                {completedCount} / {STIKO_VACCINATIONS.length} geimpft
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Offizielle Impfempfehlungen der Ständigen Impfkommission für {activeChild.name}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {STIKO_VACCINATIONS.map((vax) => {
          const record = vaccinations[vax.id];
          const isDone = record?.completed;

          return (
            <div
              key={vax.id}
              className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                isDone
                  ? 'bg-emerald-950/20 border-emerald-800/50 shadow-xs'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="font-semibold text-xs text-slate-200">{vax.name}</div>
                  {isDone ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 shrink-0">
                      <Check className="w-3 h-3" /> Geimpft
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium shrink-0">
                      {vax.periodText}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">{vax.description}</p>
              </div>

              {isDone && (
                <div className="text-[11px] text-emerald-200/80 bg-emerald-950/40 border border-emerald-800/30 rounded-xl p-2 mb-2 space-y-0.5">
                  <div className="flex items-center gap-1 font-medium">
                    <Calendar className="w-3 h-3 text-emerald-400" />
                    <span>{new Date(record.date).toLocaleDateString('de-DE')}</span>
                  </div>
                  {record.doctor && <div>Arzt/Praxis: {record.doctor}</div>}
                  {record.batch && <div>Charge: {record.batch}</div>}
                  {record.notes && <div className="italic text-[10px]">„{record.notes}“</div>}
                </div>
              )}

              {canEdit && (
                <div className="pt-2 border-t border-slate-800/60 flex justify-end">
                  <button
                    type="button"
                    onClick={() => openEntryModal(vax)}
                    className={`flex items-center gap-1 px-3 py-1 rounded-xl text-[11px] font-semibold transition-all ${
                      isDone
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                    }`}
                  >
                    {isDone ? (
                      <>
                        <Edit2 className="w-3 h-3" />
                        <span>Bearbeiten</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3" />
                        <span>Eintragen</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Entry Modal */}
      {selectedVaccine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-slate-100">
            <h3 className="text-base font-bold mb-1">{selectedVaccine.name}</h3>
            <p className="text-xs text-slate-400 mb-4">{selectedVaccine.description}</p>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label
                  htmlFor="vax-date-input"
                  className="block text-xs font-semibold text-slate-300 mb-1"
                >
                  Impfdatum *
                </label>
                <input
                  id="vax-date-input"
                  type="date"
                  required
                  value={vaxDate}
                  onChange={(e) => setVaxDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label
                  htmlFor="vax-doctor-input"
                  className="block text-xs font-semibold text-slate-300 mb-1"
                >
                  Arzt / Praxis (optional)
                </label>
                <input
                  id="vax-doctor-input"
                  type="text"
                  placeholder="z. B. Dr. Müller, Kinderarztpraxis"
                  value={vaxDoctor}
                  onChange={(e) => setVaxDoctor(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label
                  htmlFor="vax-batch-input"
                  className="block text-xs font-semibold text-slate-300 mb-1"
                >
                  Chargennummer (optional)
                </label>
                <input
                  id="vax-batch-input"
                  type="text"
                  placeholder="z. B. A4582-B"
                  value={vaxBatch}
                  onChange={(e) => setVaxBatch(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label
                  htmlFor="vax-notes-input"
                  className="block text-xs font-semibold text-slate-300 mb-1"
                >
                  Notizen / Verträglichkeit (optional)
                </label>
                <textarea
                  id="vax-notes-input"
                  rows={2}
                  placeholder="z. B. Gut vertragen, leichtes Fieber am Abend..."
                  value={vaxNotes}
                  onChange={(e) => setVaxNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-slate-800">
                {vaccinations[selectedVaccine.id] ? (
                  <button
                    type="button"
                    onClick={() => handleRemove(selectedVaccine.id)}
                    className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/50 text-xs font-semibold"
                  >
                    Eintrag löschen
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedVaccine(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950"
                  >
                    Speichern
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
