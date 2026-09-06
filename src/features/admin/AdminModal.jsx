import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Server,
  Users,
  Settings,
  Save,
  Check,
  Loader2,
  X,
  Database,
  Sparkles,
  UserPlus,
  Mail,
  Activity,
  Shield,
  Hash,
  AtSign,
  Clock,
  Globe,
  Eye,
  Lock,
  Terminal,
} from 'lucide-react';
import {
  fetchSettingsCatalog,
  updateAppSettings,
  fetchSessions,
  revokeSessionApi,
  fetchDeveloperDiagnostics,
} from '../../utils/api.js';
import { useBodyScrollLock } from '../../utils/useBodyScrollLock.js';

/** Visual metadata per settings key */
const SETTING_META = {
  allow_public_registration: {
    label: 'Öffentliche Registrierung',
    icon: UserPlus,
    group: 'registration',
    hint: 'Erlaubt neuen Benutzern, sich selbst zu registrieren.',
  },
  sentry_enabled: {
    label: 'Fehler-Monitoring aktivieren',
    icon: Activity,
    group: 'monitoring',
    hint: 'Sendet Fehlerberichte an Ihren Sentry-Server.',
  },
  sentry_dsn: {
    label: 'Sentry DSN (Ingest-URL)',
    icon: Globe,
    group: 'monitoring',
    hint: 'Ihre Sentry Data Source Name URL.',
    placeholder: 'https://...@ingest.sentry.io/...',
    mono: true,
  },
  sentry_replay_enabled: {
    label: 'Session Replay bei Fehlern',
    icon: Eye,
    group: 'monitoring',
    hint: 'Zeichnet Browser-Sitzungen nur bei Fehlerauftritt auf.',
  },
  enable_developer_tools: {
    label: 'Entwickler- & Systemdiagnose',
    icon: Terminal,
    group: 'monitoring',
    hint: 'Aktiviert den sicheren Diagnose-Endpunkt für Server-, Speicher- und SQLite-Metriken.',
  },
  smtp_host: {
    label: 'SMTP Server',
    icon: Server,
    group: 'email',
    hint: 'Hostname Ihres ausgehenden Mail-Servers.',
    placeholder: 'mail.example.com',
    mono: true,
  },
  smtp_port: {
    label: 'SMTP Port',
    icon: Hash,
    group: 'email',
    hint: 'Standard: 587 (STARTTLS) oder 465 (SSL/TLS).',
    placeholder: '587',
    mono: true,
  },
  smtp_user: {
    label: 'SMTP Benutzername',
    icon: AtSign,
    group: 'email',
    hint: 'Login-Name für die SMTP-Authentifizierung.',
    placeholder: 'user@example.com',
    mono: true,
  },
  smtp_from: {
    label: 'Absender-Adresse',
    icon: Mail,
    group: 'email',
    hint: 'Wird als "Von"-Adresse in System-E-Mails angezeigt.',
    placeholder: 'BabyCharts <noreply@example.com>',
    mono: true,
  },
  backup_retention_days: {
    label: 'Backup-Aufbewahrung (Tage)',
    icon: Clock,
    group: 'backup',
    hint: 'Automatische Backups älter als diese Tagesanzahl werden gelöscht.',
    placeholder: '30',
  },
};

const GROUPS = {
  registration: {
    label: 'Registrierung',
    icon: UserPlus,
    border: 'border-indigo-800/50',
    bg: 'bg-indigo-950/30',
    headerBorder: 'border-indigo-800/50',
    header: 'text-indigo-300',
    iconBg: 'bg-indigo-900/60 text-indigo-300',
  },
  monitoring: {
    label: 'Monitoring & Telemetrie',
    icon: Shield,
    border: 'border-cyan-800/50',
    bg: 'bg-cyan-950/25',
    headerBorder: 'border-cyan-800/50',
    header: 'text-cyan-300',
    iconBg: 'bg-cyan-900/60 text-cyan-300',
  },
  email: {
    label: 'E-Mail (SMTP)',
    icon: Mail,
    border: 'border-violet-800/50',
    bg: 'bg-violet-950/25',
    headerBorder: 'border-violet-800/50',
    header: 'text-violet-300',
    iconBg: 'bg-violet-900/60 text-violet-300',
  },
  backup: {
    label: 'Datenbank & Backup',
    icon: Database,
    border: 'border-emerald-800/50',
    bg: 'bg-emerald-950/25',
    headerBorder: 'border-emerald-800/50',
    header: 'text-emerald-300',
    iconBg: 'bg-emerald-900/60 text-emerald-300',
  },
};

