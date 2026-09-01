import crypto from 'node:crypto';
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../server/index.js';
import { readDb, writeDb } from '../../server/utils/db.js';

describe('Auth & Password-Reset Comprehensive Test Suite (BC-081, BC-082)', () => {
  const getRand = (prefix) => `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
  const getRandPass = () => `TstP@ss!_${crypto.randomBytes(6).toString('hex')}`;

  it('registers a user successfully and returns valid auth token and profile', async () => {
    const email = `${getRand('reg_user')}@example.com`;
    const password = getRandPass();
    const name = 'Test Register User';

    const res = await request(app).post('/api/auth/register').send({
      name,
      email,
      password,
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.name).toBe(name);
  });

  it('rejects registration with duplicate email address', async () => {
    const email = `${getRand('dup_user')}@example.com`;
    const password = getRandPass();

    // First registration
    const res1 = await request(app).post('/api/auth/register').send({
      name: 'User One',
      email,
      password,
    });
    expect(res1.status).toBe(201);

    // Second registration with same email
    const res2 = await request(app).post('/api/auth/register').send({
      name: 'User Two',
      email,
      password,
    });
    expect(res2.status).toBe(400);
    expect(res2.body.error).toContain('bereits registriert');
  });

  it('authenticates user with correct credentials and returns JWT token', async () => {
    const email = `${getRand('login_user')}@example.com`;
    const password = getRandPass();

    await request(app).post('/api/auth/register').send({
      name: 'Login Test',
      email,
      password,
    });

    const res = await request(app).post('/api/auth/login').send({
      email,
      password,
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(email);
  });

  it('rejects login with wrong password', async () => {
    const email = `${getRand('wrong_pwd')}@example.com`;
    const password = getRandPass();

    await request(app).post('/api/auth/register').send({
      name: 'Wrong Pwd Test',
      email,
      password,
    });

    const res = await request(app).post('/api/auth/login').send({
      email,
      password: getRandPass(),
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('nicht korrekt');
  });

  it('executes full password reset flow: request reset token, reset password, verify new password login (BC-082)', async () => {
    const email = `${getRand('reset_flow')}@example.com`;
    const initialPassword = getRandPass();
    const newPassword = getRandPass();

    // 1. Register User
    const regRes = await request(app).post('/api/auth/register').send({
      name: 'Reset Flow User',
      email,
      password: initialPassword,
    });
    expect(regRes.status).toBe(201);

    // 2. Prepare mock reset token in database
    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawResetToken).digest('hex');

    const db = readDb();
    const userInDb = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    expect(userInDb).toBeDefined();
    userInDb.passwordResetTokenHash = tokenHash;
    userInDb.passwordResetExpires = Date.now() + 3600000;
    writeDb(db);

    // 3. Submit password reset with the valid raw token
    const resetRes = await request(app).post('/api/auth/reset-password').send({
      token: rawResetToken,
      newPassword,
    });
    expect(resetRes.status).toBe(200);
    expect(resetRes.body.message).toContain('erfolgreich');

    // 4. Verify user can now log in with the new password
    const loginRes = await request(app).post('/api/auth/login').send({
      email,
      password: newPassword,
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();

    // 5. Verify old password no longer works
    const oldLoginRes = await request(app).post('/api/auth/login').send({
      email,
      password: initialPassword,
    });
    expect(oldLoginRes.status).toBe(401);
  });

  it('rejects password reset with expired token', async () => {
    const email = `${getRand('expired_reset')}@example.com`;
    const password = getRandPass();

    const regRes = await request(app).post('/api/auth/register').send({
      name: 'Expired Reset User',
      email,
      password,
    });
    expect(regRes.status).toBe(201);

    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawResetToken).digest('hex');

    const db = readDb();
    const userInDb = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    expect(userInDb).toBeDefined();
    userInDb.passwordResetTokenHash = hashedToken;
    userInDb.passwordResetExpires = Date.now() - 3600000; // Expired 1 hour ago
    writeDb(db);

    const resetRes = await request(app).post('/api/auth/reset-password').send({
      token: rawResetToken,
      newPassword: getRandPass(),
    });

    expect(resetRes.status).toBe(400);
    expect(resetRes.body.error).toContain('abgelaufen');
  });

  it('allows authenticated user to change password via /api/auth/change-password', async () => {
    const email = `${getRand('chg_pwd')}@example.com`;
    const oldPassword = getRandPass();
    const newPassword = getRandPass();

    const regRes = await request(app).post('/api/auth/register').send({
      name: 'Change Pwd User',
      email,
      password: oldPassword,
    });
    expect(regRes.status).toBe(201);

    const loginRes = await request(app).post('/api/auth/login').send({
      email,
      password: oldPassword,
    });
    expect(loginRes.status).toBe(200);
    const token = loginRes.body.token;

    const changeRes = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: oldPassword,
        newPassword,
      });

    expect(changeRes.status).toBe(200);
    expect(changeRes.body.message).toContain('erfolgreich');

    // Login with new password
    const newLoginRes = await request(app).post('/api/auth/login').send({
      email,
      password: newPassword,
    });
    expect(newLoginRes.status).toBe(200);
  });

  it('exports all personal data for authenticated user via GET /api/auth/export-my-data (BC-207)', async () => {
    const email = `${getRand('exp_user')}@example.com`;
    const password = getRandPass();

    const regRes = await request(app).post('/api/auth/register').send({
      name: 'Export Test User',
      email,
      password,
    });
    expect(regRes.status).toBe(201);
    const token = regRes.body.token;

    const exportRes = await request(app)
      .get('/api/auth/export-my-data')
      .set('Authorization', `Bearer ${token}`);

    expect(exportRes.status).toBe(200);
    expect(exportRes.body.account).toBeDefined();
    expect(exportRes.body.account.email).toBe(email);
    expect(exportRes.body.families).toBeInstanceOf(Array);
    expect(exportRes.body.profiles).toBeInstanceOf(Array);
  });

  it('completely deletes user account and revokes session via DELETE /api/auth/account (BC-206)', async () => {
    const email = `${getRand('del_user')}@example.com`;
    const password = getRandPass();

    const regRes = await request(app).post('/api/auth/register').send({
      name: 'Delete Test User',
      email,
      password,
    });
    expect(regRes.status).toBe(201);
    const token = regRes.body.token;

    // Wrong password should fail
    const failRes = await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'WrongPassword123!' });
    expect(failRes.status).toBe(400);

    // Correct password succeeds
    const delRes = await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${token}`)
      .send({ password });
    expect(delRes.status).toBe(200);
    expect(delRes.body.ok).toBe(true);

    // After deletion, old token is invalid
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(meRes.status).toBe(401);
  });
});
