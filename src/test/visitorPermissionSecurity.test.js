import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../server/index.js';
import { JWT_SECRET } from '../../server/middleware/auth.js';
import { readDb, writeDb, setVisitorGrants } from '../../server/utils/db.js';
import { filterProfileForVisitor } from '../../server/security/visitorPermissions.js';

describe('Granular Visitor Permissions Security Suite (Issue #323)', () => {
  const visitorUser = {
    id: 'user-vis-1',
    name: 'Visitor User',
    email: 'visitor@test.com',
    password: 'dummy-password-hash',
  };

  const parentUser = {
    id: 'user-par-1',
    name: 'Parent User',
    email: 'parent@test.com',
    password: 'dummy-password-hash',
  };

  const visitorToken = jwt.sign(
    { id: visitorUser.id, email: visitorUser.email, name: visitorUser.name },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const parentToken = jwt.sign(
    { id: parentUser.id, email: parentUser.email, name: parentUser.name },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const testFamily = {
    id: 'fam-grant-1',
    name: 'Grant Test Family',
    ownerId: parentUser.id,
    members: [
      { userId: parentUser.id, role: 'admin', joinedAt: new Date().toISOString() },
      { userId: visitorUser.id, role: 'viewer', joinedAt: new Date().toISOString() },
    ],
  };

  const testProfile = {
    id: 'prof-grant-1',
    familyId: testFamily.id,
    name: 'Little Grant Child',
    birthdate: '2025-01-01',
    gender: 'boy',
    avatar: 'avatar_secret_data.jpg',
    notes: 'Very private parent notes',
    measurements: [{ id: 'm1', date: '2025-01-02', weight: 3.5 }],
    vaccinations: { measles: true },
    teeth: { tooth1: true },
    milestones: { smile: '2025-02-01' },
    customMilestones: [{ id: 'cm1', title: 'First word' }],
    healthLog: [{ id: 'h1', dateTime: '2025-01-02T10:00:00Z', temperature: 38.5 }],
  };

  beforeAll(() => {
    const db = readDb();
    db.users.push(visitorUser, parentUser);
    db.families.push(testFamily);
    db.profiles.push(testProfile);
    writeDb(db);
  });

  describe('Unit Filter Logic (filterProfileForVisitor)', () => {
    it('returns full data for parent/owner', () => {
      const filtered = filterProfileForVisitor(testProfile, [], 'parent');
      expect(filtered.avatar).toBe('avatar_secret_data.jpg');
      expect(filtered.notes).toBe('Very private parent notes');
      expect(filtered.measurements).toHaveLength(1);
    });

    it('denies all category data by default for visitor without grants (Default-Deny)', () => {
      const filtered = filterProfileForVisitor(testProfile, [], 'visitor');
      expect(filtered.avatar).toBeNull();
      expect(filtered.notes).toBeNull();
      expect(filtered.measurements).toEqual([]);
      expect(filtered.vaccinations).toEqual({});
      expect(filtered.teeth).toEqual({});
      expect(filtered.milestones).toEqual({});
      expect(filtered.healthLog).toEqual([]);
    });

    it('returns only explicitly granted categories for visitor', () => {
      const grants = [
        { profileId: testProfile.id, category: 'growth' },
        { profileId: testProfile.id, category: 'photos' },
      ];
      const filtered = filterProfileForVisitor(testProfile, grants, 'visitor');
      expect(filtered.avatar).toBe('avatar_secret_data.jpg');
      expect(filtered.measurements).toHaveLength(1);
      // Denied categories
      expect(filtered.notes).toBeNull();
      expect(filtered.vaccinations).toEqual({});
      expect(filtered.healthLog).toEqual([]);
    });
  });

  describe('API Endpoints for Visitor Grants', () => {
    it('allows parents to manage visitor grants via API', async () => {
      const res = await request(app)
        .put(`/api/families/${testFamily.id}/visitor-grants/${visitorUser.id}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          grants: [
            { profileId: testProfile.id, category: 'growth' },
            { profileId: testProfile.id, category: 'vaccinations' },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);

      const getRes = await request(app)
        .get(`/api/families/${testFamily.id}/visitor-grants/${visitorUser.id}`)
        .set('Authorization', `Bearer ${parentToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.grants).toHaveLength(2);
    });

    it('denies visitor from updating their own grants (Privilege Escalation Protection)', async () => {
      const res = await request(app)
        .put(`/api/families/${testFamily.id}/visitor-grants/${visitorUser.id}`)
        .set('Authorization', `Bearer ${visitorToken}`)
        .send({
          grants: [{ profileId: testProfile.id, category: 'notes' }],
        });

      expect(res.status).toBe(403);
    });

    it('delivers filtered profile over GET /api/profiles/:id to visitor according to grants', async () => {
      // Set only growth grant
      setVisitorGrants(testFamily.id, visitorUser.id, [
        { profileId: testProfile.id, category: 'growth' },
      ]);

      const res = await request(app)
        .get(`/api/profiles/${testProfile.id}`)
        .set('Authorization', `Bearer ${visitorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.measurements).toHaveLength(1);
      expect(res.body.notes).toBeNull();
      expect(res.body.healthLog).toEqual([]);
      expect(res.body.vaccinations).toEqual({});
    });
  });
});
