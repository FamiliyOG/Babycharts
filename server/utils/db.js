/**
 * server/utils/db.js
 * SQLite-based database layer with better-sqlite3:
 * - 100% ACID-compliant & WAL mode (Write-Ahead Logging)
 * - Automatic seamless migration from legacy db.json
 * - Users, 2FA/TOTP, Families, Invites, Profiles, Measurements, Health logs, Milestones & Teeth
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'babycharts.sqlite');
const LEGACY_JSON_PATH = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists
try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (err) {
  console.warn('[DB] mkdir DATA_DIR warning:', err.message);
}

// Initialize SQLite database with busyTimeout to prevent concurrent file locking during tests / multi-threading
export const sqlite = new Database(DB_PATH, { timeout: 10000 });

// Configure SQLite for high performance and integrity
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('busy_timeout = 10000');
sqlite.pragma('foreign_keys = ON');
sqlite.pragma('synchronous = NORMAL');

import { runMigrations } from './migrations.js';

/**
 * Checks SQLite integrity and foreign keys (Issue BC-093)
 */
export function checkDatabaseIntegrity() {
  try {
    const integrity = sqlite.pragma('integrity_check', { simple: true });
    const foreignKeys = sqlite.pragma('foreign_key_check');
    const isOk = integrity === 'ok' && foreignKeys.length === 0;
    return {
      ok: isOk,
      integrity,
      foreignKeyViolations: foreignKeys.length,
    };
  } catch (err) {
    return {
      ok: false,
      error: err.message,
    };
  }
}

/**
 * Initialize database schema and run pending migrations
 */
function initSchema() {
  try {
    runMigrations(sqlite, DATA_DIR);
  } catch (err) {
    console.error('[DB] Migration execution error:', err.message);
  }
  const integrity = checkDatabaseIntegrity();
  if (!integrity.ok) {
    console.warn('[DB] Integrity check warning:', integrity);
  }
}

/**
 * Records a security audit event in SQLite audit_logs table (Issue BC-034)
 */
export function logSecurityEvent({
  event,
  userId = null,
  email = null,
  ip = null,
  userAgent = null,
  status = 'success',
  details = null,
}) {
  try {
    const id = `audit-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const timestamp = new Date().toISOString();
    sqlite
      .prepare(
        `
      INSERT INTO audit_logs (id, timestamp, event, userId, email, ip, userAgent, status, details)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        id,
        timestamp,
        event,
        userId,
        email,
        ip,
        typeof userAgent === 'string' ? userAgent.substring(0, 255) : null,
        status,
        typeof details === 'object' ? JSON.stringify(details) : details
      );
  } catch (err) {
    console.error('[Audit Log] Failed to record security event:', err.message);
  }
}

function insertUsers(users = []) {
  const insertUser = sqlite.prepare(`
    INSERT OR REPLACE INTO users (
      id, email, password, name, avatar, isDev, role, language,
      twoFactorSecret, tempTwoFactorSecret, tempTwoFactorExpires,
      recoveryCodes, tokenVersion, passwordResetTokenHash, passwordResetExpires,
      sessions, createdAt, updatedAt
    )
    VALUES (
      @id, @email, @password, @name, @avatar, @isDev, @role, @language,
      @twoFactorSecret, @tempTwoFactorSecret, @tempTwoFactorExpires,
      @recoveryCodes, @tokenVersion, @passwordResetTokenHash, @passwordResetExpires,
      @sessions, @createdAt, @updatedAt
    )
  `);
  for (const u of users) {
    insertUser.run({
      id: u.id,
      email: u.email,
      password: u.password,
      name: u.name,
      avatar: u.avatar || null,
      isDev: u.isDev ? 1 : 0,
      role: u.role || 'user',
      language: u.language || 'de',
      twoFactorSecret: u.twoFactorSecret || null,
      tempTwoFactorSecret: u.tempTwoFactorSecret || null,
      tempTwoFactorExpires: u.tempTwoFactorExpires || null,
      recoveryCodes: u.recoveryCodes ? JSON.stringify(u.recoveryCodes) : null,
      tokenVersion: u.tokenVersion !== undefined ? u.tokenVersion : 0,
      passwordResetTokenHash: u.passwordResetTokenHash || null,
      passwordResetExpires: u.passwordResetExpires || null,
      sessions: u.sessions ? JSON.stringify(u.sessions) : null,
      createdAt: u.createdAt || new Date().toISOString(),
      updatedAt: u.updatedAt || new Date().toISOString(),
    });
  }
}

