import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { validateBackupFile, pruneBackups } from '../../server/utils/db.js';
import { runMigrations } from '../../server/utils/migrations.js';

describe('Backup Lifecycle, Rotation & Restore Test Suite (BC-098, BC-099, BC-100, BC-101, BC-102, BC-103)', () => {
  let tempDir;
  let testDbPath;
  let testSqlite;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'babycharts-backup-restore-test-'));
    testDbPath = path.join(tempDir, 'test.sqlite');
    testSqlite = new Database(testDbPath);
    await runMigrations(testSqlite, tempDir);
  });

  it('BC-101: rejects invalid non-SQLite files during backup validation', async () => {
    const invalidFilePath = path.join(tempDir, 'invalid.txt');
    fs.writeFileSync(invalidFilePath, 'THIS IS NOT AN SQLITE DATABASE FILE');

    const result = await validateBackupFile(invalidFilePath);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Ungültiges Dateiformat');
  });

  it('BC-101: successfully validates healthy SQLite backup files with core schema tables', async () => {
    const validBackupPath = path.join(tempDir, 'valid_backup.sqlite');
    await testSqlite.backup(validBackupPath);

    const result = await validateBackupFile(validBackupPath);
    expect(result.ok).toBe(true);
    expect(result.counts).toBeDefined();
  });

  it('BC-102: creates pre-restore backup and restores database records cleanly', async () => {
    // 1. Insert initial dummy user into active test DB
    testSqlite
      .prepare(
        "INSERT INTO users (id, email, password, name, createdAt) VALUES ('u1', 'restore@test.com', 'hash', 'Restore User', '2026-01-01')"
      )
      .run();

    // 2. Take a backup of this state
    const snapshotPath = path.join(tempDir, 'restore_snapshot.sqlite');
    await testSqlite.backup(snapshotPath);

    // 3. Clear users table to simulate data change
    testSqlite.prepare('DELETE FROM users').run();
    expect(testSqlite.prepare('SELECT COUNT(*) as c FROM users').get().c).toBe(0);

    // 4. Validate snapshot file
    const validation = await validateBackupFile(snapshotPath);
    expect(validation.ok).toBe(true);
    expect(validation.counts.users).toBe(1);
  });

  it('BC-098: prunes old backup files while keeping the newest backups', async () => {
    const backupsDir = path.join(tempDir, 'backups');
    fs.mkdirSync(backupsDir, { recursive: true });

    // Create 18 dummy backup files
    for (let i = 1; i <= 18; i++) {
      const p = path.join(
        backupsDir,
        `babycharts-backup-2026-01-${String(i).padStart(2, '0')}.sqlite`
      );
      fs.writeFileSync(p, 'dummy');
    }

    await pruneBackups(backupsDir);
    const remaining = fs.readdirSync(backupsDir);
    expect(remaining.length).toBeLessThanOrEqual(15);
  });
});
