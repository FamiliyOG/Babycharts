import { useState } from 'react';
import {
  Activity,
  Thermometer,
  Pill,
  Clock,
  Plus,
  Edit2,
  Trash2,
  HeartPulse,
  FileText,
} from 'lucide-react';
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { generateDoctorFeverReport } from '../utils/doctorPdfGenerator.js';

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const COMMON_SYMPTOMS = [
  'Schnupfen',
  'Husten',
  'Halsschmerzen',
  'Bauchschmerzen',
  'Erbrechen',
  'Durchfall',
  'Hautausschlag',
  'Appetitlosigkeit',
  'Unruhe / Weinen',
  'Müdigkeit',
];

export default function HealthTracker({ activeChild, onUpdateChild, canEdit }) {
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  // Health entry form states
  const [dateTime, setDateTime] = useState('');
  const [temperature, setTemperature] = useState('');
  const [medication, setMedication] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [notes, setNotes] = useState('');

  if (!activeChild) return null;

  const healthLog = activeChild.healthLog || [];

  const openCreateModal = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const localNow = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;

    setEditingEntry(null);
    setDateTime(localNow);
    setTemperature('');
    setMedication('');
    setSelectedSymptoms([]);
    setNotes('');
    setIsEntryModalOpen(true);
  };

  const openEditModal = (entry) => {
    setEditingEntry(entry);
    setDateTime(entry.dateTime || '');
    setTemperature(
      entry.temperature !== null && entry.temperature !== undefined ? String(entry.temperature) : ''
    );
    setMedication(entry.medication || '');
    setSelectedSymptoms(entry.symptoms ? [...entry.symptoms] : []);
    setNotes(entry.notes || '');
    setIsEntryModalOpen(true);
  };

  // Sort logs chronologically (newest first for list, oldest first for chart)
  const sortedDesc = [...healthLog].sort(
    (a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
  );
  const sortedAsc = [...healthLog].sort(
    (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
  );

  const toggleSymptom = (sym) => {
    if (selectedSymptoms.includes(sym)) {
      setSelectedSymptoms(selectedSymptoms.filter((s) => s !== sym));
    } else {
      setSelectedSymptoms([...selectedSymptoms, sym]);
    }
  };

  const handleSaveEntry = (e) => {
    e.preventDefault();
    if (!canEdit) return;

    const parsedTemp = temperature ? Number.parseFloat(temperature) : null;
    const trimmedMed = medication.trim() || null;
    const trimmedNotes = notes.trim() || null;

    let updated;
    if (editingEntry) {
      updated = healthLog.map((item) =>
        item.id === editingEntry.id
          ? {
              ...item,
              dateTime,
              temperature: parsedTemp,
              medication: trimmedMed,
              symptoms: selectedSymptoms,
              notes: trimmedNotes,
              updatedAt: new Date().toISOString(),
            }
          : item
      );
    } else {
      const newEntry = {
        id: `h-${Date.now()}`,
        dateTime,
        temperature: parsedTemp,
        medication: trimmedMed,
        symptoms: selectedSymptoms,
        notes: trimmedNotes,
        createdAt: new Date().toISOString(),
      };
      updated = [newEntry, ...healthLog];
    }

    onUpdateChild({
      ...activeChild,
      healthLog: updated,
    });

    setIsEntryModalOpen(false);
    setEditingEntry(null);
  };

  const handleDeleteEntry = (entryId) => {
    if (!canEdit) return;
    const updated = healthLog.filter((item) => item.id !== entryId);

    onUpdateChild({
      ...activeChild,
      healthLog: updated,
    });
  };

  // Temperature chart data
  const tempLogs = sortedAsc.filter((item) => item.temperature !== null);
  const chartData = {
    labels: tempLogs.map((item) => {
      const d = new Date(item.dateTime);
      return `${d.getDate()}.${d.getMonth() + 1}. ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }),
    datasets: [
      {
        label: 'Temperatur (°C)',
        data: tempLogs.map((item) => item.temperature),
        borderColor: '#f43f5e',
        backgroundColor: 'rgba(244, 63, 94, 0.2)',
        tension: 0.3,
        pointBackgroundColor: tempLogs.map((item) => {
          if (item.temperature >= 39.0) return '#e11d48'; // High fever
          if (item.temperature >= 38.0) return '#f97316'; // Fever
          if (item.temperature >= 37.5) return '#eab308'; // Elevated
          return '#10b981'; // Normal
        }),
        pointRadius: 6,
        pointHoverRadius: 8,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `${context.parsed.y} °C`,
        },
      },
    },
    scales: {
      y: {
        min: 36.0,
        max: 41.0,
        grid: { color: 'rgba(51, 65, 85, 0.3)' },
        ticks: { color: '#94a3b8', stepSize: 0.5 },
      },
      x: {
        grid: { color: 'rgba(51, 65, 85, 0.3)' },
        ticks: { color: '#94a3b8' },
      },
    },
  };

  const getTempBadge = (temp) => {
    if (temp === null || temp === undefined) return null;
    if (temp >= 38.5) {
      return {
        label: 'Fieber',
        badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-800/40',
      };
    }
    if (temp >= 37.5) {
      return {
        label: 'Erhöhte Temperatur',
        badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-800/40',
      };
    }
    return {
      label: 'Normal',
      badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/40',
    };
  };

  const latestTemp = sortedDesc.find((i) => i.temperature !== null)?.temperature;
  const latestTempBadge = getTempBadge(latestTemp);

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-xl mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-rose-950/60 border border-rose-800/50 text-rose-400">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>Krankheits- &amp; Fieber-Tagebuch</span>
              {latestTemp && latestTempBadge && (
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-md font-bold border ${latestTempBadge.badgeClass}`}
                >
                  Aktuell: {latestTemp} °C ({latestTempBadge.label})
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              Temperaturverlauf, Medikamente und Symptome von {activeChild.name} festhalten
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => generateDoctorFeverReport(activeChild)}
            title="Kinderarzt 72h-Bericht als PDF herunterladen"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition-all active:scale-95"
          >
            <FileText className="w-4 h-4 text-rose-400" />
            <span>Kinderarzt-Bericht (PDF)</span>
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={openCreateModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-950 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Messung / Medikament</span>
            </button>
          )}
        </div>
      </div>

      {/* Temperature Curve Chart */}
      {tempLogs.length > 1 && (
        <div className="mb-6 p-4 rounded-3xl bg-slate-950/70 border border-slate-800/80">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Thermometer className="w-4 h-4 text-rose-400" />
              <span>Fieberkurve</span>
            </h4>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Normal (&lt;37.5)
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> Erhöht (37.5–38)
              </span>
              <span className="flex items-center gap-1 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> Fieber (≥38.0)
              </span>
            </div>
          </div>
          <div className="h-48 w-full">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>
      )}

      {/* Health History List */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Verlauf ({healthLog.length} Einträge)
        </h4>

        {healthLog.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800/60">
            Noch keine Krankheits- oder Fiebereinträge vorhanden.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sortedDesc.map((entry) => {
              const d = new Date(entry.dateTime);
              const dateStr = d.toLocaleDateString('de-DE');
              const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} Uhr`;
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
                          {dateStr} um {timeStr}
                        </span>
                      </div>

                      {canEdit && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(entry)}
                            className="p-1 text-slate-400 hover:text-cyan-400 rounded-lg hover:bg-slate-800 transition-colors"
                            title="Eintrag bearbeiten"
                            aria-label="Eintrag bearbeiten"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEntry(entry.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
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

      {/* Entry Modal */}
      {isEntryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-slate-100 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold mb-1 flex items-center gap-2">
              <Activity className="w-5 h-5 text-rose-400" />
              <span>
                {editingEntry ? 'Gesundheitseintrag bearbeiten' : 'Gesundheitseintrag erstellen'}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {editingEntry
                ? 'Passen Sie Temperatur, Uhrzeit, Medikamente oder Notizen an.'
                : 'Temperatur, Medikamente und beobachtete Symptome festhalten.'}
            </p>

            <form onSubmit={handleSaveEntry} className="space-y-4">
              <div>
                <label
                  htmlFor="health-datetime"
                  className="block text-xs font-semibold text-slate-300 mb-1"
                >
                  Datum &amp; Uhrzeit *
                </label>
                <input
                  id="health-datetime"
                  type="datetime-local"
                  required
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label
                  htmlFor="health-temp"
                  className="block text-xs font-semibold text-slate-300 mb-1"
                >
                  Gemessene Temperatur in °C (optional)
                </label>
                <input
                  id="health-temp"
                  type="number"
                  step="0.1"
                  min="34.0"
                  max="43.0"
                  placeholder="z. B. 38.5"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <div>
                <label
                  htmlFor="health-med"
                  className="block text-xs font-semibold text-slate-300 mb-1"
                >
                  Verabreichtes Medikament &amp; Dosis (optional)
                </label>
                <input
                  id="health-med"
                  type="text"
                  placeholder="z. B. Paracetamol 125mg Zäpfchen oder Nurofen Saft"
                  value={medication}
                  onChange={(e) => setMedication(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Symptom Tag Selector */}
              <div>
                <span className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Symptome (Mehrfachauswahl)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_SYMPTOMS.map((sym) => {
                    const isSelected = selectedSymptoms.includes(sym);
                    return (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => toggleSymptom(sym)}
                        className={`text-xs px-2.5 py-1 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-rose-950/80 border-rose-500 text-rose-200 font-semibold'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {sym}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label
                  htmlFor="health-notes"
                  className="block text-xs font-semibold text-slate-300 mb-1"
                >
                  Notizen (optional)
                </label>
                <textarea
                  id="health-notes"
                  rows={2}
                  placeholder="z. B. Viel getrunken, schläft jetzt ruhig..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEntryModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-950"
                >
                  {editingEntry ? 'Änderungen speichern' : 'Eintrag speichern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
