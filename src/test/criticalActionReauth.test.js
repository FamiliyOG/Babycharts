import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import app from '../../server/index.js';
import { JWT_SECRET } from '../../server/middleware/auth.js';
import { readDb, writeDb } from '../../server/utils/db.js';

describe('Critical Action Re-Authentication Test Suite (Issue #333)', () => {
  const dummyHash = bcrypt.hashSync('correct-secure-password', 4);

  const testUser = {
    id: 'user-reauth-test',
    email: 'reauth@test.com',
    name: 'Reauth User',
    password: dummyHash,
    role: 'superadmin',
    isDev: true,
  };

  const authToken = jwt.sign(
    { id: testUser.id, email: testUser.email, name: testUser.name },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const testFamily = {
    id: 'fam-reauth-test',
    name: 'Reauth Test Family',
    ownerId: testUser.id,
    members: [{ userId: testUser.id, role: 'admin', joinedAt: new Date().toISOString() }],
  };

  beforeAll(() => {
    const db = readDb();
    db.users.push(testUser);
    db.families.push(testFamily);
    writeDb(db);
  });

  it('rejects POST /api/auth/reauth with invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/reauth')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Ungültiges Passwort');
  });

  it('issues a 5-minute re-auth ticket on valid password', async () => {
    const res = await request(app)
      .post('/api/auth/reauth')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ password: 'correct-secure-password' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.reauthToken).toBeDefined();

    const decoded = jwt.verify(res.body.reauthToken, JWT_SECRET);
    expect(decoded.scope).toBe('recent_reauth');
    expect(decoded.id).toBe(testUser.id);
  });

  it('blocks critical action (DELETE /api/families/:id) without re-auth token', async () => {
    const res = await request(app)
      .delete(`/api/families/${testFamily.id}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('REAUTH_REQUIRED');
  });

  it('permits critical action (DELETE /api/families/:id) with valid X-Reauth-Token header', async () => {
    // 1. Obtain ticket
    const reauthRes = await request(app)
      .post('/api/auth/reauth')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ password: 'correct-secure-password' });

    const ticket = reauthRes.body.reauthToken;

    // 2. Perform critical delete
    const res = await request(app)
      .delete(`/api/families/${testFamily.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Reauth-Token', ticket);

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('erfolgreich gelöscht');
  });
});
