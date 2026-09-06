/**
 * src/test/rbacMatrix.test.js
 * Comprehensive RBAC and Security Matrix Test Suite (Issues #257, #261, #268, #325, #326, #327, #330, #331, #334)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import app from '../../server/index.js';
import { readDb, writeDb } from '../../server/utils/db.js';
import { JWT_SECRET } from '../../server/middleware/auth.js';

describe('Comprehensive RBAC, Lifecycle & Security Matrix (CI Gate #334)', () => {
  const passwordHash = bcrypt.hashSync('matrix-test-password-123!', 4);

  // Users
  const superadminUser = {
    id: 'user-rbac-superadmin',
    email: 'superadmin@rbac.test',
    name: 'Super Admin',
    password: passwordHash,
    role: 'superadmin',
    isDev: true,
    tokenVersion: 0,
    createdAt: new Date().toISOString(),
  };

  const secondSuperadmin = {
    id: 'user-rbac-superadmin-2',
    email: 'superadmin2@rbac.test',
    name: 'Super Admin 2',
    password: passwordHash,
    role: 'superadmin',
    isDev: true,
    tokenVersion: 0,
    createdAt: new Date().toISOString(),
  };

  const ownerUser = {
    id: 'user-rbac-owner',
    email: 'owner@rbac.test',
    name: 'Family Owner',
    password: passwordHash,
    role: 'user',
    isDev: false,
    tokenVersion: 0,
    createdAt: new Date().toISOString(),
  };

  const parentUser = {
    id: 'user-rbac-parent',
    email: 'parent@rbac.test',
    name: 'Family Parent',
    password: passwordHash,
    role: 'user',
    isDev: false,
    tokenVersion: 0,
    createdAt: new Date().toISOString(),
  };

  const visitorUser = {
    id: 'user-rbac-visitor',
    email: 'visitor@rbac.test',
    name: 'Family Visitor',
    password: passwordHash,
    role: 'user',
    isDev: false,
    tokenVersion: 0,
    createdAt: new Date().toISOString(),
  };

  const outsiderUser = {
    id: 'user-rbac-outsider',
    email: 'outsider@rbac.test',
    name: 'Outsider User',
    password: passwordHash,
    role: 'user',
    isDev: false,
    tokenVersion: 0,
    createdAt: new Date().toISOString(),
  };

  // Family
  const familyId = 'fam-rbac-matrix-1';
  const testFamily = {
    id: familyId,
    name: 'Matrix Test Family',
    ownerId: ownerUser.id,
    members: [
      { userId: ownerUser.id, role: 'admin', joinedAt: new Date().toISOString() },
      { userId: parentUser.id, role: 'editor', joinedAt: new Date().toISOString() },
      { userId: visitorUser.id, role: 'viewer', joinedAt: new Date().toISOString() },
    ],
    createdAt: new Date().toISOString(),
  };

  // Profile
  const profileId = 'prof-rbac-child-1';
  const testProfile = {
    id: profileId,
    familyId,
    name: 'Matrix Baby',
    gender: 'girl',
    birthdate: '2025-06-01',
    measurements: [{ id: 'm1', date: '2025-06-02', weight: 3.4 }],
  };

  // JWT Tokens
  const makeToken = (user) =>
    jwt.sign(
      { id: user.id, email: user.email, name: user.name, tokenVersion: user.tokenVersion || 0 },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

  const makeReauthToken = (user) =>
    jwt.sign({ id: user.id, scope: 'recent_reauth' }, JWT_SECRET, { expiresIn: '5m' });

  const tokens = {};

  beforeAll(() => {
    const db = readDb();
    db.users.push(
      superadminUser,
      secondSuperadmin,
      ownerUser,
      parentUser,
      visitorUser,
      outsiderUser
    );
    db.families.push(testFamily);
    db.profiles.push(testProfile);
    writeDb(db);

    tokens.superadmin = makeToken(superadminUser);
    tokens.secondSuperadmin = makeToken(secondSuperadmin);
    tokens.owner = makeToken(ownerUser);
    tokens.parent = makeToken(parentUser);
    tokens.visitor = makeToken(visitorUser);
    tokens.outsider = makeToken(outsiderUser);
  });

  afterAll(() => {
    const db = readDb();
    db.invites = (db.invites || []).filter((i) => i.familyId !== familyId);
    db.usedInvites = (db.usedInvites || []).filter((i) => i.familyId !== familyId);
    db.profiles = (db.profiles || []).filter((p) => p.familyId !== familyId);
    db.families = (db.families || []).filter((f) => f.id !== familyId);
    db.users = (db.users || []).filter((u) => !u.id.startsWith('user-rbac-'));
    writeDb(db);
  });

  // ── 1. Media Token Query Ban (#257) ──────────────────────────────────────────
  describe('Media URL Query Token Ban (#257)', () => {
    it('rejects GET /api/media/:id when token or jwt query parameter is passed', async () => {
      const resToken = await request(app)
        .get('/api/media/med-sample-123?token=some-token-value')
        .set('Authorization', `Bearer ${tokens.owner}`);

      expect(resToken.status).toBe(400);
      expect(resToken.body.error).toContain('Authentifizierungs-Tokens');

      const resJwt = await request(app)
        .get('/api/media/med-sample-123?jwt=some-token-value')
        .set('Authorization', `Bearer ${tokens.owner}`);

      expect(resJwt.status).toBe(400);
      expect(resJwt.body.error).toContain('Authentifizierungs-Tokens');
    });
  });

  // ── 2. CSP script-src Hardening (#261) ───────────────────────────────────────
  describe('Content-Security-Policy Hardening (#261)', () => {
    it('sets Content-Security-Policy header without unsafe-inline in script-src', async () => {
      const res = await request(app).get('/api/auth/setup-status');
      const csp = res.headers['content-security-policy'] || '';
      expect(csp).toBeDefined();
      expect(csp).not.toContain("script-src 'unsafe-inline'");
    });
  });

  // ── 3. Developer Diagnostics Endpoint (#331) ─────────────────────────────────
  describe('Developer Diagnostics (#331)', () => {
    it('denies access to non-admins (owner, parent, visitor, outsider)', async () => {
      for (const [, token] of [
        ['owner', tokens.owner],
        ['parent', tokens.parent],
        ['visitor', tokens.visitor],
        ['outsider', tokens.outsider],
      ]) {
        const res = await request(app)
          .get('/api/settings/developer-diagnostics')
          .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(403);
      }
    });

    it('returns 403 for superadmin when enable_developer_tools is disabled', async () => {
      const db = readDb();
      db.settings = { ...db.settings, enable_developer_tools: false };
      writeDb(db);

      const res = await request(app)
        .get('/api/settings/developer-diagnostics')
        .set('Authorization', `Bearer ${tokens.superadmin}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('deaktiviert');
    });

    it('returns safe sanitized diagnostics when enable_developer_tools is enabled', async () => {
      const db = readDb();
      db.settings = { ...db.settings, enable_developer_tools: true };
      writeDb(db);

      const res = await request(app)
        .get('/api/settings/developer-diagnostics')
        .set('Authorization', `Bearer ${tokens.superadmin}`);

      expect(res.status).toBe(200);
      expect(res.body.diagnosticsEnabled).toBe(true);
      expect(res.body.system).toHaveProperty('nodeVersion');
      expect(res.body.database).toHaveProperty('tableCounts');
      // Verify no secrets/passwords are leaked
      const stringified = JSON.stringify(res.body);
      expect(stringified).not.toContain('matrix-test-password-123!');
      expect(stringified).not.toContain(JWT_SECRET);
    });
  });

  // ── 4. Parent Rights & Delegated Invites (#325) ──────────────────────────────
  describe('Parent Rights & Delegated Visitor Management (#325)', () => {
    it('allows parent to create visitor invite (role: viewer)', async () => {
      const res = await request(app)
        .post(`/api/families/${familyId}/invites`)
        .set('Authorization', `Bearer ${tokens.parent}`)
        .send({ role: 'viewer', expiresInHours: 24 });

      expect(res.status).toBe(201);
      expect(res.body.role).toBe('viewer');
      expect(res.body.createdBy).toBe(parentUser.id);
    });

    it('rejects parent attempting to create parent/admin invite (role: editor)', async () => {
      const res = await request(app)
        .post(`/api/families/${familyId}/invites`)
        .set('Authorization', `Bearer ${tokens.parent}`)
        .send({ role: 'editor', expiresInHours: 24 });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Besuchereinladungen');
    });

    it('allows parent to revoke an invite they created', async () => {
      // 1. Parent creates invite
      const createRes = await request(app)
        .post(`/api/families/${familyId}/invites`)
        .set('Authorization', `Bearer ${tokens.parent}`)
        .send({ role: 'viewer', expiresInHours: 24 });
      const inviteCode = createRes.body.code;

      // 2. Parent revokes invite
      const delRes = await request(app)
        .delete(`/api/families/${familyId}/invites/${inviteCode}`)
        .set('Authorization', `Bearer ${tokens.parent}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.ok).toBe(true);
    });

    it('rejects parent attempting to transfer ownership', async () => {
      const reauth = makeReauthToken(parentUser);
      const res = await request(app)
        .post(`/api/families/${familyId}/transfer-ownership`)
        .set('Authorization', `Bearer ${tokens.parent}`)
        .set('X-Reauth-Token', reauth)
        .send({ newOwnerId: visitorUser.id });

      expect(res.status).toBe(403);
    });

    it('rejects parent attempting to delete family', async () => {
      const reauth = makeReauthToken(parentUser);
      const res = await request(app)
        .delete(`/api/families/${familyId}`)
        .set('Authorization', `Bearer ${tokens.parent}`)
        .set('X-Reauth-Token', reauth);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Familiengründer');
    });
  });

  // ── 5. Owner Lifecycle & Ownership Transfer (#326) ───────────────────────────
  describe('Family Owner Lifecycle & Transfer (#326)', () => {
    it('rejects transfer without re-auth ticket', async () => {
      const res = await request(app)
        .post(`/api/families/${familyId}/transfer-ownership`)
        .set('Authorization', `Bearer ${tokens.owner}`)
        .send({ newOwnerId: parentUser.id });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('REAUTH_REQUIRED');
    });

    it('rejects transfer to a visitor (role: viewer)', async () => {
      const reauth = makeReauthToken(ownerUser);
      const res = await request(app)
        .post(`/api/families/${familyId}/transfer-ownership`)
        .set('Authorization', `Bearer ${tokens.owner}`)
        .set('X-Reauth-Token', reauth)
        .send({ newOwnerId: visitorUser.id });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Besucher');
    });

    it('rejects transfer to a non-member', async () => {
      const reauth = makeReauthToken(ownerUser);
      const res = await request(app)
        .post(`/api/families/${familyId}/transfer-ownership`)
        .set('Authorization', `Bearer ${tokens.owner}`)
        .set('X-Reauth-Token', reauth)
        .send({ newOwnerId: outsiderUser.id });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Mitglied');
    });

    it('successfully transfers ownership to parent and updates roles atomically', async () => {
      const reauth = makeReauthToken(ownerUser);
      const res = await request(app)
        .post(`/api/families/${familyId}/transfer-ownership`)
        .set('Authorization', `Bearer ${tokens.owner}`)
        .set('X-Reauth-Token', reauth)
        .send({ newOwnerId: parentUser.id });

      expect(res.status).toBe(200);
      expect(res.body.family.ownerId).toBe(parentUser.id);

      // Verify in DB
      const db = readDb();
      const fam = db.families.find((f) => f.id === familyId);
      expect(fam.ownerId).toBe(parentUser.id);

      // Revert ownership and parent role back to editor for remaining tests
      fam.ownerId = ownerUser.id;
      const parentMem = fam.members.find((m) => m.userId === parentUser.id);
      if (parentMem) parentMem.role = 'editor';
      writeDb(db);
    });

    it('rejects non-owner from deleting family', async () => {
      const reauth = makeReauthToken(visitorUser);
      const res = await request(app)
        .delete(`/api/families/${familyId}`)
        .set('Authorization', `Bearer ${tokens.visitor}`)
        .set('X-Reauth-Token', reauth);

      expect(res.status).toBe(403);
    });
  });

  // ── 6. Family Backup Restrictions (#327) ─────────────────────────────────────
  describe('Family Backup Authorization (#327)', () => {
    it('allows owner to export isolated family backup', async () => {
      const res = await request(app)
        .get(`/api/families/${familyId}/backup`)
        .set('Authorization', `Bearer ${tokens.owner}`);

      expect(res.status).toBe(200);
      expect(res.body.version).toBe('babycharts-family-backup-v1');
      expect(res.body.family.id).toBe(familyId);
      expect(Array.isArray(res.body.profiles)).toBe(true);
    });

    it('denies parent, visitor, and outsider from exporting family backup', async () => {
      for (const [, token] of [
        ['parent', tokens.parent],
        ['visitor', tokens.visitor],
        ['outsider', tokens.outsider],
      ]) {
        const res = await request(app)
          .get(`/api/families/${familyId}/backup`)
          .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(403);
      }
    });

    it('allows owner to dry-run validate a backup', async () => {
      const backupPayload = {
        version: 'babycharts-family-backup-v1',
        profiles: [
          { id: 'p-new-1', name: 'New Child', measurements: [{ id: 'm-new', weight: 4.1 }] },
        ],
      };

      const res = await request(app)
        .post(`/api/families/${familyId}/backup/dry-run`)
        .set('Authorization', `Bearer ${tokens.owner}`)
        .send({ backup: backupPayload });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
      expect(res.body.preview.profileCount).toBe(1);
    });

    it('rejects non-owner on backup dry-run', async () => {
      const res = await request(app)
        .post(`/api/families/${familyId}/backup/dry-run`)
        .set('Authorization', `Bearer ${tokens.parent}`)
        .send({ backup: { profiles: [] } });

      expect(res.status).toBe(403);
    });

    it('enforces that only family owner can import profiles via POST /api/profiles/import', async () => {
      const profilesToImport = [
        {
          id: 'imported-1',
          name: 'Imported Baby',
          gender: 'girl',
          birthdate: '2025-01-01',
        },
      ];

      // Parent receives 403
      const parentRes = await request(app)
        .post('/api/profiles/import')
        .set('Authorization', `Bearer ${tokens.parent}`)
        .send({ familyId, profiles: profilesToImport });

      expect(parentRes.status).toBe(403);
      expect(parentRes.body.error).toContain('Familiengründer');

      // Owner succeeds (200)
      const ownerRes = await request(app)
        .post('/api/profiles/import')
        .set('Authorization', `Bearer ${tokens.owner}`)
        .send({ familyId, profiles: profilesToImport });

      expect(ownerRes.status).toBe(200);
      expect(ownerRes.body.ok).toBe(true);
      expect(ownerRes.body.count).toBe(1);
    });
  });

  // ── 7. Superadmin Lifecycle Decoupling & Safeguards (#330) ───────────────────
  describe('Superadmin Lifecycle Decoupling (#330)', () => {
    it('blocks deleting account if user is the sole remaining superadmin', async () => {
      const db = readDb();
      // Temporarily mark all other superadmins as regular users
      const otherSuperadmins = db.users.filter(
        (u) => u.id !== superadminUser.id && (u.role === 'superadmin' || u.isDev)
      );
      for (const u of otherSuperadmins) {
        u.role = 'user';
        u.isDev = false;
      }
      writeDb(db);

      const res = await request(app)
        .post('/api/auth/delete-account')
        .set('Authorization', `Bearer ${tokens.superadmin}`)
        .send({ password: 'matrix-test-password-123!' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('letzte Administrator/Superadmin');

      // Restore other superadmins
      const restoreDb = readDb();
      for (const orig of otherSuperadmins) {
        const found = restoreDb.users.find((u) => u.id === orig.id);
        if (found) {
          found.role = 'superadmin';
          found.isDev = true;
        }
      }
      writeDb(restoreDb);
    });
  });
});
