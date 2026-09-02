/**
 * server/utils/migrations.js
 * Database Migration Framework (Issues BC-087, BC-088, BC-089):
 * - Schema version tracking via `_schema_migrations` table and PRAGMA user_version
 * - Sequential transactional migration execution
 * - Automated pre-migration SQLite backups before schema upgrades
 */

import fs from 'node:fs';
import path from 'node:path';

/**
 * Migration registry defining ordered, idempotent database upgrades.
 * Each migration must define a unique positive integer version, a descriptive name,
 * and an `up(sqlite)` function that executes inside a dedicated transaction.
 */
export const MIGRATIONS = [
  {
    version: 1,
    name: 'initial_schema_and_legacy_columns',
    up: (sqlite) => {
      // Core baseline tables
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
          tempTwoFactorExpires INTEGER,
          recoveryCodes TEXT,
          tokenVersion INTEGER DEFAULT 0,
          passwordResetTokenHash TEXT,
          passwordResetExpires INTEGER,
          language TEXT DEFAULT 'de',
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
          vaccinations TEXT,
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

      // Incremental column safety checks for pre-existing databases
      const userCols = sqlite.prepare('PRAGMA table_info(users)').all();
      if (!userCols.some((c) => c.name === 'tempTwoFactorExpires')) {
        sqlite.exec('ALTER TABLE users ADD COLUMN tempTwoFactorExpires INTEGER');
      }
      if (!userCols.some((c) => c.name === 'recoveryCodes')) {
        sqlite.exec('ALTER TABLE users ADD COLUMN recoveryCodes TEXT');
      }
      if (!userCols.some((c) => c.name === 'tokenVersion')) {
        sqlite.exec('ALTER TABLE users ADD COLUMN tokenVersion INTEGER DEFAULT 0');
      }
      if (!userCols.some((c) => c.name === 'passwordResetTokenHash')) {
        sqlite.exec('ALTER TABLE users ADD COLUMN passwordResetTokenHash TEXT');
      }
      if (!userCols.some((c) => c.name === 'passwordResetExpires')) {
        sqlite.exec('ALTER TABLE users ADD COLUMN passwordResetExpires INTEGER');
      }
      if (!userCols.some((c) => c.name === 'language')) {
        sqlite.exec("ALTER TABLE users ADD COLUMN language TEXT DEFAULT 'de'");
      }

      const inviteCols = sqlite.prepare('PRAGMA table_info(invites)').all();
      if (!inviteCols.some((c) => c.name === 'maxUses')) {
        sqlite.exec('ALTER TABLE invites ADD COLUMN maxUses INTEGER DEFAULT 1');
      }

      const profileCols = sqlite.prepare('PRAGMA table_info(profiles)').all();
      if (!profileCols.some((c) => c.name === 'vaccinations')) {
        sqlite.exec('ALTER TABLE profiles ADD COLUMN vaccinations TEXT');
      }
    },
  },
  {
    version: 2,
    name: 'performance_indexes',
    up: (sqlite) => {
      sqlite.exec(`
        CREATE INDEX IF NOT EXISTS idx_family_members_user ON family_members(userId);
        CREATE INDEX IF NOT EXISTS idx_profiles_family ON profiles(familyId);
        CREATE INDEX IF NOT EXISTS idx_measurements_profile ON measurements(profileId, date);
        CREATE INDEX IF NOT EXISTS idx_health_logs_profile ON health_logs(profileId, dateTime);
        CREATE INDEX IF NOT EXISTS idx_media_files_family ON media_files(familyId);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
      `);
    },
  },
  {
    version: 3,
    name: 'soft_delete_and_concurrency',
    up: (sqlite) => {
      // Add deletedAt and version columns for soft-delete and optimistic concurrency (BC-220, BC-237)
      const profileCols = sqlite.prepare('PRAGMA table_info(profiles)').all();
      if (!profileCols.some((c) => c.name === 'deletedAt')) {
        sqlite.exec('ALTER TABLE profiles ADD COLUMN deletedAt TEXT');
      }
      if (!profileCols.some((c) => c.name === 'version')) {
        sqlite.exec('ALTER TABLE profiles ADD COLUMN version INTEGER DEFAULT 1');
      }

      const measurementCols = sqlite.prepare('PRAGMA table_info(measurements)').all();
      if (!measurementCols.some((c) => c.name === 'deletedAt')) {
        sqlite.exec('ALTER TABLE measurements ADD COLUMN deletedAt TEXT');
      }

      const healthLogCols = sqlite.prepare('PRAGMA table_info(health_logs)').all();
      if (!healthLogCols.some((c) => c.name === 'deletedAt')) {
        sqlite.exec('ALTER TABLE health_logs ADD COLUMN deletedAt TEXT');
      }

      // Automatically maintain updatedAt on profile and family updates (BC-094)
      sqlite.exec(`
        CREATE TRIGGER IF NOT EXISTS trg_profiles_updated_at
        AFTER UPDATE ON profiles
        FOR EACH ROW
        BEGIN
          UPDATE profiles SET updatedAt = datetime('now') WHERE id = OLD.id;
        END;

        CREATE TRIGGER IF NOT EXISTS trg_families_updated_at
        AFTER UPDATE ON families
        FOR EACH ROW
        BEGIN
          UPDATE families SET updatedAt = datetime('now') WHERE id = OLD.id;
        END;

        CREATE TRIGGER IF NOT EXISTS trg_users_updated_at
        AFTER UPDATE ON users
        FOR EACH ROW
        BEGIN
          UPDATE users SET updatedAt = datetime('now') WHERE id = OLD.id;
        END;
      `);
    },
  },
  {
    version: 4,
    name: 'sessions_and_family_audit_logs',
    up: (sqlite) => {
      const userCols = sqlite.prepare('PRAGMA table_info(users)').all();
      if (!userCols.some((c) => c.name === 'sessions')) {
        sqlite.exec('ALTER TABLE users ADD COLUMN sessions TEXT');
      }

      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS family_audit_logs (
          id TEXT PRIMARY KEY,
          familyId TEXT NOT NULL,
          userId TEXT,
          userName TEXT,
          action TEXT NOT NULL,
          details TEXT,
          metadata TEXT,
          timestamp TEXT NOT NULL,
          FOREIGN KEY (familyId) REFERENCES families(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_family_audit_logs_family ON family_audit_logs(familyId, timestamp);
      `);
    },
  },
];

/**
 * Creates an automatic pre-migration backup before applying new schema changes.
 * @param {import('better-sqlite3').Database} sqlite
 * @param {string} dataDir
 * @param {number} targetVersion
 * @returns {Promise<string|null>} Path to the created backup file
 */
export async function createPreMigrationBackup(sqlite, dataDir, targetVersion) {
  try {
    const backupsDir = path.join(dataDir, 'backups');
    fs.mkdirSync(backupsDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `db_backup_pre_v${targetVersion}_${timestamp}.sqlite`;
    const backupPath = path.join(backupsDir, backupFileName);

    // better-sqlite3 native backup API returns a promise
    await sqlite.backup(backupPath);
    return backupPath;
  } catch (err) {
    console.warn('[DB] Pre-migration backup warning:', err.message);
    return null;
  }
}

/**
 * Ensures migration tracking table exists and returns set of applied version numbers.
 * @param {import('better-sqlite3').Database} sqlite
 * @returns {Set<number>}
 */
export function getAppliedMigrations(sqlite) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS _schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      appliedAt TEXT NOT NULL,
      backupPath TEXT
    );
  `);

  const rows = sqlite.prepare('SELECT version FROM _schema_migrations ORDER BY version ASC').all();
  return new Set(rows.map((r) => r.version));
}

/**
 * Runs all pending migrations sequentially within discrete transactions.
 * @param {import('better-sqlite3').Database} sqlite
 * @param {string} dataDir
 */
export function runMigrations(sqlite, dataDir) {
  const applied = getAppliedMigrations(sqlite);
  const pending = MIGRATIONS.filter((m) => !applied.has(m.version)).sort(
    (a, b) => a.version - b.version
  );

  if (pending.length === 0) {
    return;
  }

  // Pre-migration backup path record (if backup directory is provided and real database file exists)
  const nextTargetVersion = pending[0].version;
  let backupPath = null;
  if (dataDir && fs.existsSync(dataDir)) {
    try {
      const backupsDir = path.join(dataDir, 'backups');
      fs.mkdirSync(backupsDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `db_backup_pre_v${nextTargetVersion}_${timestamp}.sqlite`;
      backupPath = path.join(backupsDir, backupFileName);
      sqlite.backup(backupPath);
    } catch (err) {
      console.warn('[DB] Pre-migration backup warning:', err.message);
    }
  }

  const insertMigrationRecord = sqlite.prepare(`
    INSERT INTO _schema_migrations (version, name, appliedAt, backupPath)
    VALUES (?, ?, ?, ?)
  `);

  for (const migration of pending) {
    const applyMigrationTx = sqlite.transaction(() => {
      migration.up(sqlite);
      insertMigrationRecord.run(
        migration.version,
        migration.name,
        new Date().toISOString(),
        backupPath
      );
      sqlite.pragma(`user_version = ${migration.version}`);
    });

    applyMigrationTx();
  }
}
