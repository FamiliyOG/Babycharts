/**
 * src/test/phase3Features.test.js
 * Comprehensive integration test suite for P3 Features:
 * - Issue #250: AES-256-GCM Backup Encryption & Decryption with PBKDF2
 * - Issue #251: Doctor Mode clinical summary & data isolation
 * - Issue #252: Data source provenance and medical guidelines metadata
 * - Issue #253: Automated database & backup health diagnostic checks
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../server/index.js';
import { encryptBackupNode, decryptBackupNode } from '../../server/services/backupCryptoService.js';
import { checkDatabaseAndBackupHealth } from '../../server/services/healthCheckService.js';
import { getDataSource } from '../../src/utils/dataSourceMetadata.js';

describe('P3 Features & Diagnostics Test Suite (#250, #251, #252, #253)', () => {
  // ── 1. AES-256-GCM Encrypted Backups (#250) ──────────────────────────────────
  describe('AES-256-GCM Backup Encryption & Decryption (#250)', () => {
    const mockBackupData = [
      {
        id: 'child-enc-test',
        name: 'Mia Medizintest',
        birthdate: '2024-01-15',
        gender: 'girl',
        measurements: [{ date: '2024-02-15', weight: 4.5, length: 55, headCircumference: 37 }],
      },
    ];

    it('encrypts data object with passphrase into standard AES-256-GCM structure', () => {
      const encrypted = encryptBackupNode(mockBackupData, 'SuperSicherePassphrase123!');
      expect(encrypted).toHaveProperty('version', 'babycharts-enc-v1');
      expect(encrypted).toHaveProperty('algorithm', 'AES-256-GCM');
      expect(encrypted).toHaveProperty('kdf', 'PBKDF2-SHA256');
      expect(encrypted).toHaveProperty('salt');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('data');
      expect(typeof encrypted.data).toBe('string');
      expect(encrypted.data.length).toBeGreaterThan(32);
    });

    it('decrypts encrypted backup cleanly with the matching passphrase', () => {
      const passphrase = 'KlinischePassphrase!456';
      const encrypted = encryptBackupNode(mockBackupData, passphrase);
      const decrypted = decryptBackupNode(encrypted, passphrase);

      expect(decrypted).toEqual(mockBackupData);
      expect(decrypted[0].name).toBe('Mia Medizintest');
    });

    it('rejects decryption when wrong passphrase is provided', () => {
      const encrypted = encryptBackupNode(mockBackupData, 'KorrektesPasswort789');
      expect(() => {
        decryptBackupNode(encrypted, 'FalschesPasswort123');
      }).toThrow('Entschlüsselung fehlgeschlagen');
    });

    it('rejects empty or non-string passphrase', () => {
      expect(() => encryptBackupNode(mockBackupData, '')).toThrow('Passphrase erforderlich');
      expect(() => encryptBackupNode(mockBackupData, null)).toThrow('Passphrase erforderlich');
    });
  });

  // ── 2. Data Sources & Metadata Versioning (#252) ───────────────────────────
  describe('Data Source Metadata Versioning (#252)', () => {
    it('provides transparent metadata for WHO standards', () => {
      const who = getDataSource('WHO_GROWTH_STANDARDS');
      expect(who).toBeDefined();
      expect(who.publisher).toContain('World Health Organization');
      expect(who.version).toContain('2006');
    });

    it('provides transparent metadata for STIKO guidelines', () => {
      const stiko = getDataSource('STIKO_VACCINATIONS');
      expect(stiko).toBeDefined();
      expect(stiko.publisher).toContain('Robert Koch-Institut');
      expect(stiko.officialUrl).toBe('https://www.rki.de/stiko');
    });

    it('provides transparent metadata for U-Vorsorgeuntersuchungen', () => {
      const gba = getDataSource('GBA_U_CHECKUPS');
      expect(gba).toBeDefined();
      expect(gba.publisher).toContain('Gemeinsamer Bundesausschuss');
    });
  });

  // ── 3. Automated Backup & DB Health Diagnostics (#253) ──────────────────────
  describe('Automated Database & Backup Health Diagnostics (#253)', () => {
    it('runs SQLite integrity check and returns healthy diagnosis', () => {
      const health = checkDatabaseAndBackupHealth();
      expect(health).toHaveProperty('status');
      expect(['healthy', 'warning']).toContain(health.status);
      expect(health.stats).toHaveProperty('users');
      expect(health.stats).toHaveProperty('profiles');
      expect(health.stats).toHaveProperty('measurements');
      expect(Array.isArray(health.issues)).toBe(true);
    });

    it('exposes GET /api/exports/health endpoint requiring authentication', async () => {
      const unauthRes = await request(app).get('/api/exports/health');
      expect(unauthRes.status).toBe(401);

      // Authenticated request
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Health Admin',
          email: `health_admin_${Date.now()}@example.com`,
          password: 'SicherePassphrase!Health123',
        });

      const token = regRes.body.token;
      const authRes = await request(app)
        .get('/api/exports/health')
        .set('Authorization', `Bearer ${token}`);

      expect(authRes.status).toBe(200);
      expect(authRes.body).toHaveProperty('status');
      expect(authRes.body).toHaveProperty('healthy');
      expect(authRes.body).toHaveProperty('stats');
    });
  });
});
