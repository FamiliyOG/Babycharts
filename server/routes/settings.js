import { Router } from 'express';
import { readDb, writeDb, getSettings } from '../utils/db.js';
import { requireAuth, requireInstanceAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/settings/public – public runtime instance settings for frontend boot (Issue #232, #260)
router.get('/public', async (req, res) => {
  const { resolveEffectiveSettings } = await import('../config/settingsRegistry.js');
  const db = readDb();
  const catalog = resolveEffectiveSettings(db.settings || {});

  res.json({
    sentry_enabled: Boolean(catalog.sentry_enabled?.value),
    sentry_dsn: catalog.sentry_enabled?.value ? catalog.sentry_dsn?.value || null : null,
    sentry_replay_enabled: Boolean(catalog.sentry_replay_enabled?.value),
    allow_public_registration: Boolean(catalog.allow_public_registration?.value),
  });
});

// GET /api/settings/catalog – typed instance settings catalog for admin UI (Issue #329)
router.get('/catalog', requireAuth, requireInstanceAdmin, async (req, res) => {
  const { resolveEffectiveSettings } = await import('../config/settingsRegistry.js');
  const db = readDb();
  const catalog = resolveEffectiveSettings(db.settings || {});
  res.json({ catalog });
});

// GET /api/settings – authenticated app settings
router.get('/', requireAuth, (req, res) => {
  const safeSettings = { ...getSettings() };
  // Never expose sensitive keys in client response
  delete safeSettings.jwt_secret;
  delete safeSettings.media_master_key;
  delete safeSettings.data_encryption_key;
  delete safeSettings.setup_token;

  res.json({
    ...safeSettings,
    databaseEngine: 'SQLite',
    journalMode: 'WAL',
  });
});

function validateSettingEntry(key, value, registry) {
  const meta = registry[key];
  if (!meta) {
    return { error: `Unbekannte Einstellung: '${key}'` };
  }
  if (!meta.editable) {
    return { error: `Einstellung '${key}' kann nicht geändert werden.` };
  }

  if (meta.type === 'boolean') {
    if (typeof value !== 'boolean') {
      return { error: `Ungültiger Wert für '${key}': boolean erwartet.` };
    }
    return { value };
  }

  if (meta.type === 'number') {
    const num = Number(value);
    if (Number.isNaN(num)) {
      return { error: `Ungültiger Wert für '${key}': number erwartet.` };
    }
    return { value: num };
  }

  if (meta.type === 'string') {
    if (typeof value !== 'string') {
      return { error: `Ungültiger Wert für '${key}': string erwartet.` };
    }
    return { value: value.trim() };
  }

  return { value };
}

// POST /api/settings – update app settings (strictly requires Instance-Admin RBAC)
router.post('/', requireAuth, requireInstanceAdmin, async (req, res) => {
  const { SETTINGS_REGISTRY } = await import('../config/settingsRegistry.js');
  const db = readDb();
  const rawUpdates = req.body || {};

  if (typeof rawUpdates !== 'object' || rawUpdates === null || Array.isArray(rawUpdates)) {
    return res.status(400).json({ error: 'Ungültiges Einstellungsformat.' });
  }

  const updates = {};
  const errors = [];

  for (const [key, value] of Object.entries(rawUpdates)) {
    const result = validateSettingEntry(key, value, SETTINGS_REGISTRY);
    if (result.error) {
      errors.push(result.error);
    } else {
      updates[key] = result.value;
    }
  }

  if (errors.length > 0) {
    return res
      .status(400)
      .json({ error: 'Validierungsfehler bei den Einstellungen.', details: errors });
  }

  db.settings = { ...db.settings, ...updates };
  writeDb(db);

  const responseSettings = { ...db.settings };
  delete responseSettings.jwt_secret;
  delete responseSettings.media_master_key;
  delete responseSettings.data_encryption_key;
  delete responseSettings.setup_token;

  res.json(responseSettings);
});

// GET /api/settings/developer-diagnostics – safe, sanitized developer diagnostics (Issue #331)
router.get('/developer-diagnostics', requireAuth, requireInstanceAdmin, async (req, res) => {
  const { resolveEffectiveSettings } = await import('../config/settingsRegistry.js');
  const db = readDb();
  const effective = resolveEffectiveSettings(db.settings || {});

  if (!effective.enable_developer_tools?.value) {
    return res.status(403).json({
      error:
        'Entwickler-Diagnosetools sind deaktiviert. Bitte in den Instanzeinstellungen aktivieren.',
    });
  }

  const { sqlite } = await import('../utils/db.js');
  const dbStats = { tableCounts: {}, journalMode: 'WAL' };
  try {
    const tables = [
      'users',
      'families',
      'profiles',
      'media_files',
      'invites',
      'audit_logs',
      'migrations',
    ];
    for (const tbl of tables) {
      try {
        const countRow = sqlite.prepare(`SELECT count(*) as count FROM ${tbl}`).get();
        dbStats.tableCounts[tbl] = countRow?.count ?? 0;
      } catch {
        dbStats.tableCounts[tbl] = 0;
      }
    }
  } catch (err) {
    dbStats.error = err.message;
  }

  return res.json({
    diagnosticsEnabled: true,
    timestamp: new Date().toISOString(),
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsageMb: {
        rss: Math.round(process.memoryUsage().rss / (1024 * 1024)),
        heapTotal: Math.round(process.memoryUsage().heapTotal / (1024 * 1024)),
        heapUsed: Math.round(process.memoryUsage().heapUsed / (1024 * 1024)),
      },
    },
    database: dbStats,
  });
});

// POST /api/settings/retention/cleanup – Trigger data retention cleanup (BC-318)
router.post('/retention/cleanup', requireAuth, requireInstanceAdmin, async (req, res) => {
  try {
    const { runRetentionCleanup } = await import('../services/retentionService.js');
    const result = runRetentionCleanup(req.body);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Fehler bei der Bereinigung: ' + err.message });
  }
});

export default router;
