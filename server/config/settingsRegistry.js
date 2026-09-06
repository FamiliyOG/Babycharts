/**
 * server/config/settingsRegistry.js
 * Typed instance settings catalog with schema, defaults, source tracking & validation (Issue #329).
 */

export const SETTINGS_REGISTRY = Object.freeze({
  allow_public_registration: {
    type: 'boolean',
    default: false,
    envVar: 'ALLOW_PUBLIC_REGISTRATION',
    editable: true,
    description: 'Öffentliche Registrierung für neue Benutzer erlauben',
  },
  sentry_enabled: {
    type: 'boolean',
    default: false,
    envVar: 'SENTRY_ENABLED',
    editable: true,
    description: 'Sentry Fehler-Monitoring aktivieren',
  },
  sentry_dsn: {
    type: 'string',
    default: '',
    envVar: 'SENTRY_DSN',
    editable: true,
    description: 'Sentry Data Source Name (DSN)',
  },
  sentry_replay_enabled: {
    type: 'boolean',
    default: false,
    envVar: 'SENTRY_REPLAY_ENABLED',
    editable: true,
    description: 'Sentry Session Replay aktivieren',
  },
  smtp_host: {
    type: 'string',
    default: '',
    envVar: 'SMTP_HOST',
    editable: true,
    description: 'SMTP Server Hostname',
  },
  smtp_port: {
    type: 'number',
    default: 587,
    envVar: 'SMTP_PORT',
    editable: true,
    description: 'SMTP Server Port',
  },
  smtp_user: {
    type: 'string',
    default: '',
    envVar: 'SMTP_USER',
    editable: true,
    description: 'SMTP Benutzername',
  },
  smtp_from: {
    type: 'string',
    default: 'BabyCharts <noreply@babycharts.local>',
    envVar: 'SMTP_FROM',
    editable: true,
    description: 'Absenderadresse für System-E-Mails',
  },
  backup_retention_days: {
    type: 'number',
    default: 30,
    envVar: 'BACKUP_RETENTION_DAYS',
    editable: true,
    description: 'Aufbewahrungsdauer für automatische Datenbank-Backups in Tagen',
  },
  enable_developer_tools: {
    type: 'boolean',
    default: false,
    envVar: 'ENABLE_DEVELOPER_TOOLS',
    editable: true,
    description: 'Entwickler-Diagnosetools für Superadministratoren aktivieren',
  },
  audit_log_retention_days: {
    type: 'number',
    default: 365,
    envVar: 'AUDIT_LOG_RETENTION_DAYS',
    editable: true,
    description: 'Aufbewahrungsdauer für Sicherheits- und Audit-Logs in Tagen',
  },
  soft_delete_retention_days: {
    type: 'number',
    default: 30,
    envVar: 'SOFT_DELETE_RETENTION_DAYS',
    editable: true,
    description:
      'Aufbewahrungsdauer für gelöschte Kinderprofile vor endgültiger Bereinigung in Tagen',
  },
});

function getEffectiveValue(meta, envVal, isLockedByEnv, dbValue) {
  if (isLockedByEnv) {
    if (meta.type === 'boolean') {
      return envVal === 'true' || envVal === '1';
    }
    if (meta.type === 'number') {
      return Number(envVal) || meta.default;
    }
    return envVal;
  }
  if (dbValue !== undefined) {
    return dbValue;
  }
  return meta.default;
}

function getSettingSource(isLockedByEnv, hasDbValue) {
  if (isLockedByEnv) return 'environment';
  if (hasDbValue) return 'database';
  return 'default';
}

/**
 * Returns effective settings by merging defaults, database values, and environment overrides.
 * Environment variables take precedence and mark the setting as locked (read-only in UI).
 */
export function resolveEffectiveSettings(dbSettings = {}) {
  const resolved = {};

  for (const [key, meta] of Object.entries(SETTINGS_REGISTRY)) {
    const envVal = process.env[meta.envVar];
    const isLockedByEnv = envVal !== undefined && envVal !== '';
    const hasDbValue = dbSettings[key] !== undefined;

    resolved[key] = {
      value: getEffectiveValue(meta, envVal, isLockedByEnv, dbSettings[key]),
      type: meta.type,
      editable: meta.editable && !isLockedByEnv,
      source: getSettingSource(isLockedByEnv, hasDbValue),
      description: meta.description,
    };
  }

  return resolved;
}
