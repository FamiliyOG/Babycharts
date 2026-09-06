/**
 * src/test/databaseConstraints.test.js
 * Database Constraints, Cascade Deletion, Transactions & Index Audit Test Suite (Issue #291).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runMigrations } from '../../server/utils/migrations.js';

describe('Database Constraints, Cascades, Transactions & Index Audit (#291)', () => {
  let tempDir;
  let testDbPath;
  let db;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'babycharts-constraints-test-'));
    testDbPath = path.join(tempDir, 'test.sqlite');
    db = new Database(testDbPath);
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');
    runMigrations(db, tempDir);
  });

  // ── 1. Foreign Key Enforcement ─────────────────────────────────────────────
  describe('Foreign Key Enforcement', () => {
    it('rejects child record insertions with non-existent parent foreign keys', () => {
      expect(() => {
        db.prepare(
          `INSERT INTO measurements (id, profileId, date, weight) VALUES (?, ?, ?, ?)`
        ).run('m-invalid', 'non-existent-profile', '2024-01-01', 5.0);
      }).toThrow(/FOREIGN KEY/i);

      expect(() => {
        db.prepare(
          `INSERT INTO family_members (familyId, userId, role, joinedAt) VALUES (?, ?, ?, ?)`
        ).run('non-existent-fam', 'non-existent-user', 'editor', '2024-01-01T00:00:00Z');
      }).toThrow(/FOREIGN KEY/i);
    });

    it('enforces foreign keys on every connection by default', () => {
      const fkStatus = db.pragma('foreign_keys', { simple: true });
      expect(fkStatus).toBe(1);

      const fkCheckResult = db.pragma('foreign_key_check');
      expect(fkCheckResult).toHaveLength(0);
    });
  });

  // ── 2. Cascade Deletions ───────────────────────────────────────────────────
  describe('Cascade Deletion Integrity', () => {
    it('cascades deletion from family to members, invites, media, and audit logs', () => {
      // 1. Setup user & family
      db.prepare(
        `INSERT INTO users (id, email, password, name, createdAt) VALUES (?, ?, ?, ?, ?)`
      ).run('u1', 'cascade@example.com', 'hash', 'Cascade User', '2024-01-01');

      db.prepare(`INSERT INTO families (id, name, ownerId, createdAt) VALUES (?, ?, ?, ?)`).run(
        'fam1',
        'Cascade Family',
        'u1',
        '2024-01-01'
      );

      db.prepare(
        `INSERT INTO family_members (familyId, userId, role, joinedAt) VALUES (?, ?, ?, ?)`
      ).run('fam1', 'u1', 'owner', '2024-01-01');

      db.prepare(
        `INSERT INTO invites (code, familyId, role, createdBy, createdAt) VALUES (?, ?, ?, ?, ?)`
      ).run('INV123', 'fam1', 'viewer', 'u1', '2024-01-01');

      db.prepare(
        `INSERT INTO media_files (id, familyId, userId, originalName, mimeType, sizeBytes, iv, authTag, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run('media1', 'fam1', 'u1', 'test.jpg', 'image/jpeg', 100, 'iv', 'tag', '2024-01-01');

      db.prepare(
        `INSERT INTO family_audit_logs (id, familyId, userId, action, timestamp)
         VALUES (?, ?, ?, ?, ?)`
      ).run('log1', 'fam1', 'u1', 'TEST', '2024-01-01');

      // 2. Delete the parent family
      db.prepare(`DELETE FROM families WHERE id = ?`).run('fam1');

      // 3. Verify all children were cascade-deleted
      expect(
        db.prepare(`SELECT COUNT(*) as c FROM family_members WHERE familyId = ?`).get('fam1').c
      ).toBe(0);
      expect(db.prepare(`SELECT COUNT(*) as c FROM invites WHERE familyId = ?`).get('fam1').c).toBe(
        0
      );
      expect(
        db.prepare(`SELECT COUNT(*) as c FROM media_files WHERE familyId = ?`).get('fam1').c
      ).toBe(0);
      expect(
        db.prepare(`SELECT COUNT(*) as c FROM family_audit_logs WHERE familyId = ?`).get('fam1').c
      ).toBe(0);
    });

    it('cascades deletion from profile to measurements and health logs', () => {
      db.prepare(
        `INSERT INTO profiles (id, name, birthdate, gender, createdAt) VALUES (?, ?, ?, ?, ?)`
      ).run('p1', 'Child P1', '2024-01-01', 'girl', '2024-01-01');

      db.prepare(`INSERT INTO measurements (id, profileId, date, weight) VALUES (?, ?, ?, ?)`).run(
        'm1',
        'p1',
        '2024-02-01',
        4.2
      );

      db.prepare(
        `INSERT INTO health_logs (id, profileId, dateTime, temperature) VALUES (?, ?, ?, ?)`
      ).run('hl1', 'p1', '2024-02-05T10:00:00Z', 37.5);

      db.prepare(`DELETE FROM profiles WHERE id = ?`).run('p1');

      expect(
        db.prepare(`SELECT COUNT(*) as c FROM measurements WHERE profileId = ?`).get('p1').c
      ).toBe(0);
      expect(
        db.prepare(`SELECT COUNT(*) as c FROM health_logs WHERE profileId = ?`).get('p1').c
      ).toBe(0);
    });
  });

  // ── 3. Transaction Atomicity & Rollback ────────────────────────────────────
  describe('Transaction Atomicity & Rollback', () => {
    it('rolls back all writes in a transaction if an error occurs mid-operation', () => {
      db.prepare(
        `INSERT INTO profiles (id, name, birthdate, gender, createdAt) VALUES (?, ?, ?, ?, ?)`
      ).run('p-tx', 'Tx Child', '2024-01-01', 'boy', '2024-01-01');

      const initialCount = db
        .prepare(`SELECT COUNT(*) as c FROM measurements WHERE profileId = ?`)
        .get('p-tx').c;

      const atomicOperation = db.transaction(() => {
        db.prepare(
          `INSERT INTO measurements (id, profileId, date, weight) VALUES (?, ?, ?, ?)`
        ).run('m-tx-1', 'p-tx', '2024-02-01', 4.0);

        // Deliberate failure: duplicate primary key
        db.prepare(
          `INSERT INTO measurements (id, profileId, date, weight) VALUES (?, ?, ?, ?)`
        ).run('m-tx-1', 'p-tx', '2024-02-02', 4.1);
      });

      expect(() => atomicOperation()).toThrow(/UNIQUE constraint/i);

      // Verify m-tx-1 was rolled back and not persisted
      const afterCount = db
        .prepare(`SELECT COUNT(*) as c FROM measurements WHERE profileId = ?`)
        .get('p-tx').c;
      expect(afterCount).toBe(initialCount);
    });
  });

  // ── 4. Query Plan & Composite Index Usage ──────────────────────────────────
  describe('Query Plan & Composite Index Verification', () => {
    it('utilizes composite index idx_profiles_family_active for filtered profile queries', () => {
      const plan = db
        .prepare(
          `EXPLAIN QUERY PLAN SELECT * FROM profiles WHERE familyId = ? AND deletedAt IS NULL`
        )
        .all('fam-test');

      const planDetail = plan.map((p) => p.detail).join(' ');
      expect(planDetail).toContain('idx_profiles_family_active');
    });

    it('utilizes composite index idx_measurements_profile_active for active measurement queries', () => {
      const plan = db
        .prepare(
          `EXPLAIN QUERY PLAN SELECT * FROM measurements WHERE profileId = ? AND deletedAt IS NULL ORDER BY date ASC`
        )
        .all('p-test');

      const planDetail = plan.map((p) => p.detail).join(' ');
      expect(planDetail).toContain('idx_measurements_profile_active');
    });

    it('utilizes composite index idx_health_logs_profile_active for health logs queries', () => {
      const plan = db
        .prepare(
          `EXPLAIN QUERY PLAN SELECT * FROM health_logs WHERE profileId = ? AND deletedAt IS NULL ORDER BY dateTime ASC`
        )
        .all('p-test');

      const planDetail = plan.map((p) => p.detail).join(' ');
      expect(planDetail).toContain('idx_health_logs_profile_active');
    });
  });
});
