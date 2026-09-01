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
    db.users = db.users.filter(
      (u) => u.id !== userA.id && u.id !== userB.id && u.id !== 'sec-user-c'
    );
    db.invites = (db.invites || []).filter(
      (i) => i.familyId !== familyA.id && i.familyId !== familyB.id
    );
    db.usedInvites = (db.usedInvites || []).filter(
      (u) => u.familyId !== familyA.id && u.familyId !== familyB.id
    );
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

  it('enforces role updates security (BC-039, BC-040)', async () => {
    // 1. Add User B to Family A as viewer
    const db = readDb();
    const fam = db.families.find((f) => f.id === familyA.id);
    fam.members.push({ userId: userB.id, role: 'viewer', joinedAt: new Date().toISOString() });
    writeDb(db);

    // 2. User B (viewer) cannot update their own or other roles
    const resForbidden = await request(app)
      .put(`/api/families/${familyA.id}/members/${userB.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ role: 'admin' });
    expect(resForbidden.status).toBe(403);

    // 3. User A (owner/admin) CAN update User B role to editor
    const resAllowed = await request(app)
      .put(`/api/families/${familyA.id}/members/${userB.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ role: 'editor' });
    expect(resAllowed.status).toBe(200);
    expect(resAllowed.body?.member?.role).toBe('editor');

    // 4. Admin cannot change the owner role (BC-043)
    const resOwnerProtect = await request(app)
      .put(`/api/families/${familyA.id}/members/${userA.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ role: 'viewer' });
    expect(resOwnerProtect.status).toBe(400);
    expect(resOwnerProtect.body?.error).toContain('Owner-Schutz');

    // 5. Owner cannot leave their own family (BC-043)
    const resOwnerLeave = await request(app)
      .post(`/api/families/${familyA.id}/leave`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(resOwnerLeave.status).toBe(400);
    expect(resOwnerLeave.body?.error).toContain('Inhaber');

    // 6. Member (User B) can leave family successfully (BC-041)
    const resMemberLeave = await request(app)
      .post(`/api/families/${familyA.id}/leave`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(resMemberLeave.status).toBe(200);
    expect(resMemberLeave.body?.message).toContain('erfolgreich verlassen');
  });

  it('handles owner transfer and invite expiration (BC-044, BC-045, BC-046)', async () => {
    const db = readDb();
    const fam = db.families.find((f) => f.id === familyA.id);

    // 1. Re-add User B as editor
    fam.members.push({ userId: userB.id, role: 'editor', joinedAt: new Date().toISOString() });
    writeDb(db);

    // 2. Transfer ownership from User A to User B (BC-044)
    const resTransfer = await request(app)
      .post(`/api/families/${familyA.id}/transfer-ownership`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ newOwnerId: userB.id });
    expect(resTransfer.status).toBe(200);
    expect(resTransfer.body?.family?.ownerId).toBe(userB.id);

    // 3. User A is now not the owner, so User A cannot transfer ownership again
    const resTransferFail = await request(app)
      .post(`/api/families/${familyA.id}/transfer-ownership`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ newOwnerId: userA.id });
    expect(resTransferFail.status).toBe(403);

    // 4. Create an invite with 24 hours expiry (BC-046)
    const resInvite = await request(app)
      .post(`/api/families/${familyA.id}/invites`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ role: 'editor', expiresInHours: 24 });
    expect(resInvite.status).toBe(201);
    expect(resInvite.body?.expiresAt).toBeDefined();

    // 5. Test expired invite code rejection (BC-045)
    const dbAfter = readDb();
    const inv = dbAfter.invites.find((i) => i.code === resInvite.body.code);
    inv.expiresAt = new Date(Date.now() - 1000 * 60).toISOString(); // expired 1 min ago
    writeDb(dbAfter);

    const resJoinExpired = await request(app)
      .post('/api/families/join')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ code: resInvite.body.code });
    expect(resJoinExpired.status).toBe(400);
    expect(resJoinExpired.body?.error).toContain('abgelaufen');

    // 6. Create multi-use invite code with maxUses=2 (BC-047)
    const userC = {
      id: 'sec-user-c',
      name: 'User C',
      email: 'c@test.com',
      password: dummyHash,
    };
    const tokenC = jwt.sign({ id: userC.id, email: userC.email, name: userC.name }, JWT_SECRET, {
      expiresIn: '1h',
    });
    const dbPre = readDb();
    dbPre.users.push(userC);
    writeDb(dbPre);

    const resMultiInvite = await request(app)
      .post(`/api/families/${familyA.id}/invites`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ role: 'viewer', maxUses: 2 });
    expect(resMultiInvite.status).toBe(201);
    expect(resMultiInvite.body?.maxUses).toBe(2);

    // Join with User C (1st use)
    const resUse1 = await request(app)
      .post('/api/families/join')
      .set('Authorization', `Bearer ${tokenC}`)
      .send({ code: resMultiInvite.body.code });
    expect(resUse1.status).toBe(200);

    // Code still in DB with usesCount=1
    const dbMid = readDb();
    const invMid = dbMid.invites.find((i) => i.code === resMultiInvite.body.code);
    expect(invMid?.usesCount).toBe(1);
  }, 20000);

  it('rejects unauthenticated GET /api/profiles and GET /api/profiles/:id completely (P0)', async () => {
    const resAll = await request(app).get('/api/profiles');
    expect(resAll.status).toBe(401);

    const resSingle = await request(app).get(`/api/profiles/${profileA.id}`);
    expect(resSingle.status).toBe(401);
  });

  it('enforces Settings-RBAC: regular user cannot mutate global settings (P0)', async () => {
    const res = await request(app)
      .post('/api/settings')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ appLanguage: 'en' });

    expect(res.status).toBe(403);
    expect(res.body?.error).toContain('Instanz-Administratoren');
  });
});
