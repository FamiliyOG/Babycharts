import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runMigrations } from '../../server/utils/migrations.js';
import { validateBackupFile } from '../../server/utils/db.js';

describe('Automated End-to-End Backup & Restore Integrity Cycle (BC-267)', () => {
  let tempDir;
  let sourceDbPath;
  let targetDbPath;
  let backupPath;
  let sourceDb;
  let targetDb;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'babycharts-full-cycle-test-'));
    sourceDbPath = path.join(tempDir, 'source.sqlite');
    targetDbPath = path.join(tempDir, 'target.sqlite');
    backupPath = path.join(tempDir, 'backup.sqlite');

    sourceDb = new Database(sourceDbPath);
    await runMigrations(sourceDb, tempDir);

    targetDb = new Database(targetDbPath);
    await runMigrations(targetDb, tempDir);
  });

  afterEach(() => {
    try {
      sourceDb.close();
      targetDb.close();
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  it('generates a full backup, resets target DB, restores all records and passes integrity checks', async () => {
    // 1. Populate source database with full family structure
    sourceDb.transaction(() => {
      sourceDb
        .prepare(
          `
        INSERT INTO users (id, email, password, name, role, createdAt)
        VALUES ('usr-cycle-1', 'cycle@example.com', 'hashedpass', 'Cycle Parent', 'user', '2026-01-01')
      `
        )
        .run();

      sourceDb
        .prepare(
          `
        INSERT INTO families (id, name, ownerId, createdAt, updatedAt)
        VALUES ('fam-cycle-1', 'Cycle Familie', 'usr-cycle-1', '2026-01-01', '2026-01-01')
      `
        )
        .run();

      sourceDb
        .prepare(
          `
        INSERT INTO family_members (familyId, userId, role, joinedAt)
        VALUES ('fam-cycle-1', 'usr-cycle-1', 'admin', '2026-01-01')
      `
        )
        .run();

      sourceDb
        .prepare(
          `
        INSERT INTO profiles (id, familyId, name, birthdate, gender, createdAt, updatedAt)
        VALUES ('prof-cycle-1', 'fam-cycle-1', 'Baby Cycle', '2025-06-01', 'girl', '2026-01-01', '2026-01-01')
      `
        )
        .run();

      sourceDb
        .prepare(
          `
        INSERT INTO measurements (id, profileId, date, weight, length, headCircumference, createdAt)
        VALUES ('meas-cycle-1', 'prof-cycle-1', '2025-06-02', 3.45, 51.0, 35.0, '2026-01-01')
      `
        )
        .run();

      sourceDb
        .prepare(
          `
        INSERT INTO health_logs (id, profileId, dateTime, temperature, medication, notes, createdAt)
        VALUES ('hl-cycle-1', 'prof-cycle-1', '2025-07-01T10:00:00Z', 38.2, 'Paracetamol', 'Fieber nach Impfung', '2026-01-01')
      `
        )
        .run();
    })();

    // 2. Perform SQLite online backup
    await sourceDb.backup(backupPath);
    expect(fs.existsSync(backupPath)).toBe(true);

    // 3. Validate backup integrity
    const validation = await validateBackupFile(backupPath);
    expect(validation.ok).toBe(true);
    expect(validation.counts.users).toBe(1);
    expect(validation.counts.families).toBe(1);
    expect(validation.counts.profiles).toBe(1);

    // 4. Restore into target database using transactional table restore
    const backupDb = new Database(backupPath, { readonly: true });
    try {
      const sourceUsers = backupDb.prepare('SELECT * FROM users').all();
      const sourceFamilies = backupDb.prepare('SELECT * FROM families').all();
      const sourceMembers = backupDb.prepare('SELECT * FROM family_members').all();
      const sourceProfiles = backupDb.prepare('SELECT * FROM profiles').all();
      const sourceMeasurements = backupDb.prepare('SELECT * FROM measurements').all();
      const sourceHealthLogs = backupDb.prepare('SELECT * FROM health_logs').all();

      targetDb.transaction(() => {
        // Clear target
        targetDb.exec(`
          DELETE FROM health_logs;
          DELETE FROM measurements;
          DELETE FROM profiles;
          DELETE FROM family_members;
          DELETE FROM families;
          DELETE FROM users;
        `);

        // Insert
        for (const u of sourceUsers) {
          targetDb
            .prepare(
              `
            INSERT INTO users (id, email, password, name, role, createdAt)
            VALUES (@id, @email, @password, @name, @role, @createdAt)
          `
            )
            .run(u);
        }
        for (const f of sourceFamilies) {
          targetDb
            .prepare(
              `
            INSERT INTO families (id, name, ownerId, createdAt, updatedAt)
            VALUES (@id, @name, @ownerId, @createdAt, @updatedAt)
          `
            )
            .run(f);
        }
        for (const m of sourceMembers) {
          targetDb
            .prepare(
              `
            INSERT INTO family_members (familyId, userId, role, joinedAt)
            VALUES (@familyId, @userId, @role, @joinedAt)
          `
            )
            .run(m);
        }
        for (const p of sourceProfiles) {
          targetDb
            .prepare(
              `
            INSERT INTO profiles (id, familyId, name, birthdate, gender, createdAt, updatedAt)
            VALUES (@id, @familyId, @name, @birthdate, @gender, @createdAt, @updatedAt)
          `
            )
            .run(p);
        }
        for (const m of sourceMeasurements) {
          targetDb
            .prepare(
              `
            INSERT INTO measurements (id, profileId, date, weight, length, headCircumference, createdAt)
            VALUES (@id, @profileId, @date, @weight, @length, @headCircumference, @createdAt)
          `
            )
            .run(m);
        }
        for (const h of sourceHealthLogs) {
          targetDb
            .prepare(
              `
            INSERT INTO health_logs (id, profileId, dateTime, temperature, medication, notes, createdAt)
            VALUES (@id, @profileId, @dateTime, @temperature, @medication, @notes, @createdAt)
          `
            )
            .run(h);
        }
      })();
    } finally {
      backupDb.close();
    }

    // 5. Verify target DB has exactly the expected records
    expect(targetDb.prepare('SELECT COUNT(*) as c FROM users').get().c).toBe(1);
    expect(targetDb.prepare('SELECT COUNT(*) as c FROM families').get().c).toBe(1);
    expect(targetDb.prepare('SELECT COUNT(*) as c FROM profiles').get().c).toBe(1);
    expect(targetDb.prepare('SELECT COUNT(*) as c FROM measurements').get().c).toBe(1);
    expect(targetDb.prepare('SELECT COUNT(*) as c FROM health_logs').get().c).toBe(1);

    // 6. Verify SQLite Integrity and Foreign Keys
    expect(targetDb.pragma('integrity_check', { simple: true })).toBe('ok');
    expect(targetDb.pragma('foreign_key_check')).toHaveLength(0);

    const restoredMeasurement = targetDb
      .prepare('SELECT * FROM measurements WHERE id = ?')
      .get('meas-cycle-1');
    expect(restoredMeasurement.weight).toBe(3.45);
    expect(restoredMeasurement.length).toBe(51.0);
  });
});
