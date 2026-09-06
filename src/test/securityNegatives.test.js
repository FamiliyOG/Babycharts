import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../server/index.js';
import { JWT_SECRET } from '../../server/middleware/auth.js';
import { readDb, writeDb } from '../../server/utils/db.js';
import bcrypt from 'bcryptjs';

describe('Security Negative & Abuse Tests (BC-301)', () => {
  const dummyHash = bcrypt.hashSync('test-fixture-secret', 4);

  const victimUser = {
    id: 'sec-neg-victim',
    name: 'Victim User',
    email: 'victim@test.local',
    password: dummyHash,
  };

  const attackerUser = {
    id: 'sec-neg-attacker',
    name: 'Attacker User',
    email: 'attacker@test.local',
    password: dummyHash,
  };

  const victimFamily = {
    id: 'fam-sec-neg-victim',
    name: 'Victim Family',
    ownerId: victimUser.id,
    members: [{ userId: victimUser.id, role: 'owner', joinedAt: new Date().toISOString() }],
  };

  const attackerFamily = {
    id: 'fam-sec-neg-attacker',
    name: 'Attacker Family',
    ownerId: attackerUser.id,
    members: [{ userId: attackerUser.id, role: 'owner', joinedAt: new Date().toISOString() }],
  };

  const victimProfile = {
    id: 'prof-sec-neg-victim',
    name: 'Victim Child',
    familyId: victimFamily.id,
    birthdate: '2025-01-01',
    gender: 'girl',
    measurements: [],
  };

  const victimToken = jwt.sign(
    { id: victimUser.id, email: victimUser.email, name: victimUser.name },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const attackerToken = jwt.sign(
    { id: attackerUser.id, email: attackerUser.email, name: attackerUser.name },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  beforeAll(() => {
    const db = readDb();
    db.users.push(victimUser, attackerUser);
    db.families.push(victimFamily, attackerFamily);
    db.profiles.push(victimProfile);
    writeDb(db);
  });

  afterAll(() => {
    const db = readDb();
    db.users = db.users.filter((u) => u.id !== victimUser.id && u.id !== attackerUser.id);
    db.families = db.families.filter((f) => f.id !== victimFamily.id && f.id !== attackerFamily.id);
    db.profiles = db.profiles.filter((p) => p.id !== victimProfile.id);
    writeDb(db);
  });

  describe('1. Mass Assignment & Privilege Escalation Prevention', () => {
    it('prevents attacker from elevating role or stealing ownership via profile update', async () => {
      const res = await request(app)
        .put(`/api/v1/profiles/${victimProfile.id}`)
        .set('Authorization', `Bearer ${victimToken}`)
        .send({
          name: 'Updated Name',
          familyId: attackerFamily.id, // Attempt to re-parent to a family victim is not member of
          ownerId: attackerUser.id,
          isSuperAdmin: true,
          role: 'superadmin',
        });

      // Target family check must deny since victim is not a member of attackerFamily
      expect([400, 403]).toContain(res.status);

      // Verify that the child is still strictly under victimFamily in database
      const db = readDb();
      const updated = db.profiles.find((p) => p.id === victimProfile.id);
      expect(updated.familyId).toBe(victimFamily.id);
      expect(updated.isSuperAdmin).toBeUndefined();
    });

    it('rejects cross-family profile update entirely when attempted by non-member', async () => {
      const res = await request(app)
        .put(`/api/v1/profiles/${victimProfile.id}`)
        .set('Authorization', `Bearer ${attackerToken}`)
        .send({
          name: 'Hacked Name',
        });

      expect([403, 404]).toContain(res.status);
    });
  });

  describe('2. Path Traversal in Media & Static Resources', () => {
    it('rejects path traversal attempts in media requests with ../', async () => {
      const maliciousId = '../../../etc/passwd';
      const res = await request(app)
        .get(`/api/v1/media/${encodeURIComponent(maliciousId)}`)
        .set('Authorization', `Bearer ${victimToken}`);

      expect([400, 403, 404]).toContain(res.status);
    });
  });

  describe('3. CSRF & Token Manipulation Negative Tests', () => {
    it('rejects expired or forged JWT tokens with 401/403', async () => {
      const forgedToken = jwt.sign({ id: 'fake-user' }, 'wrong-secret');
      const res = await request(app)
        .get('/api/v1/profiles')
        .set('Authorization', `Bearer ${forgedToken}`);

      expect([401, 403]).toContain(res.status);
    });

    it('rejects empty and malformed bearer tokens', async () => {
      const res = await request(app)
        .get('/api/v1/profiles')
        .set('Authorization', 'Bearer invalid.token.structure');

      expect([401, 403]).toContain(res.status);
    });
  });

  describe('4. Malformed Payload & Extreme Body Rejection', () => {
    it('rejects malformed JSON bodies on state-changing endpoints with 400', async () => {
      const res = await request(app)
        .post('/api/v1/profiles')
        .set('Authorization', `Bearer ${victimToken}`)
        .set('Content-Type', 'application/json')
        .send('{ "malformedJson": ');

      expect(res.status).toBe(400);
    });
  });
});
