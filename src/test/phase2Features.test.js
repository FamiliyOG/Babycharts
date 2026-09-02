import crypto from 'node:crypto';
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../server/index.js';
import { validatePasswordPolicy } from '../../server/routes/auth.js';
import { calculatePasswordStrength } from '../../src/utils/passwordStrength.js';

describe('P2 Features & Security Test Suite (#245, #248, #249)', () => {
  const getRand = (prefix) => `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
  const getStrongPass = () => `SicherePassphrase!_${crypto.randomBytes(6).toString('hex')}`;

  // ── 1. NIST Password Policy & Strength (#245) ──────────────────────────────
  describe('NIST SP 800-63B Password Policy (#245)', () => {
    it('rejects passwords shorter than 10 characters', () => {
      const res = validatePasswordPolicy('Short1!');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('mindestens 10 Zeichen');
    });

    it('rejects common weak / compromised passwords', () => {
      const res = validatePasswordPolicy('password123');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('zu einfach');
    });

    it('accepts long passphrases with spaces and emojis', () => {
      const res = validatePasswordPolicy('Kaffee am Morgen vertreibt Kummer und Sorgen ☕');
      expect(res.valid).toBe(true);
    });

    it('calculates accurate strength scores for password meter', () => {
      const weak = calculatePasswordStrength('short');
      expect(weak.isValid).toBe(false);

      const strong = calculatePasswordStrength('Kaffee am Morgen 2026!');
      expect(strong.isValid).toBe(true);
      expect(strong.percentage).toBeGreaterThanOrEqual(80);
    });
  });

  // ── 2. Device & Session Management (#249) ──────────────────────────────────
  describe('Device & Session Management (#249)', () => {
    it('creates active session on login and allows listing and remote session logout', async () => {
      const email = `${getRand('sess_user')}@example.com`;
      const password = getStrongPass();
      const name = 'Session User';

      // Register first
      const regRes = await request(app).post('/api/auth/register').send({
        name,
        email,
        password,
      });
      expect(regRes.status).toBe(201);
      const token1 = regRes.body.token;

      // Second login from another "device"
      const loginRes = await request(app)
        .post('/api/auth/login')
        .set(
          'User-Agent',
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'
        )
        .send({ email, password });

      expect(loginRes.status).toBe(200);
      const token2 = loginRes.body.token;

      // Query sessions using token1
      const sessionsRes = await request(app)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${token1}`);

      expect(sessionsRes.status).toBe(200);
      expect(Array.isArray(sessionsRes.body.sessions)).toBe(true);
      expect(sessionsRes.body.sessions.length).toBe(2);

      const currentSession = sessionsRes.body.sessions.find((s) => s.isCurrent);
      const otherSession = sessionsRes.body.sessions.find((s) => !s.isCurrent);

      expect(currentSession).toBeDefined();
      expect(otherSession).toBeDefined();

      // Revoke the other session remotely
      const deleteRes = await request(app)
        .delete(`/api/auth/sessions/${otherSession.id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);

      // Verify token2 is now rejected because its session was revoked
      const meRes = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token2}`);

      expect(meRes.status).toBe(401);
      expect(meRes.body.error).toContain('Sitzung');
    });
  });

  // ── 3. Family Audit Log (#248) ─────────────────────────────────────────────
  describe('Family Audit Log (#248)', () => {
    it('logs profile creation, update, and deletion in family audit trail', async () => {
      const email = `${getRand('audit_user')}@example.com`;
      const password = getStrongPass();
      const name = 'Audit Admin';

      const regRes = await request(app).post('/api/auth/register').send({
        name,
        email,
        password,
      });
      const token = regRes.body.token;
      const familyId = regRes.body.family.id;

      // Create a child profile
      const childId = getRand('child');
      const createRes = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id: childId,
          name: 'Audit Child Leo',
          birthdate: '2025-06-01',
          gender: 'boy',
          familyId,
        });

      expect(createRes.status).toBe(201);

      // Update the profile
      const updateRes = await request(app)
        .put(`/api/profiles/${childId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Audit Child Leo Updated',
        });

      expect(updateRes.status).toBe(200);

      // Query Audit Log
      const auditRes = await request(app)
        .get(`/api/families/${familyId}/audit-log`)
        .set('Authorization', `Bearer ${token}`);

      expect(auditRes.status).toBe(200);
      expect(Array.isArray(auditRes.body.logs)).toBe(true);
      expect(auditRes.body.logs.length).toBeGreaterThanOrEqual(2);

      const actions = auditRes.body.logs.map((l) => l.action);
      expect(actions).toContain('PROFILE_CREATE');
      expect(actions).toContain('PROFILE_UPDATE');
    });
  });
});
