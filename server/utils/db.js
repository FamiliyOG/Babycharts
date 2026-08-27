/**
 * server/utils/db.js
 * SQLite-based database layer with better-sqlite3:
 * - 100% ACID-compliant & WAL mode (Write-Ahead Logging)
 * - Automatic seamless migration from legacy db.json
 * - Users, 2FA/TOTP, Families, Invites, Profiles, Measurements, Health logs, Milestones & Teeth
 */

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

// Initialize SQLite database
export const sqlite = new Database(DB_PATH);

// Configure SQLite for high performance and integrity
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');
sqlite.pragma('synchronous = NORMAL');

/**
 * Initialize database schema
 */
function initSchema() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar TEXT,
      isDev INTEGER DEFAULT 0,
      role TEXT DEFAULT 'user',
      twoFactorSecret TEXT,
      tempTwoFactorSecret TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS families (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar TEXT,
      ownerId TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS family_members (
      familyId TEXT NOT NULL,
      userId TEXT NOT NULL,
      role TEXT NOT NULL,
      joinedAt TEXT NOT NULL,
      PRIMARY KEY (familyId, userId),
      FOREIGN KEY (familyId) REFERENCES families(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS invites (
      code TEXT PRIMARY KEY,
      familyId TEXT NOT NULL,
      role TEXT NOT NULL,
      createdBy TEXT,
      createdAt TEXT NOT NULL,
      expiresAt TEXT,
      maxUses INTEGER DEFAULT 1,
      usesCount INTEGER DEFAULT 0,
      FOREIGN KEY (familyId) REFERENCES families(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS used_invites (
      code TEXT PRIMARY KEY,
      familyId TEXT,
      usedBy TEXT,
      usedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      familyId TEXT,
      name TEXT NOT NULL,
      birthdate TEXT NOT NULL,
      gender TEXT NOT NULL,
      avatar TEXT,
      notes TEXT,
      schedule TEXT,
      teeth TEXT,
      milestones TEXT,
      customMilestones TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT,
      FOREIGN KEY (familyId) REFERENCES families(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS measurements (
      id TEXT PRIMARY KEY,
      profileId TEXT NOT NULL,
      date TEXT NOT NULL,
      weight REAL,
      length REAL,
      headCircumference REAL,
      checkup TEXT,
      notes TEXT,
      createdAt TEXT,
      FOREIGN KEY (profileId) REFERENCES profiles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS health_logs (
      id TEXT PRIMARY KEY,
      profileId TEXT NOT NULL,
      dateTime TEXT NOT NULL,
      temperature REAL,
      medication TEXT,
      symptoms TEXT,
      notes TEXT,
      createdAt TEXT,
      FOREIGN KEY (profileId) REFERENCES profiles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    DELETE FROM settings WHERE key = 'pdfOutputDir';

    CREATE TABLE IF NOT EXISTS export_log (
      profileId TEXT PRIMARY KEY,
      lastExportAt TEXT NOT NULL,
      status TEXT,
      error TEXT
    );

    CREATE TABLE IF NOT EXISTS media_files (
      id TEXT PRIMARY KEY,
      familyId TEXT,
      userId TEXT,
      originalName TEXT,
      mimeType TEXT NOT NULL,
      sizeBytes INTEGER NOT NULL,
      iv TEXT NOT NULL,
      authTag TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (familyId) REFERENCES families(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      event TEXT NOT NULL,
      userId TEXT,
      email TEXT,
      ip TEXT,
      userAgent TEXT,
      status TEXT NOT NULL,
      details TEXT
    );
  `);

  // Auto-migrate users table if tempTwoFactorSecret column is missing
  try {
    const columns = sqlite.prepare('PRAGMA table_info(users)').all();
    if (!columns.some((c) => c.name === 'tempTwoFactorSecret')) {
      sqlite.exec('ALTER TABLE users ADD COLUMN tempTwoFactorSecret TEXT');
    }
    if (!columns.some((c) => c.name === 'tempTwoFactorExpires')) {
      sqlite.exec('ALTER TABLE users ADD COLUMN tempTwoFactorExpires INTEGER');
    }
    if (!columns.some((c) => c.name === 'recoveryCodes')) {
      sqlite.exec('ALTER TABLE users ADD COLUMN recoveryCodes TEXT');
    }
    if (!columns.some((c) => c.name === 'tokenVersion')) {
      sqlite.exec('ALTER TABLE users ADD COLUMN tokenVersion INTEGER DEFAULT 0');
    }
    if (!columns.some((c) => c.name === 'passwordResetTokenHash')) {
      sqlite.exec('ALTER TABLE users ADD COLUMN passwordResetTokenHash TEXT');
    }
    if (!columns.some((c) => c.name === 'passwordResetExpires')) {
      sqlite.exec('ALTER TABLE users ADD COLUMN passwordResetExpires INTEGER');
    }
    // Auto-migrate invites table if maxUses or usesCount columns are missing (BC-047)
    const inviteColumns = sqlite.prepare('PRAGMA table_info(invites)').all();
    if (!inviteColumns.some((c) => c.name === 'maxUses')) {
      sqlite.exec('ALTER TABLE invites ADD COLUMN maxUses INTEGER DEFAULT 1');
    }
    if (!inviteColumns.some((c) => c.name === 'usesCount')) {
      sqlite.exec('ALTER TABLE invites ADD COLUMN usesCount INTEGER DEFAULT 0');
    }
  } catch (err) {
    console.warn('[DB] Migration notice:', err.message);
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
    const id = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
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
      id, email, password, name, avatar, isDev, role,
      twoFactorSecret, tempTwoFactorSecret, tempTwoFactorExpires,
      recoveryCodes, tokenVersion, passwordResetTokenHash, passwordResetExpires,
      createdAt, updatedAt
    )
    VALUES (
      @id, @email, @password, @name, @avatar, @isDev, @role,
      @twoFactorSecret, @tempTwoFactorSecret, @tempTwoFactorExpires,
      @recoveryCodes, @tokenVersion, @passwordResetTokenHash, @passwordResetExpires,
      @createdAt, @updatedAt
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
      twoFactorSecret: u.twoFactorSecret || null,
      tempTwoFactorSecret: u.tempTwoFactorSecret || null,
      tempTwoFactorExpires: u.tempTwoFactorExpires || null,
      recoveryCodes: u.recoveryCodes ? JSON.stringify(u.recoveryCodes) : null,
      tokenVersion: u.tokenVersion !== undefined ? u.tokenVersion : 0,
      passwordResetTokenHash: u.passwordResetTokenHash || null,
      passwordResetExpires: u.passwordResetExpires || null,
      createdAt: u.createdAt || new Date().toISOString(),
      updatedAt: u.updatedAt || new Date().toISOString(),
    });
  }
}

function insertFamilies(families = []) {
  const insertFamily = sqlite.prepare(`
    INSERT OR REPLACE INTO families (id, name, avatar, ownerId, createdAt, updatedAt)
    VALUES (@id, @name, @avatar, @ownerId, @createdAt, @updatedAt)
  `);
  const insertMember = sqlite.prepare(`
    INSERT OR REPLACE INTO family_members (familyId, userId, role, joinedAt)
    VALUES (@familyId, @userId, @role, @joinedAt)
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
    INSERT OR REPLACE INTO profiles (id, familyId, name, birthdate, gender, avatar, notes, schedule, teeth, milestones, customMilestones, createdAt, updatedAt)
    VALUES (@id, @familyId, @name, @birthdate, @gender, @avatar, @notes, @schedule, @teeth, @milestones, @customMilestones, @createdAt, @updatedAt)
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
      teeth: p.teeth ? JSON.stringify(p.teeth) : null,
      milestones: p.milestones ? JSON.stringify(p.milestones) : null,
      customMilestones: p.customMilestones ? JSON.stringify(p.customMilestones) : null,
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
        insertUsers(parsed.users);
        insertFamilies(parsed.families);
        insertInvites(parsed.invites, parsed.usedInvites);
        insertProfiles(parsed.profiles);
        if (parsed.settings) insertSettings(parsed.settings);
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
      return {
        ...u,
        isDev: Boolean(u.isDev),
        recoveryCodes: parsedRecoveryCodes,
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

  const profilesRows = sqlite.prepare('SELECT * FROM profiles').all();
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
      schedule: p.schedule
        ? JSON.parse(p.schedule)
        : { enabled: false, frequency: 'daily', intervalDays: 7, lastExportAt: null },
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

function syncUsers(users) {
  if (!Array.isArray(users)) return;
  const existingUserIds = new Set(users.map((u) => u.id));
  const allDbUsers = sqlite.prepare('SELECT id FROM users').all();
  for (const row of allDbUsers) {
    if (!existingUserIds.has(row.id)) {
      sqlite.prepare('DELETE FROM users WHERE id = ?').run(row.id);
    }
  }
  insertUsers(users);
}

function syncFamilies(families) {
  if (!Array.isArray(families)) return;
  const existingFamilyIds = new Set(families.map((f) => f.id));
  const allDbFamilies = sqlite.prepare('SELECT id FROM families').all();
  for (const row of allDbFamilies) {
    if (!existingFamilyIds.has(row.id)) {
      sqlite.prepare('DELETE FROM families WHERE id = ?').run(row.id);
    }
  }
  const deleteMembers = sqlite.prepare('DELETE FROM family_members WHERE familyId = ?');
  for (const f of families) {
    deleteMembers.run(f.id);
  }
  insertFamilies(families);
}

function syncProfiles(profiles) {
  if (!Array.isArray(profiles)) return;
  const existingProfileIds = new Set(profiles.map((p) => p.id));
  const allDbProfiles = sqlite.prepare('SELECT id FROM profiles').all();
  for (const row of allDbProfiles) {
    if (!existingProfileIds.has(row.id)) {
      sqlite.prepare('DELETE FROM profiles WHERE id = ?').run(row.id);
    }
  }
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
 * Create a timestamped backup of SQLite database in server/data/backups/
 * Non-blocking, asynchronous execution with throttling/concurrency guard.
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

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const backupFileName = `babycharts-backup-${dateStr}.sqlite`;
    const backupPath = path.join(backupDir, backupFileName);

    // better-sqlite3 backup returns a Promise if no callback is supplied or when called asynchronously
    await sqlite.backup(backupPath);

    // Prune backups older than 7 days
    const dirEntries = await fs.promises.readdir(backupDir);
    const files = dirEntries.filter(
      (f) => f.startsWith('babycharts-backup-') && f.endsWith('.sqlite')
    );
    if (files.length > 7) {
      files.sort();
      const toDelete = files.slice(0, -7);
      for (const file of toDelete) {
        try {
          await fs.promises.unlink(path.join(backupDir, file));
        } catch {
          // ignore individual deletion errors
        }
      }
    }

    return backupPath;
  } catch (err) {
    console.error('[Backup] SQLite backup failed:', err.message);
    return null;
  } finally {
    isBackupInProgress = false;
  }
}

export function getProfiles() {
  return readDb().profiles;
}

export function getSettings() {
  return readDb().settings;
}
