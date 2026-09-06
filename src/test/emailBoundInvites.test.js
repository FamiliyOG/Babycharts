import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import app from '../../server/index.js';
import { JWT_SECRET } from '../../server/middleware/auth.js';
import { readDb, writeDb } from '../../server/utils/db.js';

describe('Email-Bound Family Invites Security Suite (Issue #324)', () => {
  const dummyHash = bcrypt.hashSync('pass1234', 4);

  const adminUser = {
    id: 'user-inv-admin',
    email: 'admin@family.local',
    name: 'Admin Mom',
    password: dummyHash,
    role: 'user',
  };

  const authorizedGrandma = {
    id: 'user-inv-grandma',
    email: 'grandma@family.local',
    name: 'Grandma Mary',
    password: dummyHash,
    role: 'user',
  };

  const randomIntruder = {
    id: 'user-inv-intruder',
    email: 'intruder@stranger.local',
    name: 'Random Stranger',
    password: dummyHash,
    role: 'user',
  };

  const adminToken = jwt.sign(
    { id: adminUser.id, email: adminUser.email, name: adminUser.name },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const intruderToken = jwt.sign(
    { id: randomIntruder.id, email: randomIntruder.email, name: randomIntruder.name },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const familyId = 'fam-email-bound-test';
  const testFamily = {
    id: familyId,
    name: 'Email Bound Family',
    ownerId: adminUser.id,
    members: [{ userId: adminUser.id, role: 'admin', joinedAt: new Date().toISOString() }],
  };

  beforeAll(() => {
    const db = readDb();
    db.users.push(adminUser, authorizedGrandma, randomIntruder);
    db.families.push(testFamily);
    writeDb(db);
  });

  it('creates an email-bound invite code restricted to grandma@family.local', async () => {
    const res = await request(app)
      .post(`/api/families/${familyId}/invites`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        role: 'viewer',
        expiresInHours: 48,
        maxUses: 1,
        invitedEmail: 'grandma@family.local',
      });

    expect(res.status).toBe(201);
    expect(res.body.code).toBeDefined();
    expect(res.body.invitedEmail).toBe('grandma@family.local');
  });

  it('rejects an invalid email format when creating bound invite', async () => {
    const res = await request(app)
      .post(`/api/families/${familyId}/invites`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        role: 'viewer',
        invitedEmail: 'not-an-email',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Ungültige E-Mail-Adresse');
  });

  it('denies random intruder from redeeming email-bound invite', async () => {
    // 1. Admin creates code for grandma
    const createRes = await request(app)
      .post(`/api/families/${familyId}/invites`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        role: 'viewer',
        invitedEmail: 'grandma@family.local',
      });

    const code = createRes.body.code;

    // 2. Intruder attempts to join
    const joinRes = await request(app)
      .post('/api/families/join')
      .set('Authorization', `Bearer ${intruderToken}`)
      .send({ code });

    expect(joinRes.status).toBe(403);
    expect(joinRes.body.error).toContain('personengebunden');
  });

  it('permits authorized user with matching email to redeem bound invite', async () => {
    const uniqueGrandma = {
      id: `grandma-user-${Date.now()}`,
      email: 'grandma.clean@family.local',
      name: 'Clean Grandma',
      password: dummyHash,
      role: 'user',
    };
    const db = readDb();
    db.users.push(uniqueGrandma);
    writeDb(db);

    const grandmaTokenUnique = jwt.sign(
      { id: uniqueGrandma.id, email: uniqueGrandma.email, name: uniqueGrandma.name },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 1. Admin creates code for grandma
    const createRes = await request(app)
      .post(`/api/families/${familyId}/invites`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        role: 'viewer',
        invitedEmail: 'grandma.clean@family.local',
      });

    const code = createRes.body.code;

    // 2. Grandma redeems code
    const joinRes = await request(app)
      .post('/api/families/join')
      .set('Authorization', `Bearer ${grandmaTokenUnique}`)
      .send({ code });

    expect(joinRes.status).toBe(200);
    expect(joinRes.body.message).toContain('Erfolgreich');

    // 3. Confirm grandma is now in family members
    const updatedDb = readDb();
    const fam = updatedDb.families.find((f) => f.id === familyId);
    expect(fam.members.some((m) => m.userId === uniqueGrandma.id)).toBe(true);
  });
});
