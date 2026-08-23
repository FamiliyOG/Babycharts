import { useState } from 'react';
import { X, Upload, FileText, Sparkles, Database as DbIcon, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useModalDismissal } from '../utils/useModalDismissal.js';

export default function ExportImportModal({
  isOpen,
  onClose,
  profiles,
  onImportProfiles,
  onLoadDemoData,
}) {
  const { isDev } = useAuth();
  const { dialogRef } = useModalDismissal(isOpen, onClose);
  const [importStatus, setImportStatus] = useState(null);

  if (!isOpen) return null;

  const handleExportJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(profiles, null, 2));
    const downloadAnchor = document.createElement('a');
    const timestamp = new Date().toISOString().split('T')[0];
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `BabyCharts_Backup_${timestamp}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
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

        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span>Einstellungen &amp; Datensicherung</span>
        </h2>

        {/* Live Database Engine Status Badge */}
        <div className="mb-4 p-3.5 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/50 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-100 dark:bg-cyan-900/60 text-cyan-700 dark:text-cyan-300">
              <DbIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-cyan-950 dark:text-cyan-200">
                Datenbank-Engine
              </div>
              <div className="text-[11px] text-cyan-700 dark:text-cyan-400 font-medium">
                SQLite (Write-Ahead Logging / WAL)
              </div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60 shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Aktiv &amp; Sicher
          </span>
        </div>

        <div className="space-y-4">
          {/* JSON Export */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                JSON Backup-Datei erstellen
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Alle Daten als `.json` Datei sichern
              </div>
            </div>
            <button
              type="button"
              onClick={handleExportJson}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-xs transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>JSON Export</span>
            </button>
          </div>

          {/* JSON Import via File Upload */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>JSON Backup wiederherstellen</span>
            </div>

            {/* Hidden native file input */}
            <input
              type="file"
              id="json-file-upload"
              accept=".json,application/json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const content = await file.text();
                  const parsed = JSON.parse(content);
                  if (!Array.isArray(parsed)) {
                    throw new TypeError('Ungültiges Backup-Format (Array von Profilen erwartet).');
                  }
                  onImportProfiles(parsed);
                  setImportStatus({
                    success: true,
                    text: `✅ Erfolgreich ${parsed.length} Profile aus "${file.name}" importiert!`,
                  });
                } catch (err) {
                  setImportStatus({ success: false, text: `❌ Fehler: ${err.message}` });
                } finally {
                  // Reset input value so same file can be re-selected if needed
                  e.target.value = '';
                }
              }}
            />

            <label
              htmlFor="json-file-upload"
              className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-xl bg-white dark:bg-slate-900/60 hover:bg-indigo-50/40 dark:hover:bg-slate-900 cursor-pointer transition-all group text-center shadow-2xs"
            >
              <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 mb-1.5 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-300">
                Backup-Datei (.json) auswählen
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5">oder Datei hierhin ziehen</span>
            </label>

            {importStatus && (
              <div
                className={`text-[11px] p-2.5 rounded-lg font-medium ${importStatus.success ? 'bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800/60 text-rose-800 dark:text-rose-300'}`}
              >
                {importStatus.text}
              </div>
            )}
          </div>

          {/* Dev / Superadmin Tools (Only visible to isDev) */}
          {isDev && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 flex items-center justify-between shadow-xs">
              <div>
                <div className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Entwickler-Tools (Dev Account)</span>
                </div>
                <div className="text-[11px] text-amber-700 dark:text-amber-400/90 font-medium">
                  Demo-Datensätze (Noah &amp; Mia) mit Beispielwerten laden
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onLoadDemoData) {
                    onLoadDemoData();
                    onClose();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md transition-colors active:scale-95 shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Demo-Daten</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
