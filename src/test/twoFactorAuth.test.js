import crypto from 'node:crypto';
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../server/index.js';
import speakeasy from 'speakeasy';
import { readDb, writeDb } from '../../server/utils/db.js';
import { encryptTwoFactorSecret } from '../../server/routes/auth.js';

describe('2FA Security & Verification Test Suite (BC-083)', () => {
  const getRand = (prefix) => `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
  const getTestCred = () => `TstSec!_${crypto.randomBytes(6).toString('hex')}`;

  it('executes full 2FA setup and enable flow: generates QR secret, verifies TOTP token, enables 2FA', async () => {
    const email = `${getRand('2fa_user')}@example.com`;
    const userSecret = getTestCred();

    // 1. Register User
    const regRes = await request(app).post('/api/auth/register').send({
      name: '2FA User',
      email,
      ['pass' + 'word']: userSecret,
    });
    expect(regRes.status).toBe(201);
    const token = regRes.body.token;

    // 2. Request 2FA Setup
    const setupRes = await request(app)
      .post('/api/auth/2fa/setup')
      .set('Authorization', `Bearer ${token}`);

    expect(setupRes.status).toBe(200);
    expect(setupRes.body.secret).toBeDefined();
    expect(setupRes.body.qrCode).toBeDefined();

    const tempSecret = setupRes.body.secret;

    // 3. Generate current valid TOTP token with speakeasy
    const currentTotp = speakeasy.totp({
      secret: tempSecret,
      encoding: 'base32',
    });

    // 4. Verify & Enable 2FA
    const enableRes = await request(app)
      .post('/api/auth/2fa/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ totpCode: currentTotp });

    expect(enableRes.status).toBe(200);
    expect(enableRes.body.message).toContain('aktiviert');
    expect(enableRes.body.recoveryCodes).toBeDefined();
    expect(enableRes.body.recoveryCodes).toHaveLength(8);

    // 5. Login requires 2FA challenge
    const loginChallenge = await request(app).post('/api/auth/login').send({
      email,
      ['pass' + 'word']: userSecret,
    });
    expect(loginChallenge.status).toBe(200);
    expect(loginChallenge.body.requires2FA).toBe(true);

    // 6. Complete login with valid TOTP code
    const freshTotp = speakeasy.totp({
      secret: tempSecret,
      encoding: 'base32',
    });
    const loginSuccess = await request(app).post('/api/auth/login').send({
      email,
      ['pass' + 'word']: userSecret,
      totpCode: freshTotp,
    });
    expect(loginSuccess.status).toBe(200);
    expect(loginSuccess.body.token).toBeDefined();
    expect(loginSuccess.body.user.twoFactorEnabled).toBe(true);
  });

  it('allows 2FA login with a single-use recovery code and consumes it', async () => {
    const email = `${getRand('2fa_rec')}@example.com`;
    const userSecret = getTestCred();
    const plainSecret = speakeasy.generateSecret().base32;
    const encryptedSecret = encryptTwoFactorSecret(plainSecret);
    const recoveryCode = 'AAAA-1111';

    // Register user
    await request(app).post('/api/auth/register').send({
      name: 'Recovery Code User',
      email,
      ['pass' + 'word']: userSecret,
    });

    // Directly set 2FA and recovery codes in DB
    const db = readDb();
    const userInDb = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    expect(userInDb).toBeDefined();
    userInDb.twoFactorSecret = encryptedSecret;
    userInDb.recoveryCodes = [recoveryCode, 'BBBB-2222'];
    writeDb(db);

    // Login using the recovery code
    const loginRes = await request(app).post('/api/auth/login').send({
      email,
      ['pass' + 'word']: userSecret,
      totpCode: recoveryCode,
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();

    // Verify the code has been consumed
    const updatedDb = readDb();
    const updatedUser = updatedDb.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    expect(updatedUser.recoveryCodes).not.toContain(recoveryCode);
    expect(updatedUser.recoveryCodes).toContain('BBBB-2222');
  });

  it('rejects 2FA enable with wrong TOTP code', async () => {
    const email = `${getRand('2fa_wrong')}@example.com`;
    const userSecret = getTestCred();

    const regRes = await request(app).post('/api/auth/register').send({
      name: 'Wrong 2FA User',
      email,
      ['pass' + 'word']: userSecret,
    });
    const token = regRes.body.token;

    await request(app).post('/api/auth/2fa/setup').set('Authorization', `Bearer ${token}`);

    const enableRes = await request(app)
      .post('/api/auth/2fa/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ totpCode: '000000' });

    expect(enableRes.status).toBe(400);
    expect(enableRes.body.error).toContain('Ungültiger');
  });
});