function insertFamilies(families = []) {
  const insertFamily = sqlite.prepare(`
    INSERT INTO families (id, name, avatar, ownerId, createdAt, updatedAt)
    VALUES (@id, @name, @avatar, @ownerId, @createdAt, @updatedAt)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      avatar = excluded.avatar,
      ownerId = excluded.ownerId,
      updatedAt = excluded.updatedAt
  `);
  const insertMember = sqlite.prepare(`
    INSERT INTO family_members (familyId, userId, role, joinedAt)
    VALUES (@familyId, @userId, @role, @joinedAt)
    ON CONFLICT(familyId, userId) DO UPDATE SET
      role = excluded.role,
      joinedAt = excluded.joinedAt
  `);

  for (const f of families) {
    insertFamily.run({
      id: f.id,
      name: f.name,
      avatar: f.avatar || null,
      ownerId: f.ownerId || null,
      createdAt: f.createdAt || new Date().toISOString(),
      updatedAt: f.updatedAt || null,
    });

    for (const m of f.members || []) {
      insertMember.run({
        familyId: f.id,
        userId: m.userId,
        role: m.role || 'editor',
        joinedAt: m.joinedAt || new Date().toISOString(),
      });
    }
  }
}

function insertInvites(invites = [], usedInvites = []) {
  const insertInvite = sqlite.prepare(`
    INSERT OR REPLACE INTO invites (code, familyId, role, createdBy, createdAt, expiresAt, maxUses, usesCount)
    VALUES (@code, @familyId, @role, @createdBy, @createdAt, @expiresAt, @maxUses, @usesCount)
  `);
  for (const inv of invites) {
    insertInvite.run({
      code: inv.code,
      familyId: inv.familyId,
      role: inv.role || 'editor',
      createdBy: inv.createdBy || null,
      createdAt: inv.createdAt || new Date().toISOString(),
      expiresAt: inv.expiresAt || null,
      maxUses: inv.maxUses !== undefined ? inv.maxUses : 1,
      usesCount: inv.usesCount !== undefined ? inv.usesCount : 0,
    });
  }

  const insertUsedInvite = sqlite.prepare(`
    INSERT OR REPLACE INTO used_invites (code, familyId, usedBy, usedAt)
    VALUES (@code, @familyId, @usedBy, @usedAt)
  `);
  for (const uinv of usedInvites) {
    insertUsedInvite.run({
      code: typeof uinv === 'string' ? uinv : uinv.code,
      familyId: uinv.familyId || null,
      usedBy: uinv.usedBy || null,
      usedAt: uinv.usedAt || new Date().toISOString(),
    });
  }
}

function insertProfileMeasurements(profileId, measurements = []) {
  const insertMeasurement = sqlite.prepare(`
    INSERT OR REPLACE INTO measurements (id, profileId, date, weight, length, headCircumference, checkup, notes, createdAt)
    VALUES (@id, @profileId, @date, @weight, @length, @headCircumference, @checkup, @notes, @createdAt)
  `);

  for (const m of measurements) {
    insertMeasurement.run({
      id: m.id || `${profileId}-m-${m.date}`,
      profileId,
      date: m.date,
      weight: m.weight !== undefined && m.weight !== null ? Number(m.weight) : null,
      length: m.length !== undefined && m.length !== null ? Number(m.length) : null,
      headCircumference:
        m.headCircumference !== undefined && m.headCircumference !== null
          ? Number(m.headCircumference)
          : null,
      checkup: m.checkup || null,
      notes: m.notes || null,
      createdAt: m.createdAt || new Date().toISOString(),
    });
  }
}

