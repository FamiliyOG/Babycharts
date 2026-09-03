import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, Plus, HeartPulse, FileText } from 'lucide-react';
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import TemperatureCurve from './health/TemperatureCurve.jsx';
import HealthLogList from './health/HealthLogList.jsx';
import { generateUuid } from '../utils/uuid.js';

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
  const { t } = useTranslation();
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

    const parsedTemp =
      temperature.trim() === '' ? null : Number.parseFloat(temperature.replace(',', '.'));

    const newEntry = {
      id: editingEntry?.id || generateUuid(),
      dateTime,
      temperature: Number.isNaN(parsedTemp) ? null : parsedTemp,
      medication: medication.trim() || null,
      symptoms: selectedSymptoms,
      notes: notes.trim() || null,
    };

    let updatedList;
    if (editingEntry) {
      updatedList = healthLog.map((item) => (item.id === editingEntry.id ? newEntry : item));
    } else {
      updatedList = [newEntry, ...healthLog];
    }

    onUpdateChild({ healthLog: updatedList });
    setIsEntryModalOpen(false);
  };

  const handleDeleteEntry = (entryId) => {
    if (!canEdit) return;
    if (window.confirm('Möchten Sie diesen Eintrag wirklich löschen?')) {
      const updatedList = healthLog.filter((item) => item.id !== entryId);
      onUpdateChild({ healthLog: updatedList });
    }
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
          if (item.temperature >= 39.0) return '#e11d48';
          if (item.temperature >= 38.0) return '#f97316';
          if (item.temperature >= 37.5) return '#eab308';
          return '#10b981';
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
        label: t('health.fever') || 'Fieber',
        badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-800/40',
      };
    }
    if (temp >= 37.5) {
      return {
        label: t('health.elevatedTemp') || 'Erhöhte Temperatur',
        badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-800/40',
      };
    }
    return {
      label: t('health.normal') || 'Normal',
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
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>{t('health.title')}</span>
              {latestTemp && latestTempBadge && (
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-md font-bold border ${latestTempBadge.badgeClass}`}
                >
                  {t('growth.latestValue')} {latestTemp} °C ({latestTempBadge.label})
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">{t('health.subtitle')}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          <button
            type="button"
            onClick={async () => {
              const { generateDoctorFeverReport } = await import('../utils/doctorPdfGenerator.js');
              generateDoctorFeverReport(activeChild);
            }}
            title="Kinderarzt 72h-Bericht als PDF herunterladen"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition-all active:scale-95 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-rose-400" />
            <span>{t('header.doctorReport')}</span>
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={openCreateModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-950 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('health.addEntry')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Temperature Curve Subcomponent */}
      <TemperatureCurve
        chartData={chartData}
        chartOptions={chartOptions}
        tempLogsCount={tempLogs.length}
      />

      {/* Health History List Subcomponent */}
      <HealthLogList
        healthLog={healthLog}
        sortedDesc={sortedDesc}
        canEdit={canEdit}
        openEditModal={openEditModal}
        handleDeleteEntry={handleDeleteEntry}
        getTempBadge={getTempBadge}
      />

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
                        className={`text-xs px-2.5 py-1 rounded-xl border transition-all cursor-pointer ${
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
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-950 cursor-pointer"
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
