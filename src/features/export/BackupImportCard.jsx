import { Upload } from 'lucide-react';
import { decryptBackup, isEncryptedBackup } from '../../utils/cryptoBackup.js';

export function BackupImportCard({ onImportProfiles, importStatus, setImportStatus, t }) {
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const content = await file.text();
      let parsed = JSON.parse(content);

      // Check if encrypted backup (Issue #250)
      if (isEncryptedBackup(parsed)) {
        const pass = window.prompt(
          'Dieses Backup ist mit AES-256-GCM verschlüsselt.\n\nBitte geben Sie die Passphrase ein, um die Daten zu entschlüsseln:'
        );
        if (!pass) {
          setImportStatus({
            success: false,
            text: '❌ Entschlüsselung abgebrochen.',
          });
          return;
        }
        parsed = await decryptBackup(parsed, pass);
      }

      if (!Array.isArray(parsed)) {
        throw new TypeError('Ungültiges Backup-Format (Array von Profilen erwartet).');
      }
      onImportProfiles(parsed);
      setImportStatus({
        success: true,
        text: `✅ ${t('exportImport.importSuccess')}`,
      });
    } catch (err) {
      setImportStatus({ success: false, text: `❌ Fehler: ${err.message}` });
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
        <Upload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
        <span>{t('exportImport.importTitle')}</span>
      </div>

      {/* Hidden native file input */}
      <input
        type="file"
        id="json-file-upload"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFileChange}
      />

      <label
        htmlFor="json-file-upload"
        className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-xl bg-white dark:bg-slate-900/60 hover:bg-indigo-50/40 dark:hover:bg-slate-900 cursor-pointer transition-all group text-center shadow-2xs"
      >
        <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 mb-1.5 group-hover:scale-110 transition-transform" />
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-300">
          {t('exportImport.importBtn')}
        </span>
        <span className="text-[10px] text-slate-500 mt-0.5">{t('exportImport.importDesc')}</span>
      </label>

      {importStatus && (
        <div
          className={`text-[11px] p-2.5 rounded-lg font-medium ${
            importStatus.success
              ? 'bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800/60 text-rose-800 dark:text-rose-300'
          }`}
        >
          {importStatus.text}
        </div>
      )}
    </div>
  );
}
