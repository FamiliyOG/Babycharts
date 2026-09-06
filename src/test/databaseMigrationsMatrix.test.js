import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runMigrations, getAppliedMigrations } from '../../server/utils/migrations.js';

describe('Database Upgrade & Migration Matrix Suite (BC-302)', () => {
  let tempDir;
  let testDbPath;
  let testSqlite;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'babycharts-upgrade-matrix-'));
    testDbPath = path.join(tempDir, 'upgrade.sqlite');
    testSqlite = new Database(testDbPath);
  });

  afterEach(() => {
    if (testSqlite) {
      testSqlite.close();
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('migrates legacy database from v1 directly to the latest schema version', async () => {
    // 1. Establish authentic Version 1 Schema via Migration 1
    const { MIGRATIONS } = await import('../../server/utils/migrations.js');
    MIGRATIONS[0].up(testSqlite);

    testSqlite.exec(`
      CREATE TABLE IF NOT EXISTS _schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        appliedAt TEXT NOT NULL,
        backupPath TEXT
      );
      INSERT INTO _schema_migrations (version, name, appliedAt) VALUES (1, 'initial_schema_and_legacy_columns', datetime('now'));
      PRAGMA user_version = 1;

      INSERT INTO families (id, name, createdAt) VALUES ('fam-1', 'Legacy Family', datetime('now'));
      INSERT INTO profiles (id, name, birthdate, gender, familyId, createdAt)
      VALUES ('legacy-child-1', 'Legacy Kid', '2023-01-01', 'boy', 'fam-1', datetime('now'));
    `);

    // Run migrations up to latest without backup directory to avoid unhandled async backup on closed db
    runMigrations(testSqlite, null);

    const applied = getAppliedMigrations(testSqlite);
    expect(applied.has(9)).toBe(true); // Migration 9 is latest media derivatives

    // Verify data was preserved seamlessly
    const kid = testSqlite.prepare('SELECT * FROM profiles WHERE id = ?').get('legacy-child-1');
    expect(kid).toBeDefined();
    expect(kid.name).toBe('Legacy Kid');

    // Verify new columns added in subsequent migrations exist
    expect(kid.version).toBeDefined();
  });

  it('guarantees idempotency: executing migrations multiple times causes zero changes', () => {
    runMigrations(testSqlite, null);
    const initialPragma = testSqlite.pragma('user_version', { simple: true });
    const initialMigrations = testSqlite
      .prepare('SELECT COUNT(*) as c FROM _schema_migrations')
      .get().c;

    // Run again
    runMigrations(testSqlite, null);
    const postPragma = testSqlite.pragma('user_version', { simple: true });
    const postMigrations = testSqlite
      .prepare('SELECT COUNT(*) as c FROM _schema_migrations')
      .get().c;

    expect(postPragma).toBe(initialPragma);
    expect(postMigrations).toBe(initialMigrations);
  });
});