function insertProfileHealthLogs(profileId, healthLogs = []) {
  const insertHealthLog = sqlite.prepare(`
    INSERT OR REPLACE INTO health_logs (id, profileId, dateTime, temperature, medication, symptoms, notes, createdAt)
    VALUES (@id, @profileId, @dateTime, @temperature, @medication, @symptoms, @notes, @createdAt)
  `);

  for (const h of healthLogs) {
    insertHealthLog.run({
      id: h.id || `${profileId}-h-${h.dateTime}`,
      profileId,
      dateTime: h.dateTime,
      temperature:
        h.temperature !== undefined && h.temperature !== null ? Number(h.temperature) : null,
      medication: h.medication || null,
      symptoms: Array.isArray(h.symptoms) ? JSON.stringify(h.symptoms) : '[]',
      notes: h.notes || null,
      createdAt: h.createdAt || new Date().toISOString(),
    });
  }
}

function insertProfiles(profiles = []) {
  const insertProfile = sqlite.prepare(`
    INSERT OR REPLACE INTO profiles (id, familyId, name, birthdate, gender, avatar, notes, schedule, vaccinations, teeth, milestones, customMilestones, version, deletedAt, createdAt, updatedAt)
    VALUES (@id, @familyId, @name, @birthdate, @gender, @avatar, @notes, @schedule, @vaccinations, @teeth, @milestones, @customMilestones, @version, @deletedAt, @createdAt, @updatedAt)
  `);

  for (const p of profiles) {
    insertProfile.run({
      id: p.id,
      familyId: p.familyId || null,
      name: p.name,
      birthdate: p.birthdate,
      gender: p.gender,
      avatar: p.avatar || null,
      notes: p.notes || null,
      schedule: p.schedule ? JSON.stringify(p.schedule) : null,
      vaccinations: p.vaccinations ? JSON.stringify(p.vaccinations) : null,
      teeth: p.teeth ? JSON.stringify(p.teeth) : null,
      milestones: p.milestones ? JSON.stringify(p.milestones) : null,
      customMilestones: p.customMilestones ? JSON.stringify(p.customMilestones) : null,
      version: p.version || 1,
      deletedAt: p.deletedAt || null,
      createdAt: p.createdAt || new Date().toISOString(),
      updatedAt: p.updatedAt || null,
    });

    insertProfileMeasurements(p.id, p.measurements);
    insertProfileHealthLogs(p.id, p.healthLog);
  }
}

