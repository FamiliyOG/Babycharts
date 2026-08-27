import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../server/index.js';
import { JWT_SECRET } from '../../server/middleware/auth.js';
import { readDb, writeDb } from '../../server/utils/db.js';

import bcrypt from 'bcryptjs';

describe('Cross-Family Security & Isolation Test Suite (BC-080)', () => {
  const dummyHash = bcrypt.hashSync('test-fixture-secret', 4);

  const userA = {
    id: 'sec-user-a',
    name: 'User A',
    email: 'a@test.com',
    password: dummyHash,
  };
  const userB = {
    id: 'sec-user-b',
    name: 'User B',
    email: 'b@test.com',
    password: dummyHash,
  };

  const tokenA = jwt.sign({ id: userA.id, email: userA.email, name: userA.name }, JWT_SECRET, {
    expiresIn: '1h',
  });
  const tokenB = jwt.sign({ id: userB.id, email: userB.email, name: userB.name }, JWT_SECRET, {
    expiresIn: '1h',
  });

  const familyA = {
    id: 'fam-sec-a',
    name: 'Family A',
    ownerId: userA.id,
    members: [{ userId: userA.id, role: 'admin', joinedAt: new Date().toISOString() }],
  };

  const familyB = {
    id: 'fam-sec-b',
    name: 'Family B',
    ownerId: userB.id,
    members: [{ userId: userB.id, role: 'admin', joinedAt: new Date().toISOString() }],
  };

  const profileA = {
    id: 'prof-sec-a',
    name: 'Child A',
    familyId: familyA.id,
    birthdate: '2025-01-01',
    gender: 'boy',
    measurements: [],
  };

  beforeAll(() => {
    const db = readDb();
    db.users.push(userA, userB);
    db.families.push(familyA, familyB);
    db.profiles.push(profileA);
    writeDb(db);
  });

  afterAll(() => {
    const db = readDb();
    db.users = db.users.filter((u) => u.id !== userA.id && u.id !== userB.id);
    db.families = db.families.filter((f) => f.id !== familyA.id && f.id !== familyB.id);
    db.profiles = db.profiles.filter((p) => p.id !== profileA.id);
    writeDb(db);
  });

  it('blocks User B from listing Family A profiles via ?familyId', async () => {
    const res = await request(app)
      .get(`/api/profiles?familyId=${familyA.id}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(403);
    expect(res.body?.error).toContain('Zugriff verweigert');
  });

  it('allows User A to list Family A profiles', async () => {
    const res = await request(app)
      .get(`/api/profiles?familyId=${familyA.id}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((p) => p.id === profileA.id)).toBe(true);
  });

  it('blocks User B from reading single Profile of Family A', async () => {
    const res = await request(app)
      .get(`/api/profiles/${profileA.id}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(403);
    expect(res.body?.error).toContain('Zugriff verweigert');
  });

  it('blocks User B from updating Profile of Family A', async () => {
    const res = await request(app)
      .put(`/api/profiles/${profileA.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'Hacked Name' });

    expect(res.status).toBe(403);
    expect(res.body?.error).toContain('Zugriff verweigert');
  });

  it('blocks User B from deleting Profile of Family A', async () => {
    const res = await request(app)
      .delete(`/api/profiles/${profileA.id}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(403);
    expect(res.body?.error).toContain('Zugriff verweigert');
  });

  it('blocks User B from creating profile directly in Family A', async () => {
    const res = await request(app)
      .post('/api/profiles')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ id: 'prof-hack', name: 'Illegal Child', familyId: familyA.id });

    expect(res.status).toBe(403);
    expect(res.body?.error).toContain('Zugriff verweigert');
  });

  it('blocks User B from creating invites for Family A', async () => {
    const res = await request(app)
      .post(`/api/families/${familyA.id}/invites`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ role: 'editor' });

    expect(res.status).toBe(403);
  });

  it('blocks unauthenticated access to /api/settings', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(401);
  });

  it('allows authenticated access to /api/settings and strips sensitive keys', async () => {
    const res = await request(app).get('/api/settings').set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body?.jwt_secret).toBeUndefined();
    expect(res.body?.media_master_key).toBeUndefined();
    expect(res.body?.databaseEngine).toBe('SQLite');
  });
});
