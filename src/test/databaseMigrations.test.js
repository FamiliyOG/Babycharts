import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  runMigrations,
  getAppliedMigrations,
  createPreMigrationBackup,
} from '../../server/utils/migrations.js';

describe('Database Schema Versioning & Migration Framework Test Suite (BC-087, BC-088, BC-089)', () => {
  let tempDir;
  let testDbPath;
  let testSqlite;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'babycharts-migration-test-'));
    testDbPath = path.join(tempDir, 'test.sqlite');
    testSqlite = new Database(testDbPath);
  });

  it('BC-087: creates _schema_migrations table and records applied version numbers', async () => {
    await runMigrations(testSqlite, tempDir);

    const applied = getAppliedMigrations(testSqlite);
    expect(applied.has(1)).toBe(true);
    expect(applied.has(2)).toBe(true);
    expect(applied.has(3)).toBe(true);

    const rows = testSqlite.prepare('SELECT * FROM _schema_migrations ORDER BY version ASC').all();
    expect(rows.length).toBeGreaterThanOrEqual(3);
    expect(rows[0].version).toBe(1);
    expect(rows[0].name).toBe('initial_schema_and_legacy_columns');
    expect(rows[1].version).toBe(2);
    expect(rows[1].name).toBe('performance_indexes');
    expect(rows[2].version).toBe(3);
    expect(rows[2].name).toBe('soft_delete_and_concurrency');

    const userVersion = testSqlite.pragma('user_version', { simple: true });
    expect(userVersion).toBe(3);
  });

  it('BC-088: executes migrations idempotently on consecutive runs without errors', async () => {
    await runMigrations(testSqlite, tempDir);
    const countAfterFirst = testSqlite
      .prepare('SELECT COUNT(*) as count FROM _schema_migrations')
      .get().count;

    // Run again
    await runMigrations(testSqlite, tempDir);
    const countAfterSecond = testSqlite
      .prepare('SELECT COUNT(*) as count FROM _schema_migrations')
      .get().count;

    expect(countAfterSecond).toBe(countAfterFirst);
  });

  it('BC-089: creates a valid SQLite backup before applying new migrations', async () => {
    const backupPath = await createPreMigrationBackup(testSqlite, tempDir, 1);
    expect(backupPath).toBeDefined();
    expect(typeof backupPath).toBe('string');
    expect(fs.existsSync(backupPath)).toBe(true);

    // Verify backup can be opened as a valid SQLite database
    const backupDb = new Database(backupPath);
    expect(backupDb.open).toBe(true);
    backupDb.close();
  });
});