function insertSettings(settings = {}) {
  const insertSetting = sqlite.prepare(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'
  );
  for (const [k, v] of Object.entries(settings)) {
    insertSetting.run(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
  }
}

/**
 * Migrate legacy db.json if present into SQLite tables
 */
function migrateFromJsonIfNeeded() {
  if (!fs.existsSync(LEGACY_JSON_PATH)) return;

  try {
    const raw = fs.readFileSync(LEGACY_JSON_PATH, 'utf-8');
    const parsed = JSON.parse(raw);

    const userCount = sqlite.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const profileCount = sqlite.prepare('SELECT COUNT(*) as count FROM profiles').get().count;

    // Only migrate if SQLite DB is currently empty
    if (userCount === 0 && profileCount === 0) {
      console.log('[DB] Migrating legacy db.json into SQLite...');

      const insertTransaction = sqlite.transaction(() => {
        if (Array.isArray(parsed.users)) insertUsers(parsed.users);
        if (Array.isArray(parsed.families)) insertFamilies(parsed.families);
        if (Array.isArray(parsed.invites)) insertInvites(parsed.invites, parsed.usedInvites || []);
        if (Array.isArray(parsed.profiles)) insertProfiles(parsed.profiles);
        if (parsed.settings && typeof parsed.settings === 'object') {
          insertSettings(parsed.settings);
        }
      });

      insertTransaction();
      console.log('[DB] Migration completed successfully.');

      // Rename db.json to backup
      try {
        fs.renameSync(LEGACY_JSON_PATH, `${LEGACY_JSON_PATH}.migrated`);
      } catch {
        // ignore rename errors
      }
    }
  } catch (err) {
    console.error('[DB] Migration from JSON failed:', err.message);
  }
}

// Run schema and migration on startup
initSchema();
migrateFromJsonIfNeeded();

/**
 * Returns structured DB representation for compatibility and easy querying
 */
export function readDb() {
  const users = sqlite
    .prepare('SELECT * FROM users')
    .all()
    .map((u) => {
      let parsedRecoveryCodes = [];
      if (u.recoveryCodes) {
        try {
          parsedRecoveryCodes = JSON.parse(u.recoveryCodes);
        } catch {
          parsedRecoveryCodes = [];
        }
      }
      let parsedSessions = [];
      if (u.sessions) {
        try {
          parsedSessions = JSON.parse(u.sessions);
        } catch {
          parsedSessions = [];
        }
      }
      return {
        ...u,
        isDev: Boolean(u.isDev),
        recoveryCodes: parsedRecoveryCodes,
        sessions: parsedSessions,
      };
    });

  const families = sqlite
    .prepare('SELECT * FROM families')
    .all()
    .map((f) => {
      const members = sqlite
        .prepare('SELECT userId, role, joinedAt FROM family_members WHERE familyId = ?')
        .all(f.id);
      return { ...f, members };
    });

  const invites = sqlite.prepare('SELECT * FROM invites').all();
  const usedInvites = sqlite.prepare('SELECT * FROM used_invites').all();

  const profilesRows = sqlite.prepare('SELECT * FROM profiles WHERE deletedAt IS NULL').all();
  const profiles = profilesRows.map((p) => {
    const measurements = sqlite
      .prepare('SELECT * FROM measurements WHERE profileId = ? ORDER BY date ASC')
      .all(p.id);

    const healthLogs = sqlite
      .prepare('SELECT * FROM health_logs WHERE profileId = ? ORDER BY dateTime ASC')
      .all(p.id)
      .map((h) => ({
        ...h,
        symptoms: h.symptoms ? JSON.parse(h.symptoms) : [],
      }));

    return {
      ...p,
      version: p.version || 1,
      deletedAt: p.deletedAt || null,
      schedule: p.schedule
        ? JSON.parse(p.schedule)
        : { enabled: false, frequency: 'daily', intervalDays: 7, lastExportAt: null },
      vaccinations: p.vaccinations ? JSON.parse(p.vaccinations) : {},
      teeth: p.teeth ? JSON.parse(p.teeth) : {},
      milestones: p.milestones ? JSON.parse(p.milestones) : {},
      customMilestones: p.customMilestones ? JSON.parse(p.customMilestones) : [],
      measurements,
      healthLog: healthLogs,
    };
  });

  const settingsRows = sqlite.prepare('SELECT * FROM settings').all();
  const settings = {};
  for (const s of settingsRows) {
    try {
      settings[s.key] = JSON.parse(s.value);
    } catch {
      settings[s.key] = s.value;
    }
  }

  const exportLogs = sqlite.prepare('SELECT * FROM export_log').all();
  const exportLog = {};
  for (const el of exportLogs) {
    exportLog[el.profileId] = el.lastExportAt;
  }

  return {
    users,
    families,
    invites,
    usedInvites,
    profiles,
    settings,
    exportLog,
  };
}

const ALLOWED_PRUNE_TABLES = new Set([
  'users',
  'families',
  'family_members',
  'invitations',
  'profiles',
  'settings',
]);

function pruneStaleRows(tableName, validItems = []) {
  if (!ALLOWED_PRUNE_TABLES.has(tableName)) {
    throw new Error(`Invalid table name for prune: ${tableName}`);
  }
  const existingIds = new Set(validItems.map((item) => item.id));
  const currentDbRows = sqlite.prepare(`SELECT id FROM ${tableName}`).all();
  const deleteStmt = sqlite.prepare(`DELETE FROM ${tableName} WHERE id = ?`);
  for (const row of currentDbRows) {
    if (!existingIds.has(row.id)) {
      deleteStmt.run(row.id);
    }
  }
}

function syncUsers(users) {
  if (!Array.isArray(users)) return;
  pruneStaleRows('users', users);
  insertUsers(users);
}

function syncFamilies(families) {
  if (!Array.isArray(families)) return;
  pruneStaleRows('families', families);
  const deleteMembers = sqlite.prepare('DELETE FROM family_members WHERE familyId = ?');
  for (const f of families) {
    deleteMembers.run(f.id);
  }
  insertFamilies(families);
}

function syncProfiles(profiles) {
  if (!Array.isArray(profiles)) return;
  pruneStaleRows('profiles', profiles);
  const deleteMeasurements = sqlite.prepare('DELETE FROM measurements WHERE profileId = ?');
  const deleteHealthLogs = sqlite.prepare('DELETE FROM health_logs WHERE profileId = ?');
  for (const p of profiles) {
    deleteMeasurements.run(p.id);
    deleteHealthLogs.run(p.id);
  }
  insertProfiles(profiles);
}

/**
 * Bulk writes entire state back into SQLite in a single transaction
 * (Ensures backwards compatibility with existing route patterns)
 */
export function writeDb(data) {
  const saveTransaction = sqlite.transaction(() => {
    syncUsers(data.users);
    syncFamilies(data.families);
    if (Array.isArray(data.invites) || Array.isArray(data.usedInvites)) {
      if (Array.isArray(data.invites)) sqlite.prepare('DELETE FROM invites').run();
      if (Array.isArray(data.usedInvites)) sqlite.prepare('DELETE FROM used_invites').run();
      insertInvites(data.invites || [], data.usedInvites || []);
    }
    syncProfiles(data.profiles);
    if (data.settings) insertSettings(data.settings);
  });

  saveTransaction();
}

let isBackupInProgress = false;

/**
 * Prunes historical backups based on configurable retention days and max count (BC-098, BC-099)
 */
export async function pruneBackups(backupDir) {
  try {
    const settings = getSettings();
    const maxCount = Number(settings.backupMaxCount) > 0 ? Number(settings.backupMaxCount) : 15;
    const retentionDays =
      Number(settings.backupRetentionDays) > 0 ? Number(settings.backupRetentionDays) : 14;

    const dirEntries = await fs.promises.readdir(backupDir);
    const backupFiles = dirEntries.filter(
      (f) =>
        (f.startsWith('babycharts-backup-') || f.startsWith('db_backup_')) && f.endsWith('.sqlite')
    );

    const now = Date.now();
    const maxAgeMs = retentionDays * 24 * 60 * 60 * 1000;

    const fileStats = [];
    for (const f of backupFiles) {
      try {
        const fullPath = path.join(backupDir, f);
        const stat = await fs.promises.stat(fullPath);
        fileStats.push({ name: f, path: fullPath, mtime: stat.mtimeMs });
      } catch {
        // ignore
      }
    }

    // Sort newest first
    fileStats.sort((a, b) => b.mtime - a.mtime);

    // Delete files exceeding count limit or older than retentionDays (always keep at least 1 newest)
    for (let i = 0; i < fileStats.length; i++) {
      if (i === 0) continue; // Keep at least one backup
      const file = fileStats[i];
      const isOverCount = i >= maxCount;
      const isExpired = now - file.mtime > maxAgeMs;

      if (isOverCount || isExpired) {
        try {
          await fs.promises.unlink(file.path);
        } catch {
          // ignore individual deletion errors
        }
      }
    }
  } catch (err) {
    console.warn('[Backup] Pruning warning:', err.message);
  }
}

/**
 * Create a timestamped backup of SQLite database in server/data/backups/
 * Non-blocking, asynchronous execution with throttling/concurrency guard. (BC-089, BC-098)
 */
export async function createDbBackup() {
  if (isBackupInProgress) {
    console.warn('[Backup] Backup is already in progress, skipping duplicate invocation.');
    return null;
  }

  isBackupInProgress = true;
  try {
    const backupDir = path.join(DATA_DIR, 'backups');
    await fs.promises.mkdir(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `babycharts-backup-${timestamp}.sqlite`;
    const backupPath = path.join(backupDir, backupFileName);

    await sqlite.backup(backupPath);
    await pruneBackups(backupDir);

    return backupPath;
  } catch (err) {
    console.error('[Backup] SQLite backup failed:', err.message);
    return null;
  } finally {
    isBackupInProgress = false;
  }
}

/**
 * Validates SQLite backup file integrity and structure before restore (BC-101)
 * @param {string} filePath - Absolute path to SQLite file
 * @returns {Promise<{ ok: boolean, error?: string, counts?: object }>}
 */
export async function validateBackupFile(filePath) {
  let fd;
  try {
    try {
      fd = await fs.promises.open(filePath, 'r');
    } catch (err) {
      if (err.code === 'ENOENT') {
        return { ok: false, error: 'Die Backup-Datei existiert nicht.' };
      }
      throw err;
    }

    // Check file header magic bytes: SQLite format 3\000
    const headerBuf = Buffer.alloc(16);
    await fd.read(headerBuf, 0, 16, 0);
    await fd.close();
    fd = null;

    const magic = headerBuf.toString('utf8', 0, 15);
    if (magic !== 'SQLite format 3') {
      return { ok: false, error: 'Ungültiges Dateiformat. Keine gültige SQLite3-Datenbank.' };
    }

    // Open read-only test connection to inspect integrity & schema
    const testDb = new Database(filePath, { readonly: true, fileMustExist: true });
    try {
      const integrity = testDb.pragma('quick_check', { simple: true });
      if (integrity !== 'ok') {
        return { ok: false, error: `Integritätsprüfung fehlgeschlagen: ${integrity}` };
      }

      const tableRows = testDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      const tables = new Set(tableRows.map((t) => t.name));

      const requiredTables = ['users', 'families', 'profiles'];
      const missingTables = requiredTables.filter((t) => !tables.has(t));
      if (missingTables.length > 0) {
        return {
          ok: false,
          error: `Unvollständiges Schema. Fehlende Tabellen: ${missingTables.join(', ')}`,
        };
      }

      const userCount = testDb.prepare('SELECT COUNT(*) as c FROM users').get().c;
      const profileCount = testDb.prepare('SELECT COUNT(*) as c FROM profiles').get().c;

      return {
        ok: true,
        counts: { users: userCount, profiles: profileCount },
      };
    } finally {
      testDb.close();
    }
  } catch (err) {
    return { ok: false, error: `Validierungsfehler: ${err.message}` };
  } finally {
    if (fd) {
      try {
        await fd.close();
      } catch {
        // ignore close error
      }
    }
  }
}

/**
 * Restores database from a validated backup file, automatically creating a pre-restore backup (BC-101, BC-102)
 * @param {string} sourceBackupPath
 * @returns {Promise<{ ok: boolean, error?: string, preRestoreBackupPath?: string }>}
 */
export async function restoreFromBackup(sourceBackupPath) {
  const validation = await validateBackupFile(sourceBackupPath);
  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  try {
    // 1. Create automatic pre-restore backup snapshot (BC-102)
    const backupDir = path.join(DATA_DIR, 'backups');
    await fs.promises.mkdir(backupDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const preRestoreBackupPath = path.join(backupDir, `db_backup_pre_restore_${timestamp}.sqlite`);
    await sqlite.backup(preRestoreBackupPath);

    // 2. Perform restore by reading source backup into active SQLite DB
    const sourceDb = new Database(sourceBackupPath, { readonly: true });
    try {
      const sourceUsers = sourceDb.prepare('SELECT * FROM users').all();
      const sourceFamilies = sourceDb.prepare('SELECT * FROM families').all();
      const sourceInvites = sourceDb.prepare('SELECT * FROM invites').all();
      const sourceProfiles = sourceDb.prepare('SELECT * FROM profiles').all();

      const sourceMembers = sourceDb.prepare('SELECT * FROM family_members').all();
      const sourceMeasurements = sourceDb.prepare('SELECT * FROM measurements').all();
      const sourceHealthLogs = sourceDb.prepare('SELECT * FROM health_logs').all();

      // Execute atomic restore transaction
      sqlite.transaction(() => {
        // Clear active tables
        sqlite.exec(`
          DELETE FROM audit_logs;
          DELETE FROM media_files;
          DELETE FROM export_log;
          DELETE FROM health_logs;
          DELETE FROM measurements;
          DELETE FROM profiles;
          DELETE FROM used_invites;
          DELETE FROM invites;
          DELETE FROM family_members;
          DELETE FROM families;
          DELETE FROM users;
        `);

        // Insert restored users
        const insUser = sqlite.prepare(`
          INSERT INTO users (id, email, password, name, avatar, isDev, role, language, twoFactorSecret, tempTwoFactorSecret, tempTwoFactorExpires, recoveryCodes, tokenVersion, passwordResetTokenHash, passwordResetExpires, createdAt, updatedAt)
          VALUES (@id, @email, @password, @name, @avatar, @isDev, @role, @language, @twoFactorSecret, @tempTwoFactorSecret, @tempTwoFactorExpires, @recoveryCodes, @tokenVersion, @passwordResetTokenHash, @passwordResetExpires, @createdAt, @updatedAt)
        `);
        for (const u of sourceUsers) insUser.run(u);

        // Insert restored families & members
        const insFamily = sqlite.prepare(`
          INSERT INTO families (id, name, avatar, ownerId, createdAt, updatedAt)
          VALUES (@id, @name, @avatar, @ownerId, @createdAt, @updatedAt)
        `);
        for (const f of sourceFamilies) insFamily.run(f);

        const insMember = sqlite.prepare(`
          INSERT INTO family_members (familyId, userId, role, joinedAt)
          VALUES (@familyId, @userId, @role, @joinedAt)
        `);
        for (const m of sourceMembers) insMember.run(m);

        // Insert restored invites
        const insInvite = sqlite.prepare(`
          INSERT INTO invites (code, familyId, role, createdBy, createdAt, expiresAt, maxUses, usesCount)
          VALUES (@code, @familyId, @role, @createdBy, @createdAt, @expiresAt, @maxUses, @usesCount)
        `);
        for (const inv of sourceInvites) insInvite.run(inv);

        // Insert restored profiles, measurements, health logs
        const insProfile = sqlite.prepare(`
          INSERT INTO profiles (id, familyId, name, birthdate, gender, avatar, notes, schedule, vaccinations, teeth, milestones, customMilestones, version, deletedAt, createdAt, updatedAt)
          VALUES (@id, @familyId, @name, @birthdate, @gender, @avatar, @notes, @schedule, @vaccinations, @teeth, @milestones, @customMilestones, @version, @deletedAt, @createdAt, @updatedAt)
        `);
        for (const p of sourceProfiles) insProfile.run(p);

        const insMeasurement = sqlite.prepare(`
          INSERT INTO measurements (id, profileId, date, weight, length, headCircumference, checkup, notes, deletedAt, createdAt)
          VALUES (@id, @profileId, @date, @weight, @length, @headCircumference, @checkup, @notes, @deletedAt, @createdAt)
        `);
        for (const m of sourceMeasurements) insMeasurement.run(m);

        const insHealthLog = sqlite.prepare(`
          INSERT INTO health_logs (id, profileId, dateTime, temperature, medication, symptoms, notes, deletedAt, createdAt)
          VALUES (@id, @profileId, @dateTime, @temperature, @medication, @symptoms, @notes, @deletedAt, @createdAt)
        `);
        for (const h of sourceHealthLogs) insHealthLog.run(h);
      })();
    } finally {
      sourceDb.close();
    }

    return { ok: true, preRestoreBackupPath };
  } catch (err) {
    console.error('[Restore] Database restore error:', err.message);
    return { ok: false, error: err.message };
  }
}

export function getProfiles(options = {}) {
  const { includeDeleted = false, familyId = null } = options;
  let sql = 'SELECT * FROM profiles';
  const conditions = [];
  const params = [];

  if (!includeDeleted) {
    conditions.push('deletedAt IS NULL');
  }
  if (familyId) {
    conditions.push('familyId = ?');
    params.push(familyId);
  }

  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }

  const profilesRows = sqlite.prepare(sql).all(...params);
  return profilesRows.map((p) => {
    const measurements = sqlite
      .prepare(
        'SELECT * FROM measurements WHERE profileId = ? AND deletedAt IS NULL ORDER BY date ASC'
      )
      .all(p.id);

    const healthLogs = sqlite
      .prepare(
        'SELECT * FROM health_logs WHERE profileId = ? AND deletedAt IS NULL ORDER BY dateTime ASC'
      )
      .all(p.id)
      .map((h) => ({
        ...h,
        symptoms: h.symptoms ? JSON.parse(h.symptoms) : [],
      }));

    return {
      ...p,
      schedule: p.schedule
        ? JSON.parse(p.schedule)
        : { enabled: false, frequency: 'daily', intervalDays: 7, lastExportAt: null },
      vaccinations: p.vaccinations ? JSON.parse(p.vaccinations) : {},
      teeth: p.teeth ? JSON.parse(p.teeth) : {},
      milestones: p.milestones ? JSON.parse(p.milestones) : {},
      customMilestones: p.customMilestones ? JSON.parse(p.customMilestones) : [],
      measurements,
      healthLog: healthLogs,
    };
  });
}

export function getProfileById(id, includeDeleted = false) {
  let sql = 'SELECT * FROM profiles WHERE id = ?';
  if (!includeDeleted) {
    sql += ' AND deletedAt IS NULL';
  }
  const p = sqlite.prepare(sql).get(id);
  if (!p) return null;

  const measurements = sqlite
    .prepare(
      'SELECT * FROM measurements WHERE profileId = ? AND deletedAt IS NULL ORDER BY date ASC'
    )
    .all(p.id);

  const healthLogs = sqlite
    .prepare(
      'SELECT * FROM health_logs WHERE profileId = ? AND deletedAt IS NULL ORDER BY dateTime ASC'
    )
    .all(p.id)
    .map((h) => ({
      ...h,
      symptoms: h.symptoms ? JSON.parse(h.symptoms) : [],
    }));

  return {
    ...p,
    schedule: p.schedule
      ? JSON.parse(p.schedule)
      : { enabled: false, frequency: 'daily', intervalDays: 7, lastExportAt: null },
    vaccinations: p.vaccinations ? JSON.parse(p.vaccinations) : {},
    teeth: p.teeth ? JSON.parse(p.teeth) : {},
    milestones: p.milestones ? JSON.parse(p.milestones) : {},
    customMilestones: p.customMilestones ? JSON.parse(p.customMilestones) : [],
    measurements,
    healthLog: healthLogs,
  };
}

export function softDeleteProfile(id) {
  const timestamp = new Date().toISOString();
  return sqlite.transaction(() => {
    sqlite.prepare('UPDATE profiles SET deletedAt = ? WHERE id = ?').run(timestamp, id);
    sqlite.prepare('UPDATE measurements SET deletedAt = ? WHERE profileId = ?').run(timestamp, id);
    sqlite.prepare('UPDATE health_logs SET deletedAt = ? WHERE profileId = ?').run(timestamp, id);
    return true;
  })();
}

export function restoreProfile(id) {
  return sqlite.transaction(() => {
    sqlite.prepare('UPDATE profiles SET deletedAt = NULL WHERE id = ?').run(id);
    sqlite.prepare('UPDATE measurements SET deletedAt = NULL WHERE profileId = ?').run(id);
    sqlite.prepare('UPDATE health_logs SET deletedAt = NULL WHERE profileId = ?').run(id);
    return true;
  })();
}

export function getSettings() {
  return readDb().settings;
}

/**
 * Gracefully shuts down the SQLite database (BC-172):
 * - Runs a WAL checkpoint to flush all pending writes to disk
 * - Closes the SQLite connection cleanly
 */
export function closeDatabase() {
  try {
    if (sqlite.open) {
      console.log('[DB] Checkpointing WAL before shutdown...');
      sqlite.pragma('wal_checkpoint(TRUNCATE)');
      sqlite.close();
      console.log('[DB] SQLite connection closed cleanly.');
    }
  } catch (err) {
    console.error('[DB] Error during SQLite shutdown:', err.message);
  }
}
