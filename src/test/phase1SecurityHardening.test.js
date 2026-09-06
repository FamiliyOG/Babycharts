/**
 * src/test/phase1SecurityHardening.test.js
 * Test suite for Phase 1: Security, Auth & Instance Hardening
 * - Issue #259: Mandatory One-Time First-Run Setup Mode
 * - Issue #260: Default Public Registration to False
 * - Issue #266: Modern Backup Key Derivation with scrypt & Backwards Compatibility
 * - Issue #329: Typed Instance Settings Catalog & Whitelist Validation
 * - Issue #332: Superadmin Privacy Isolation & Audited Break-Glass Emergency Access
 */

import crypto from 'node:crypto';
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../server/index.js';
import { readDb, writeDb, sqlite } from '../../server/utils/db.js';
import { JWT_SECRET } from '../../server/middleware/auth.js';
import { encryptBackupNode, decryptBackupNode } from '../../server/services/backupCryptoService.js';
import { getOrGenerateSetupToken } from '../../server/routes/auth.js';

describe('Phase 1: Security, Auth & Instance Hardening (#259, #260, #266, #329, #332)', () => {
  // ── 1. Settings Catalog & Whitelist (#329) & Default False (#260) ───────────
  describe('Settings Catalog & Whitelist (#260, #329)', () => {
    it('GET /api/settings/public returns allow_public_registration boolean defaulting to false or database state', async () => {
      const res = await request(app).get('/api/settings/public');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('allow_public_registration');
      expect(typeof res.body.allow_public_registration).toBe('boolean');
    });

    it('POST /api/settings rejects unknown keys not registered in catalog (#329)', async () => {
      const adminToken = jwt.sign(
        { id: 'admin-test-p1', email: 'admin@p1.test', role: 'superadmin' },
        JWT_SECRET
      );

      // Temporarily insert admin user
      const db = readDb();
      db.users.push({
        id: 'admin-test-p1',
        email: 'admin@p1.test',
        name: 'Admin P1',
        role: 'superadmin',
        isDev: true,
        password: 'hashed-pw',
        createdAt: new Date().toISOString(),
      });
      writeDb(db);

      const res = await request(app)
        .post('/api/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          invalid_custom_key_x: 'some-value',
          allow_public_registration: true,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Validierungsfehler');
      expect(res.body.details?.[0]).toContain('invalid_custom_key_x');

      // Valid update with only registered keys succeeds
      const validRes = await request(app)
        .post('/api/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          allow_public_registration: false,
        });

      expect(validRes.status).toBe(200);
      expect(validRes.body.allow_public_registration).toBe(false);

      // Cleanup admin user
      const updatedDb = readDb();
      updatedDb.users = updatedDb.users.filter((u) => u.id !== 'admin-test-p1');
      writeDb(updatedDb);
    });
  });

  // ── 2. Mandatory First-Run Setup Mode (#259) ────────────────────────────────
  describe('First-Run Setup Mode (#259)', () => {
    it('provides setup-status endpoint indicating if setup is required', async () => {
      const res = await request(app).get('/api/auth/setup-status');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('setupRequired');
      expect(typeof res.body.setupRequired).toBe('boolean');
    });

    it('generates and persists setup_token when no users exist', () => {
      const db = readDb();
      const initialUsers = [...db.users];
      db.users = [];

      const token = getOrGenerateSetupToken(db);
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThanOrEqual(16);

      // Restore users
      db.users = initialUsers;
      writeDb(db);
    });
  });

  // ── 3. Modern Backup KDF with scrypt & Backwards Compatibility (#266) ───────
  describe('Backup KDF Modernization (#266)', () => {
    const testPayload = { profile: 'Backup Test Infant', birthdate: '2025-03-01' };
    const passphrase = 'MySuperSecurePassphrase!2026';

    it('encrypts backup using babycharts-enc-v2 with scrypt KDF', () => {
      const encrypted = encryptBackupNode(testPayload, passphrase);
      expect(encrypted.version).toBe('babycharts-enc-v2');
      expect(encrypted.kdf).toBe('scrypt');
      expect(encrypted.algorithm).toBe('AES-256-GCM');
      expect(encrypted.scryptParams).toBeDefined();

      const decrypted = decryptBackupNode(encrypted, passphrase);
      expect(decrypted).toEqual(testPayload);
    });

    it('seamlessly decrypts legacy babycharts-enc-v1 PBKDF2 backups', () => {
      const salt = crypto.randomBytes(16);
      const iv = crypto.randomBytes(12);
      const key = crypto.pbkdf2Sync(passphrase, salt, 100000, 32, 'sha256');
      const plaintext = Buffer.from(JSON.stringify(testPayload), 'utf8');
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
      const authTag = cipher.getAuthTag();

      const legacyEnc = {
        version: 'babycharts-enc-v1',
        algorithm: 'AES-256-GCM',
        kdf: 'PBKDF2-SHA256',
        iterations: 100000,
        salt: salt.toString('hex'),
        iv: iv.toString('hex'),
        data: Buffer.concat([enc, authTag]).toString('hex'),
        createdAt: new Date().toISOString(),
      };

      const decrypted = decryptBackupNode(legacyEnc, passphrase);
      expect(decrypted).toEqual(testPayload);
    });
  });

  // ── 4. Superadmin Privacy Isolation & Audited Break-Glass Access (#332) ─────
  describe('Superadmin Privacy Isolation & Break-Glass Access (#332)', () => {
    it('isolates family data: superadmin without membership or emergency grant cannot access family', async () => {
      const ownerId = `user-${Date.now()}-owner`;
      const familyId = `fam-${Date.now()}-iso`;
      const superadminId = `user-${Date.now()}-superadmin`;

      // Insert owner user and superadmin into SQLite
      sqlite
        .prepare(
          `INSERT INTO users (id, email, password, name, role, isDev, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          ownerId,
          `${ownerId}@example.com`,
          'hash',
          'Owner',
          'user',
          0,
          new Date().toISOString()
        );

      sqlite
        .prepare(
          `INSERT INTO users (id, email, password, name, role, isDev, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          superadminId,
          `${superadminId}@example.com`,
          'hash',
          'Superadmin',
          'superadmin',
          1,
          new Date().toISOString()
        );

      // Insert private family and owner membership into SQLite
      sqlite
        .prepare(
          `INSERT INTO families (id, name, ownerId, createdAt)
           VALUES (?, ?, ?, ?)`
        )
        .run(familyId, 'Private Family', ownerId, new Date().toISOString());

      sqlite
        .prepare(
          `INSERT INTO family_members (familyId, userId, role, joinedAt)
           VALUES (?, ?, ?, ?)`
        )
        .run(familyId, ownerId, 'admin', new Date().toISOString());

      const superadminToken = jwt.sign(
        { id: superadminId, email: `${superadminId}@example.com`, role: 'superadmin' },
        JWT_SECRET
      );

      // Access without emergency grant should be strictly FORBIDDEN (403)
      const resForbidden = await request(app)
        .put(`/api/families/${familyId}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ name: 'Hacked Family Name' });

      expect(resForbidden.status).toBe(403);
      expect(resForbidden.body.error).toContain('Zugriff verweigert');

      // Re-authentication ticket (scope: recent_reauth, Issue #333)
      const reauthToken = jwt.sign({ id: superadminId, scope: 'recent_reauth' }, JWT_SECRET, {
        expiresIn: '5m',
      });

      // Attempt break-glass without reauth header fails (403 REAUTH_REQUIRED)
      const noReauthRes = await request(app)
        .post(`/api/families/${familyId}/emergency-access`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          reason: 'Valid reason without reauth ticket.',
        });
      expect(noReauthRes.status).toBe(403);
      expect(noReauthRes.body.code).toBe('REAUTH_REQUIRED');

      // Attempt break-glass with empty/short reason fails with 400
      const failGrantRes = await request(app)
        .post(`/api/families/${familyId}/emergency-access`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .set('X-Reauth-Token', reauthToken)
        .send({ reason: 'short' });

      expect(failGrantRes.status).toBe(400);

      // Valid break-glass emergency access grant
      const grantRes = await request(app)
        .post(`/api/families/${familyId}/emergency-access`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .set('X-Reauth-Token', reauthToken)
        .send({
          reason: 'Medical technical support ticket #9872 required urgent schema validation.',
          durationMinutes: 30,
        });

      expect(grantRes.status).toBe(201);
      expect(grantRes.body.ok).toBe(true);
      expect(grantRes.body.grant.familyId).toBe(familyId);

      // Now, with active emergency grant, access is allowed
      const accessRes = await request(app)
        .put(`/api/families/${familyId}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ name: 'Updated Under Emergency Care' });

      expect(accessRes.status).toBe(200);
      expect(accessRes.body.family.name).toBe('Updated Under Emergency Care');

      // Cleanup
      sqlite.prepare('DELETE FROM emergency_access WHERE familyId = ?').run(familyId);
      sqlite.prepare('DELETE FROM family_members WHERE familyId = ?').run(familyId);
      sqlite.prepare('DELETE FROM families WHERE id = ?').run(familyId);
      sqlite.prepare('DELETE FROM users WHERE id IN (?, ?)').run(ownerId, superadminId);
    });
  });
});