function ToggleSwitch({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label ?? (checked ? 'Aktiviert' : 'Deaktiviert')}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
      } ${checked ? 'bg-cyan-600' : 'bg-slate-700'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function renderGroupedSettings(catalog, formData, setFormData, excludeGroups = []) {
  const grouped = {};
  for (const [key, item] of Object.entries(catalog)) {
    const meta = SETTING_META[key];
    const groupKey = meta?.group ?? 'other';
    if (excludeGroups.includes(groupKey)) continue;
    if (!grouped[groupKey]) grouped[groupKey] = [];
    grouped[groupKey].push({ key, item, meta });
  }

  return Object.entries(grouped).map(([groupKey, entries]) => {
    const group = GROUPS[groupKey] ?? {
      label: groupKey,
      icon: Settings,
      border: 'border-slate-700',
      bg: 'bg-slate-950/40',
      headerBorder: 'border-slate-700',
      header: 'text-slate-300',
      iconBg: 'bg-slate-800 text-slate-300',
    };
    const GroupIcon = group.icon;

    return (
      <div
        key={groupKey}
        className={`rounded-2xl border ${group.border} ${group.bg} overflow-hidden`}
      >
        <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${group.headerBorder}`}>
          <div className={`p-1 rounded-lg ${group.iconBg}`}>
            <GroupIcon className="w-3.5 h-3.5" />
          </div>
          <span className={`text-xs font-bold tracking-wide ${group.header}`}>{group.label}</span>
        </div>

        <div className="divide-y divide-slate-800/60">
          {entries.map(({ key, item, meta }) => {
            const isLocked = !item.editable;
            const IconComp = meta?.icon ?? Lock;

            return (
              <div
                key={key}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <IconComp className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-200">
                        {meta?.label ?? key}
                      </span>
                      {isLocked && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-300 font-bold flex items-center gap-0.5">
                          <Lock className="w-2.5 h-2.5" /> ENV
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      {meta?.hint ?? item.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pl-6 sm:pl-0">
                  {item.type === 'boolean' ? (
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`text-xs font-medium ${
                          formData[key] ? 'text-cyan-400' : 'text-slate-500'
                        }`}
                      >
                        {formData[key] ? 'Aktiv' : 'Inaktiv'}
                      </span>
                      <ToggleSwitch
                        checked={Boolean(formData[key])}
                        disabled={isLocked}
                        label={meta?.label ?? key}
                        onChange={(val) => setFormData({ ...formData, [key]: val })}
                      />
                    </div>
                  ) : (
                    <input
                      type={item.type === 'number' ? 'number' : 'text'}
                      disabled={isLocked}
                      value={formData[key] ?? ''}
                      placeholder={meta?.placeholder ?? ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          [key]: item.type === 'number' ? Number(e.target.value) : e.target.value,
                        })
                      }
                      className={`px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-slate-100 disabled:opacity-40 focus:outline-hidden focus:border-cyan-500 w-52 ${meta?.mono ? 'font-mono' : ''}`}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  });
}

function buildSettingsTab({
  catalog,
  formData,
  setFormData,
  statusMsg,
  saveSuccess,
  isSaving,
  handleSaveSettings,
  t,
}) {
  return (
    <form onSubmit={handleSaveSettings} className="space-y-4">
      {renderGroupedSettings(catalog, formData, setFormData, ['backup'])}

      {statusMsg && (
        <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-xl">
          {statusMsg}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-slate-800">
        {saveSuccess ? (
          <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
            <Check className="w-4 h-4" /> Einstellungen gespeichert!
          </span>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={isSaving}
          className="px-4 py-2 bg-linear-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
        >
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          <span>{t('common.save', 'Speichern')}</span>
        </button>
      </div>
    </form>
  );
}

function buildSessionsTab({ sessions, setSessions }) {
  if (sessions.length === 0) {
    return (
      <div className="space-y-2">
        <div className="text-xs text-slate-400 mb-2">
          Aktive Anmeldesitzungen auf diesem Server.
        </div>
        <div className="text-xs text-slate-500 text-center py-8">
          Keine aktiven Sitzungen gefunden.
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="text-xs text-slate-400 mb-2">Aktive Anmeldesitzungen auf diesem Server.</div>
      {sessions.map((sess) => (
        <div
          key={sess.id}
          className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl flex items-center justify-between gap-3 text-xs"
        >
          <div>
            <div className="font-bold text-slate-200 flex items-center gap-2">
              <span>{sess.device || 'Unbekanntes Gerät'}</span>
              {sess.isCurrent && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 font-bold">
                  Aktuelle Sitzung
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              IP: {sess.ip} • Letzte Aktivität: {new Date(sess.lastActiveAt).toLocaleString()}
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
              className="px-2.5 py-1 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 rounded-xl transition-colors cursor-pointer"
            >
              Abmelden
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function buildBackupsTab({
  isCreatingBackup,
  setIsCreatingBackup,
  backupStatus,
  setBackupStatus,
  healthReport,
  diagnosticsData,
  isHealthLoading,
  handleManualHealthCheck,
  catalog,
  formData,
  setFormData,
  isSavingRetention,
  handleSaveRetention,
  retentionStatus,
  onLoadDemoData,
  onClose,
  t,
}) {
  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    setBackupStatus(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/exports/backups/create', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setBackupStatus(
        res.ok
          ? { ok: true, text: '✅ Backup erfolgreich auf dem Server erstellt.' }
          : { ok: false, text: '❌ Fehler beim Erstellen des Backups.' }
      );
    } catch (err) {
      setBackupStatus({ ok: false, text: `❌ Fehler: ${err.message}` });
    } finally {
      setIsCreatingBackup(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Unified System-, Database- & Backup-Integrity Card (Issues #253 & #331) */}
      <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-cyan-900/40 text-cyan-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2 flex-wrap">
                <span>System- & Datenbank-Integrität</span>
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
                {diagnosticsData?.database?.journalMode && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold bg-cyan-950 border border-cyan-800 text-cyan-300">
                    {diagnosticsData.database.journalMode}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-400">
                SQLite PRAGMA Prüfungen, Systemmetriken & Konsistenz
              </div>
            </div>
          </div>
          <button
            type="button"
            disabled={isHealthLoading}
            onClick={handleManualHealthCheck}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-colors cursor-pointer"
          >
            {isHealthLoading ? 'Prüfe...' : 'Jetzt prüfen'}
          </button>
        </div>

        {/* System & Runtime Metrics */}
        {diagnosticsData && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Node / Platform</span>
              <strong className="text-slate-200">
                {diagnosticsData.system?.nodeVersion} ({diagnosticsData.system?.platform})
              </strong>
            </div>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Uptime</span>
              <strong className="text-slate-200">
                {Math.floor((diagnosticsData.system?.uptimeSeconds || 0) / 60)} min
              </strong>
            </div>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">RAM (RSS / Heap)</span>
              <strong className="text-slate-200">
                {diagnosticsData.system?.memoryUsageMb?.rss ?? 0} MB /{' '}
                {diagnosticsData.system?.memoryUsageMb?.heapUsed ?? 0} MB
              </strong>
            </div>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Architektur</span>
              <strong className="text-slate-200">{diagnosticsData.system?.arch || 'x64'}</strong>
            </div>
          </div>
        )}

        {/* Database Key Metrics */}
        {(healthReport || diagnosticsData) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Benutzer</span>
              <strong className="text-slate-200">
                {diagnosticsData?.database?.tableCounts?.users ?? healthReport?.stats?.users ?? '–'}
              </strong>
            </div>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Familien</span>
              <strong className="text-slate-200">
                {diagnosticsData?.database?.tableCounts?.families ??
                  healthReport?.stats?.families ??
                  '–'}
              </strong>
            </div>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Profile</span>
              <strong className="text-slate-200">
                {healthReport?.stats?.profiles ??
                  diagnosticsData?.database?.tableCounts?.profiles ??
                  '–'}
              </strong>
            </div>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Messungen</span>
              <strong className="text-slate-200">{healthReport?.stats?.measurements ?? '–'}</strong>
            </div>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Medien-Dateien</span>
              <strong className="text-slate-200">
                {diagnosticsData?.database?.tableCounts?.media_files ??
                  healthReport?.stats?.mediaFiles ??
                  '–'}
              </strong>
            </div>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Einladungen</span>
              <strong className="text-slate-200">
                {diagnosticsData?.database?.tableCounts?.invites ??
                  healthReport?.stats?.invites ??
                  '–'}
              </strong>
            </div>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Audit-Logs</span>
              <strong className="text-slate-200">
                {healthReport?.stats?.auditLogs ??
                  diagnosticsData?.database?.tableCounts?.audit_logs ??
                  '–'}
              </strong>
            </div>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Backups</span>
              <strong className="text-slate-200">{healthReport?.stats?.backupCount ?? '0'}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Backup Retention Settings (Issue #329) */}
      {catalog?.backup_retention_days && (
        <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-800/40 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="p-1.5 rounded-xl bg-emerald-900/50 text-emerald-300 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-emerald-200">
                    Backup-Aufbewahrung (Tage)
                  </span>
                  {!catalog.backup_retention_days.editable && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-300 font-bold flex items-center gap-0.5">
                      <Lock className="w-2.5 h-2.5" /> ENV
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Automatische Backups älter als diese Tagesanzahl werden gelöscht.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <input
                type="number"
                min="1"
                max="3650"
                disabled={!catalog.backup_retention_days.editable || isSavingRetention}
                value={formData.backup_retention_days ?? 30}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    backup_retention_days: Number(e.target.value),
                  })
                }
                className="w-24 px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-slate-100 disabled:opacity-40 focus:outline-hidden focus:border-cyan-500"
              />
              <button
                type="button"
                disabled={!catalog.backup_retention_days.editable || isSavingRetention}
                onClick={handleSaveRetention}
                className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl transition-colors cursor-pointer flex items-center gap-1"
              >
                {isSavingRetention ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>Speichern</span>
              </button>
            </div>
          </div>
          {retentionStatus && (
            <div
              className={`text-[11px] p-2 rounded-lg font-medium ${
                retentionStatus.ok
                  ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                  : 'bg-rose-950/60 border border-rose-800 text-rose-300'
              }`}
            >
              {retentionStatus.text}
            </div>
          )}
        </div>
      )}

      <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-800/50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-cyan-900/60 text-cyan-300">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-cyan-200">
                {t('exportImport.serverBackupsTitle', 'Server-Datenbank-Backup')}
              </div>
              <div className="text-[10px] text-cyan-400">
                {t('exportImport.serverBackupsDesc', 'Erstellt ein SQLite-Backup auf dem Server')}
              </div>
            </div>
          </div>
          <button
            type="button"
            disabled={isCreatingBackup}
            onClick={handleCreateBackup}
            className="px-2.5 py-1 text-[11px] font-bold bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg transition-colors cursor-pointer"
          >
            {isCreatingBackup
              ? t('common.loading', 'Laden...')
              : t('exportImport.createBackupBtn', 'Backup erstellen')}
          </button>
        </div>
        <div className="text-[10px] text-slate-400 bg-slate-950/60 p-2 rounded-xl border border-cyan-900/40">
          💡{' '}
          {t(
            'exportImport.preRestoreNotice',
            'Erstellen Sie vor jeder Wiederherstellung ein aktuelles Backup.'
          )}
        </div>
        {backupStatus && (
          <div
            className={`text-[11px] p-2 rounded-lg font-medium ${
              backupStatus.ok
                ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                : 'bg-rose-950/60 border border-rose-800 text-rose-300'
            }`}
          >
            {backupStatus.text}
          </div>
        )}
      </div>

      {onLoadDemoData && (
        <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-800/40 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('exportImport.devToolsTitle', 'Entwickler-Tools (Dev Account)')}</span>
            </div>
            <div className="text-[11px] text-amber-400/90">
              {t(
                'exportImport.devToolsDesc',
                'Demo-Datensätze (Noah & Mia) mit Beispielwerten laden'
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onLoadDemoData();
              onClose();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md transition-colors active:scale-95 shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('exportImport.demoDataBtn', 'Demo-Daten')}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminModal({ isOpen, onClose, onLoadDemoData }) {
  useBodyScrollLock(isOpen);
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('settings');
  const [catalog, setCatalog] = useState({});
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [statusMsg, setStatusMsg] = useState(null);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [backupStatus, setBackupStatus] = useState(null);
  const [healthReport, setHealthReport] = useState(null);
  const [isHealthLoading, setIsHealthLoading] = useState(false);
  const [isSavingRetention, setIsSavingRetention] = useState(false);
  const [retentionStatus, setRetentionStatus] = useState(null);
  const [diagnosticsData, setDiagnosticsData] = useState(null);

  const fetchDiagnosticsData = async () => {
    try {
      const res = await fetchDeveloperDiagnostics();
      return res.ok && res.data?.diagnosticsEnabled ? res.data : null;
    } catch {
      return null;
    }
  };

  const fetchHealthReportData = async () => {
    try {
      const res = await fetch('/api/exports/health', {
        credentials: 'same-origin',
      });
      return res.ok ? await res.json() : null;
    } catch {
      return null;
    }
  };

  const handleManualHealthCheck = async () => {
    setIsHealthLoading(true);
    try {
      const isDiagActive =
        catalog?.enable_developer_tools?.value || formData?.enable_developer_tools;
      const [health, diag] = await Promise.all([
        fetchHealthReportData(),
        isDiagActive ? fetchDiagnosticsData() : Promise.resolve(null),
      ]);
      if (health) setHealthReport(health);
      if (diag) setDiagnosticsData(diag);
    } finally {
      setIsHealthLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    Promise.all([fetchSettingsCatalog(), fetchSessions(), fetchHealthReportData()]).then(
      ([catalogRes, sessionsRes, healthData]) => {
        if (!isMounted) return;
        if (catalogRes.ok && catalogRes.data?.catalog) {
          setCatalog(catalogRes.data.catalog);
          const initialForm = {};
          for (const [key, item] of Object.entries(catalogRes.data.catalog)) {
            initialForm[key] = item.value;
          }
          setFormData(initialForm);
          if (catalogRes.data.catalog.enable_developer_tools?.value) {
            fetchDiagnosticsData().then((diag) => {
              if (isMounted && diag) setDiagnosticsData(diag);
            });
          }
        }
        if (Array.isArray(sessionsRes)) {
          setSessions(sessionsRes);
        }
        if (healthData) {
          setHealthReport(healthData);
        }
        setIsLoading(false);
      }
    );

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setStatusMsg(null);

    const res = await updateAppSettings(formData);
    setIsSaving(false);

    if (res.ok) {
      setSaveSuccess(true);
      if (formData.enable_developer_tools && !diagnosticsData) {
        fetchDiagnosticsData().then((diag) => {
          if (diag) setDiagnosticsData(diag);
        });
      }
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      setStatusMsg(res.error || t('admin.saveError', 'Fehler beim Speichern der Einstellungen.'));
    }
  };

  const handleSaveRetention = async () => {
    setIsSavingRetention(true);
    setRetentionStatus(null);
    const res = await updateAppSettings({
      backup_retention_days: formData.backup_retention_days ?? 30,
    });
    setIsSavingRetention(false);
    if (res.ok) {
      setRetentionStatus({ ok: true, text: '✅ Aufbewahrungsdauer gespeichert.' });
      setTimeout(() => setRetentionStatus(null), 3000);
    } else {
      setRetentionStatus({
        ok: false,
        text: res.error || 'Fehler beim Speichern der Aufbewahrungsdauer.',
      });
    }
  };

  let tabContent;
  if (isLoading) {
    tabContent = (
      <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
        <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
        <span>{t('common.loading', 'Laden...')}</span>
      </div>
    );
  } else if (activeTab === 'settings') {
    tabContent = buildSettingsTab({
      catalog,
      formData,
      setFormData,
      statusMsg,
      saveSuccess,
      isSaving,
      handleSaveSettings,
      t,
    });
  } else if (activeTab === 'sessions') {
    tabContent = buildSessionsTab({ sessions, setSessions });
  } else {
    tabContent = buildBackupsTab({
      isCreatingBackup,
      setIsCreatingBackup,
      backupStatus,
      setBackupStatus,
      healthReport,
      diagnosticsData,
      isHealthLoading,
      handleManualHealthCheck,
      catalog,
      formData,
      setFormData,
      isSavingRetention,
      handleSaveRetention,
      retentionStatus,
      onLoadDemoData,
      onClose,
      t,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn overscroll-none">
      <div
        aria-labelledby="admin-modal-title"
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative text-slate-100 max-h-[90vh] flex flex-col overscroll-contain"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-cyan-950/60 border border-cyan-800/60 text-cyan-400">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h2
                id="admin-modal-title"
                className="text-base font-bold text-slate-100 flex items-center gap-2"
              >
                <span>{t('admin.title', 'Instanz-Administration')}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300 font-bold uppercase tracking-wider">
                  Superadmin
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {t(
                  'admin.subtitle',
                  'Globale Server-Einstellungen, aktive Sessions und Systemverwaltung.'
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label={t('common.close', 'Schließen')}
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 pt-3 pb-2 border-b border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-cyan-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{t('admin.settingsTab', 'Einstellungen')}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sessions')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'sessions'
                ? 'bg-cyan-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{t('admin.sessionsTab', 'Aktive Sessions')}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('backups')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'backups'
                ? 'bg-cyan-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>{t('admin.backupsTab', 'Backups & Tools')}</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">{tabContent}</div>
      </div>
    </div>
  );
}
