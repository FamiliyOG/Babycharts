import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../server/index.js';
import { sqlite, readDb, writeDb } from '../../server/utils/db.js';
import { runRetentionCleanup } from '../../server/services/retentionService.js';
import { DATA_SOURCES, getDataSource } from '../utils/dataSourceMetadata.js';
import { JWT_SECRET } from '../../server/middleware/auth.js';
import jwt from 'jsonwebtoken';

describe('Phase 5 Features & Compliance Tests', () => {
  let initialDb;

  beforeEach(() => {
    initialDb = readDb();
  });

  afterEach(() => {
    writeDb(initialDb);
  });

  describe('BC-314 & BC-315: Data Sources & Medical Disclaimers', () => {
    it('provides complete provenance and versioning metadata for medical guidelines', () => {
      expect(DATA_SOURCES.WHO_GROWTH_STANDARDS).toBeDefined();
      expect(DATA_SOURCES.WHO_GROWTH_STANDARDS.version).toContain('2006');
      expect(DATA_SOURCES.WHO_GROWTH_STANDARDS.publisher).toBe('World Health Organization (WHO)');

      expect(DATA_SOURCES.STIKO_VACCINATIONS).toBeDefined();
      expect(DATA_SOURCES.STIKO_VACCINATIONS.version).toContain('2024/2025');

      expect(DATA_SOURCES.GBA_U_CHECKUPS).toBeDefined();
      expect(DATA_SOURCES.GBA_U_CHECKUPS.version).toContain('2024');

      expect(getDataSource('WHO_GROWTH_STANDARDS')).toEqual(DATA_SOURCES.WHO_GROWTH_STANDARDS);
      expect(getDataSource('NON_EXISTENT')).toBeNull();
    });
  });

  describe('BC-316: Family-Isolated Global Search', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/v1/profiles/search?q=a');
      expect(res.status).toBe(401);
    });

    it('denies search for non-member families', async () => {
      const db = readDb();
      const testUserId = 'phase5-search-user-1';
      db.users.push({
        id: testUserId,
        name: 'Search Test User',
        email: 'searchtest1@example.com',
        password: 'hashedpassword',
      });
      writeDb(db);

      const token = jwt.sign({ id: testUserId, email: 'searchtest1@example.com' }, JWT_SECRET);

      const res = await request(app)
        .get('/api/v1/profiles/search?q=test&familyId=unauthorized-family-id')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('searches milestones, measurements, and health logs within member family', async () => {
      const db = readDb();
      const testUserId = 'phase5-user-search-ok';
      const testFamId = 'phase5-fam-search-ok';
      const testProfileId = 'phase5-prof-search-ok';

      db.users.push({
        id: testUserId,
        name: 'Search Tester',
        email: 'searchuser@example.com',
        password: 'hashedpassword',
      });

      db.families.push({
        id: testFamId,
        name: 'Search Family',
        ownerId: testUserId,
        members: [{ userId: testUserId, role: 'owner' }],
      });

      db.profiles.push({
        id: testProfileId,
        familyId: testFamId,
        name: 'SearchBaby',
        birthdate: '2024-01-01',
        gender: 'girl',
        notes: 'SpecialNoteKeyword',
        measurements: [
          { id: 'm1', date: '2024-02-01', weight: 4.5, length: 55, notes: 'MeasuredAfterFever' },
        ],
        healthLog: [
          {
            id: 'h1',
            dateTime: '2024-02-02T10:00:00Z',
            medication: 'ParacetamolSyrup',
            symptoms: ['Husten'],
          },
        ],
        customMilestones: [{ id: 'cm1', title: 'FirstStepJoy', notes: 'Walked across the room' }],
      });

      writeDb(db);

      const token = jwt.sign({ id: testUserId, email: 'searchuser@example.com' }, JWT_SECRET);

      // 1. Search by profile notes
      const resProfile = await request(app)
        .get(`/api/v1/profiles/search?q=SpecialNoteKeyword&familyId=${testFamId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(resProfile.status).toBe(200);
      expect(resProfile.body.results.length).toBeGreaterThanOrEqual(1);
      expect(resProfile.body.results[0].type).toBe('profile');

      // 2. Search by measurement notes
      const resMeas = await request(app)
        .get(`/api/v1/profiles/search?q=MeasuredAfterFever&familyId=${testFamId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(resMeas.status).toBe(200);
      expect(resMeas.body.results.some((r) => r.type === 'measurement')).toBe(true);

      // 3. Search by medication
      const resHealth = await request(app)
        .get(`/api/v1/profiles/search?q=ParacetamolSyrup&familyId=${testFamId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(resHealth.status).toBe(200);
      expect(resHealth.body.results.some((r) => r.type === 'health_log')).toBe(true);

      // 4. Search by custom milestone
      const resMilestone = await request(app)
        .get(`/api/v1/profiles/search?q=FirstStepJoy&familyId=${testFamId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(resMilestone.status).toBe(200);
      expect(resMilestone.body.results.some((r) => r.type === 'milestone')).toBe(true);
    });
  });

  describe('BC-318: Configurable Data Retention and Cleanup Service', () => {
    it('purges audit logs older than retention cutoff', () => {
      const oldId = `audit-old-${Date.now()}`;
      const recentId = `audit-recent-${Date.now()}`;
      const oldDate = new Date(Date.now() - 400 * 86400000).toISOString();
      const recentDate = new Date().toISOString();

      sqlite
        .prepare(
          `
        INSERT INTO audit_logs (id, timestamp, event, userId, status)
        VALUES (?, ?, 'TEST_EVENT', 'user-1', 'success')
      `
        )
        .run(oldId, oldDate);

      sqlite
        .prepare(
          `
        INSERT INTO audit_logs (id, timestamp, event, userId, status)
        VALUES (?, ?, 'TEST_EVENT', 'user-1', 'success')
      `
        )
        .run(recentId, recentDate);

      const result = runRetentionCleanup({ auditLogRetentionDays: 365 });
      expect(result.purged.auditLogs).toBeGreaterThanOrEqual(1);

      const oldExists = sqlite.prepare('SELECT id FROM audit_logs WHERE id = ?').get(oldId);
      const recentExists = sqlite.prepare('SELECT id FROM audit_logs WHERE id = ?').get(recentId);

      expect(oldExists).toBeUndefined();
      expect(recentExists).toBeDefined();
    });

    it('purges expired soft-deleted profiles older than 30 days', () => {
      const db = readDb();
      const testFamId = 'fam-retention-test';
      const expiredDeletedAt = new Date(Date.now() - 45 * 86400000).toISOString();
      const testId = 'prof-phase5-expired';

      if (!db.families.some((f) => f.id === testFamId)) {
        db.families.push({
          id: testFamId,
          name: 'Retention Family',
          ownerId: 'owner-test',
          members: [],
        });
      }

      db.profiles.push({
        id: testId,
        familyId: testFamId,
        name: 'SoftDeletedChild',
        birthdate: '2024-01-01',
        gender: 'boy',
        deletedAt: expiredDeletedAt,
        measurements: [],
        healthLog: [],
      });

      writeDb(db);

      const result = runRetentionCleanup({ softDeleteRetentionDays: 30 });
      expect(result.purged.profiles).toBeGreaterThanOrEqual(1);

      const inDb = sqlite.prepare('SELECT id FROM profiles WHERE id = ?').get(testId);
      expect(inDb).toBeUndefined();
    });
  });
});
