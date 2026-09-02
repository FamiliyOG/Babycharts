import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  Upload,
  FileText,
  Sparkles,
  Database as DbIcon,
  Smartphone,
  Laptop,
  Download,
  Check,
  Shield,
  Save,
  Lock,
  Activity,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useModalDismissal } from '../utils/useModalDismissal.js';
import {
  getAppSettings,
  updateAppSettings,
  fetchSessions,
  revokeSessionApi,
  revokeAllOtherSessionsApi,
} from '../utils/api.js';
import { encryptBackup, decryptBackup, isEncryptedBackup } from '../utils/cryptoBackup.js';

export default function ExportImportModal({
  isOpen,
  onClose,
  profiles,
  onImportProfiles,
  onLoadDemoData,
}) {
  const { t } = useTranslation();
  const { isDev } = useAuth();
  const { dialogRef } = useModalDismissal(isOpen, onClose);
  const [importStatus, setImportStatus] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(() =>
    typeof window !== 'undefined' ? window.deferredPrompt : null
  );
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  });
  const [installSuccess, setInstallSuccess] = useState(false);

  // Superadmin Privacy / Sentry settings state (Issue #232)
  const [sentryEnabled, setSentryEnabled] = useState(false);
  const [sentryDsn, setSentryDsn] = useState('');
  const [sentryReplayEnabled, setSentryReplayEnabled] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [healthReport, setHealthReport] = useState(null);
  const [isHealthLoading, setIsHealthLoading] = useState(false);

  // AES-256-GCM Backup Encryption State (Issue #250)
  const [useEncryption, setUseEncryption] = useState(false);
  const [exportPassphrase, setExportPassphrase] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const loadHealthReport = () => {
    setIsHealthLoading(true);
    fetch('/api/exports/health', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('babycharts_token') || ''}`,
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setHealthReport(data);
        setIsHealthLoading(false);
      })
      .catch(() => {
        setIsHealthLoading(false);
      });
  };

  useEffect(() => {
    if (isOpen) {
      fetchSessions().then((sessList) => {
        setSessions(sessList || []);
      });
      loadHealthReport();
    }

    if (isOpen && isDev) {
      getAppSettings().then((res) => {
        if (res.ok && res.data) {
          setSentryEnabled(Boolean(res.data.sentry_enabled));
          setSentryDsn(res.data.sentry_dsn || '');
          setSentryReplayEnabled(Boolean(res.data.sentry_replay_enabled));
        }
      });
    }
  }, [isOpen, isDev]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleInstallable = () => {
      setDeferredPrompt(window.deferredPrompt);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setInstallSuccess(true);
    };

    window.addEventListener('pwa-installable', handleInstallable);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('pwa-installable', handleInstallable);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (!isOpen) return null;

  const handleExportJson = async () => {
    try {
      setIsExporting(true);
      let payload = profiles;
      let filename = `BabyCharts_Backup_${new Date().toISOString().split('T')[0]}.json`;

      if (useEncryption) {
        if (!exportPassphrase || exportPassphrase.length < 6) {
          window.alert(
            'Bitte vergeben Sie ein Passwort mit mindestens 6 Zeichen für das verschlüsselte Backup.'
          );
          setIsExporting(false);
          return;
        }
        payload = await encryptBackup(profiles, exportPassphrase);
        filename = `BabyCharts_EncryptedBackup_${new Date().toISOString().split('T')[0]}.enc.json`;
      }

      const dataStr =
        'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setIsExporting(false);
    } catch (err) {
      setIsExporting(false);
      window.alert('Fehler beim Exportieren: ' + err.message);
    }
  };

  const renderInstallAction = () => {
    if (isInstalled) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60 shrink-0">
          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          Bereits installiert
        </span>
      );
    }
    if (deferredPrompt) {
      return (
        <button
          type="button"
          onClick={handleInstallPwa}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all active:scale-95 shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{t('exportImport.pwaInstallBtn', 'Jetzt installieren')}</span>
        </button>
      );
    }
    return null;
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
          aria-label={t('common.close', 'Schließen')}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span>{t('exportImport.title')}</span>
        </h2>

        {/* PWA Home Screen Installation Card (Mobile only) */}
        <div className="md:hidden mb-4 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 shadow-xs">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                  {t('exportImport.pwaTitle', 'App auf Startbildschirm installieren')}
                </div>
                <div className="text-[11px] text-indigo-700 dark:text-indigo-400 font-medium">
                  {isInstalled
                    ? t('exportImport.pwaDescInstalled', 'Als eigenständige PWA installiert')
                    : t(
                        'exportImport.pwaDescNotInstalled',
                        'BabyCharts als native App auf dem Smartphone nutzen'
                      )}
                </div>
              </div>
            </div>

            {renderInstallAction()}
          </div>

          {!isInstalled && (
            <div className="mt-3 pt-3 border-t border-indigo-200/80 dark:border-indigo-900/50 text-[11px] text-slate-600 dark:text-slate-300 space-y-1.5">
              <p className="font-semibold text-indigo-900 dark:text-indigo-300">
                {t('exportImport.pwaGuideTitle', 'Anleitung für Ihr Smartphone:')}
              </p>
              <div className="flex items-start gap-1.5">
                <span className="font-bold text-indigo-500">
                  {t('exportImport.pwaAndroid', 'Android / Samsung:')}
                </span>
                <span>
                  {t(
                    'exportImport.pwaAndroidStep',
                    'Oben rechts auf das Menü (⋮) tippen → „App installieren“ oder „Zum Startbildschirm hinzufügen“.'
                  )}
                </span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="font-bold text-pink-500">
                  {t('exportImport.pwaIos', 'iPhone (iOS Safari):')}
                </span>
                <span>
                  {t('exportImport.pwaIosStep', 'Unten auf Teilen tippen → „Zum Home-Bildschirm“.')}
                </span>
              </div>
            </div>
          )}

          {installSuccess && (
            <div className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
              ✓ App wurde erfolgreich zum Startbildschirm hinzugefügt!
            </div>
          )}
        </div>

        {/* Server SQLite Database Backups & Restore Management (Issues BC-098, BC-100, BC-101, BC-102) */}
        {isDev && (
          <div className="mb-4 p-3.5 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/50 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-cyan-100 dark:bg-cyan-900/60 text-cyan-700 dark:text-cyan-300">
                  <DbIcon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-cyan-950 dark:text-cyan-200">
                    {t('exportImport.serverBackupsTitle')}
                  </div>
                  <div className="text-[10px] text-cyan-700 dark:text-cyan-400 font-medium">
                    {t('exportImport.serverBackupsDesc')}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const token = localStorage.getItem('token');
                    const res = await fetch('/api/exports/backups/create', {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    if (res.ok) {
                      setImportStatus({
                        success: true,
                        text: '✅ Backup erfolgreich auf dem Server erstellt.',
                      });
                    }
                  } catch (err) {
                    setImportStatus({ success: false, text: `❌ Fehler: ${err.message}` });
                  }
                }}
                className="px-2.5 py-1 text-[11px] font-bold bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                {t('exportImport.createBackupBtn')}
              </button>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 bg-white/70 dark:bg-slate-900/70 p-2 rounded-xl border border-cyan-100 dark:border-cyan-900/40">
              💡 {t('exportImport.preRestoreNotice')}
            </div>
          </div>
        )}

        {/* Automated Database & Backup Health Card (Issue #253) */}
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Datenbank- & Backup-Integrität</span>
                  {healthReport && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${
                        healthReport.healthy
                          ? 'bg-emerald-950 border border-emerald-800 text-emerald-300'
                          : 'bg-amber-950 border border-amber-800 text-amber-300'
                      }`}
                    >
                      {healthReport.healthy ? 'Gesund' : 'Prüfung erforderlich'}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400">
                  SQLite PRAGMA Prüfungen & Konsistenz
                </div>
              </div>
            </div>
            <button
              type="button"
              disabled={isHealthLoading}
              onClick={loadHealthReport}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-colors cursor-pointer"
            >
              {isHealthLoading ? 'Prüfe...' : 'Jetzt prüfen'}
            </button>
          </div>

          {healthReport && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
              <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">Profile</span>
                <strong className="text-slate-200">{healthReport.stats?.profiles ?? '–'}</strong>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">Messungen</span>
                <strong className="text-slate-200">
                  {healthReport.stats?.measurements ?? '–'}
                </strong>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">Audit-Logs</span>
                <strong className="text-slate-200">{healthReport.stats?.auditLogs ?? '–'}</strong>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">Backups</span>
                <strong className="text-slate-200">{healthReport.stats?.backupCount ?? '0'}</strong>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* JSON Export with Optional AES-256-GCM Encryption (Issue #250) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {t('exportImport.exportTitle')}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t('exportImport.exportDesc')}
                </div>
              </div>
              <button
                type="button"
                disabled={isExporting}
                onClick={handleExportJson}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-xs transition-colors cursor-pointer"
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

          {/* GDPR Complete Personal Data Export (BC-207) */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 flex items-center justify-between shadow-xs">
            <div>
              <div className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                {t('auth.exportMyDataTitle', 'Vollständiger DSGVO-Datenexport')}
              </div>
              <div className="text-[11px] text-indigo-700 dark:text-indigo-400 font-medium">
                {t(
                  'auth.exportMyDataDesc',
                  'Exportiert alle Ihre Daten, Familien und Messungen als maschinenlesbares JSON-Archiv (Art. 20 DSGVO).'
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                try {
                  const { exportMyData } = await import('../utils/api.js');
                  const res = await exportMyData();
                  if (res.ok && res.data) {
                    const dataStr =
                      'data:text/json;charset=utf-8,' +
                      encodeURIComponent(JSON.stringify(res.data, null, 2));
                    const a = document.createElement('a');
                    a.href = dataStr;
                    a.download = `BabyCharts_AccountExport_${new Date().toISOString().split('T')[0]}.json`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                  } else {
                    window.alert(res.error || 'Fehler beim Exportieren Ihrer Daten.');
                  }
                } catch (err) {
                  window.alert('Fehler: ' + err.message);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('auth.exportMyDataBtn', 'Daten exportieren')}</span>
            </button>
          </div>

          {/* Active Sessions & Devices (Issue #249) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Laptop className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Angemeldete Geräte & Sitzungen</span>
              </div>
              {sessions.some((s) => !s.isCurrent) && (
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm('Möchten Sie wirklich alle anderen Sitzungen abmelden?')) {
                      await revokeAllOtherSessionsApi();
                      const updated = await fetchSessions();
                      setSessions(updated || []);
                    }
                  }}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-950/80 border border-rose-800 text-rose-300 hover:bg-rose-900 transition-colors cursor-pointer"
                >
                  Alle anderen abmelden
                </button>
              )}
            </div>

            <div className="space-y-2">
              {sessions.length === 0 ? (
                <div className="text-[11px] text-slate-500">Keine Sitzungen geladen.</div>
              ) : (
                sessions.map((sess) => (
                  <div
                    key={sess.id}
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <span>{sess.device || 'Unbekanntes Gerät'}</span>
                        {sess.isCurrent && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-950 border border-emerald-800 text-emerald-300 font-bold">
                            Aktuelles Gerät
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        IP: {sess.ip} • Aktiv:{' '}
                        {new Date(sess.lastActiveAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>

                    {!sess.isCurrent && (
                      <button
                        type="button"
                        onClick={async () => {
                          await revokeSessionApi(sess.id);
                          const updated = await fetchSessions();
                          setSessions(updated || []);
                        }}
                        className="px-2 py-1 rounded-lg text-[11px] font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors cursor-pointer"
                      >
                        Abmelden
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* JSON Import via File Upload */}
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
              onChange={async (e) => {
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
                {t('exportImport.importBtn')}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5">
                {t('exportImport.importDesc')}
              </span>
            </label>

            {importStatus && (
              <div
                className={`text-[11px] p-2.5 rounded-lg font-medium ${importStatus.success ? 'bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800/60 text-rose-800 dark:text-rose-300'}`}
              >
                {importStatus.text}
              </div>
            )}
          </div>

          {/* Dev / Superadmin Tools & Privacy Configuration (Only visible to isDev) */}
          {isDev && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 flex items-center justify-between shadow-xs">
                <div>
                  <div className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>{t('exportImport.devToolsTitle', 'Entwickler-Tools (Dev Account)')}</span>
                  </div>
                  <div className="text-[11px] text-amber-700 dark:text-amber-400/90 font-medium">
                    {t(
                      'exportImport.devToolsDesc',
                      'Demo-Datensätze (Noah & Mia) mit Beispielwerten laden'
                    )}
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
                  <span>{t('exportImport.demoDataBtn', 'Demo-Daten')}</span>
                </button>
              </div>

              {/* Privacy & Sentry Configuration (Issue #232) */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Datenschutz & Fehler-Telemetrie (Sentry)
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800">
                    Instanz-Admin
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Standardmäßig überträgt BabyCharts <strong>keine Telemetrie</strong> an Dritte.
                  Hier können Sie optional eine Sentry-Fehlerüberwachung für Ihren Server
                  konfigurieren.
                </p>

                <div className="space-y-2.5 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={sentryEnabled}
                      onChange={(e) => setSentryEnabled(e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-700 text-cyan-600 focus:ring-cyan-500 w-4 h-4"
                    />
                    <span>Sentry Fehler-Telemetrie aktivieren</span>
                  </label>

                  {sentryEnabled && (
                    <div className="space-y-2 pl-6 animate-fadeIn">
                      <div>
                        <label
                          htmlFor="sentry-dsn-input"
                          className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1"
                        >
                          Sentry DSN (Ingest URL)
                        </label>
                        <input
                          id="sentry-dsn-input"
                          type="text"
                          value={sentryDsn}
                          onChange={(e) => setSentryDsn(e.target.value)}
                          placeholder="https://...@ingest.de.sentry.io/..."
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500 outline-hidden font-mono"
                        />
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer text-[11px] font-medium text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={sentryReplayEnabled}
                          onChange={(e) => setSentryReplayEnabled(e.target.checked)}
                          className="rounded border-slate-300 dark:border-slate-700 text-cyan-600 focus:ring-cyan-500 w-3.5 h-3.5"
                        />
                        <span>Session Replay aktivieren (nur bei Fehlern aufzeichnen)</span>
                      </label>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    {settingsSaved && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Gespeichert!
                      </span>
                    )}
                    {!settingsSaved && <span />}

                    <button
                      type="button"
                      disabled={settingsLoading}
                      onClick={async () => {
                        setSettingsLoading(true);
                        setSettingsSaved(false);
                        const res = await updateAppSettings({
                          sentry_enabled: sentryEnabled,
                          sentry_dsn: sentryEnabled ? sentryDsn.trim() : null,
                          sentry_replay_enabled: sentryEnabled ? sentryReplayEnabled : false,
                        });
                        setSettingsLoading(false);
                        if (res.ok) {
                          setSettingsSaved(true);
                          setTimeout(() => setSettingsSaved(false), 3000);
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-xs transition-colors active:scale-95 disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>
                        {settingsLoading ? 'Wird gespeichert...' : 'Einstellungen speichern'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
