import { FileText, Lock } from 'lucide-react';

export function BackupExportCard({
  profiles,
  useEncryption,
  setUseEncryption,
  exportPassphrase,
  setExportPassphrase,
  isExporting,
  onExport,
  t,
}) {
  return (
    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>{t('exportImport.exportTitle')}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {t('exportImport.exportDesc', { count: profiles.length })}
          </div>
        </div>

        <button
          type="button"
          onClick={onExport}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-cyan-500 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
        >
          {useEncryption ? (
            <Lock className="w-3.5 h-3.5 text-cyan-500" />
          ) : (
            <FileText className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          )}
          <span>{isExporting ? 'Exportiere...' : t('exportImport.exportBtn')}</span>
        </button>
      </div>

      {/* Encryption toggle & passphrase */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={useEncryption}
            onChange={(e) => setUseEncryption(e.target.checked)}
            className="rounded text-cyan-600 focus:ring-cyan-500"
          />
          <span>Mit Passphrase verschlüsseln (AES-256-GCM)</span>
        </label>

        {useEncryption && (
          <div className="pl-6 space-y-1">
            <input
              type="password"
              placeholder="Passphrase für das Backup eingeben (min. 6 Zeichen)"
              value={exportPassphrase}
              onChange={(e) => setExportPassphrase(e.target.value)}
              className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
            />
            <div className="text-[10px] text-slate-500">
              🔒 Schützt Ihr Backup mit modernster PBKDF2 + AES-GCM Verschlüsselung.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
