/**
 * server/repositories/userRepository.js
 * Encapsulated SQLite data access layer for Users.
 * Matches SQLite schema: id, email, password, name, avatar, isDev, role,
 * twoFactorSecret, tempTwoFactorSecret, tempTwoFactorExpires, recoveryCodes,
 * tokenVersion, passwordResetTokenHash, passwordResetExpires, language, sessions, createdAt, updatedAt.
 */

import { sqlite } from '../utils/db.js';

function mapUserRow(row) {
  if (!row) return null;
  let recoveryCodes = [];
  if (row.recoveryCodes) {
    try {
      recoveryCodes = JSON.parse(row.recoveryCodes);
    } catch {
      recoveryCodes = [];
    }
  }

  let sessions = [];
  if (row.sessions) {
    try {
      sessions = JSON.parse(row.sessions);
    } catch {
      sessions = [];
    }
  }

  return {
    ...row,
    isDev: Boolean(row.isDev),
    twoFactorEnabled: Boolean(row.twoFactorSecret),
    recoveryCodes,
    sessions,
  };
}

const findByIdStmt = sqlite.prepare('SELECT * FROM users WHERE id = ?');
const findByEmailStmt = sqlite.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)');
const findByResetTokenStmt = sqlite.prepare('SELECT * FROM users WHERE passwordResetTokenHash = ?');
const countUsersStmt = sqlite.prepare('SELECT COUNT(*) as count FROM users');
const countUsersByRoleStmt = sqlite.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?');
const listAllUsersStmt = sqlite.prepare('SELECT * FROM users ORDER BY createdAt ASC');

const insertUserStmt = sqlite.prepare(`
  INSERT INTO users (
    id, email, password, name, avatar, isDev, role,
    twoFactorSecret, tempTwoFactorSecret, tempTwoFactorExpires, recoveryCodes,
    tokenVersion, passwordResetTokenHash, passwordResetExpires, language,
    sessions, createdAt, updatedAt
  ) VALUES (
    @id, @email, @password, @name, @avatar, @isDev, @role,
    @twoFactorSecret, @tempTwoFactorSecret, @tempTwoFactorExpires, @recoveryCodes,
    @tokenVersion, @passwordResetTokenHash, @passwordResetExpires, @language,
    @sessions, @createdAt, @updatedAt
  )
`);

const deleteUserStmt = sqlite.prepare('DELETE FROM users WHERE id = ?');

export const userRepository = {
  findById(id) {
    if (!id) return null;
    return mapUserRow(findByIdStmt.get(id));
  },

  findByEmail(email) {
    if (!email) return null;
    return mapUserRow(findByEmailStmt.get(email.trim()));
  },

  findByResetToken(hashedToken) {
    if (!hashedToken) return null;
    return mapUserRow(findByResetTokenStmt.get(hashedToken));
  },

  count() {
    const result = countUsersStmt.get();
    return result?.count || 0;
  },

  countByRole(role) {
    const result = countUsersByRoleStmt.get(role);
    return result?.count || 0;
  },

  findAll() {
    return listAllUsersStmt.all().map(mapUserRow);
  },

  create(user) {
    const now = new Date().toISOString();
    const entity = {
      id: user.id,
      email: user.email.toLowerCase().trim(),
      password: user.password,
      name: user.name || user.username || user.email.split('@')[0],
      avatar: user.avatar || null,
      isDev: user.isDev ? 1 : 0,
      role: user.role || 'user',
      twoFactorSecret: user.twoFactorSecret || null,
      tempTwoFactorSecret: user.tempTwoFactorSecret || null,
      tempTwoFactorExpires: user.tempTwoFactorExpires || null,
      recoveryCodes: user.recoveryCodes ? JSON.stringify(user.recoveryCodes) : null,
      tokenVersion: user.tokenVersion || 0,
      passwordResetTokenHash: user.passwordResetTokenHash || null,
      passwordResetExpires: user.passwordResetExpires || null,
      language: user.language || 'de',
      sessions: user.sessions ? JSON.stringify(user.sessions) : '[]',
      createdAt: user.createdAt || now,
      updatedAt: user.updatedAt || now,
    };
    insertUserStmt.run(entity);
    return this.findById(user.id);
  },

  update(id, updates) {
    const current = this.findById(id);
    if (!current) return null;

    const merged = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const stmt = sqlite.prepare(`
      UPDATE users SET
        email = @email,
        password = @password,
        name = @name,
        avatar = @avatar,
        isDev = @isDev,
        role = @role,
        twoFactorSecret = @twoFactorSecret,
        tempTwoFactorSecret = @tempTwoFactorSecret,
        tempTwoFactorExpires = @tempTwoFactorExpires,
        recoveryCodes = @recoveryCodes,
        tokenVersion = @tokenVersion,
        passwordResetTokenHash = @passwordResetTokenHash,
        passwordResetExpires = @passwordResetExpires,
        language = @language,
        sessions = @sessions,
        updatedAt = @updatedAt
      WHERE id = @id
    `);

    stmt.run({
      id,
      email: merged.email.toLowerCase().trim(),
      password: merged.password,
      name: merged.name,
      avatar: merged.avatar || null,
      isDev: merged.isDev ? 1 : 0,
      role: merged.role,
      twoFactorSecret: merged.twoFactorSecret ?? null,
      tempTwoFactorSecret: merged.tempTwoFactorSecret ?? null,
      tempTwoFactorExpires: merged.tempTwoFactorExpires ?? null,
      recoveryCodes: merged.recoveryCodes ? JSON.stringify(merged.recoveryCodes) : null,
      tokenVersion: merged.tokenVersion ?? 0,
      passwordResetTokenHash: merged.passwordResetTokenHash ?? null,
      passwordResetExpires: merged.passwordResetExpires ?? null,
      language: merged.language || 'de',
      sessions: merged.sessions ? JSON.stringify(merged.sessions) : '[]',
      updatedAt: merged.updatedAt,
    });

    return this.findById(id);
  },

  updatePassword(id, hashedPassword, incrementTokenVersion = true) {
    const now = new Date().toISOString();
    if (incrementTokenVersion) {
      sqlite
        .prepare(
          'UPDATE users SET password = ?, tokenVersion = tokenVersion + 1, updatedAt = ? WHERE id = ?'
        )
        .run(hashedPassword, now, id);
    } else {
      sqlite
        .prepare('UPDATE users SET password = ?, updatedAt = ? WHERE id = ?')
        .run(hashedPassword, now, id);
    }
    return this.findById(id);
  },

  updateSessions(id, sessions) {
    const now = new Date().toISOString();
    sqlite
      .prepare('UPDATE users SET sessions = ?, updatedAt = ? WHERE id = ?')
      .run(JSON.stringify(sessions || []), now, id);
    return this.findById(id);
  },

  updateTwoFactor(id, { secret, recoveryCodes }) {
    const now = new Date().toISOString();
    sqlite
      .prepare(
        `
        UPDATE users SET
          twoFactorSecret = ?,
          recoveryCodes = ?,
          updatedAt = ?
        WHERE id = ?
      `
      )
      .run(secret, recoveryCodes ? JSON.stringify(recoveryCodes) : null, now, id);
    return this.findById(id);
  },

  setResetPasswordToken(id, hashedToken, expiresTimestamp) {
    const now = new Date().toISOString();
    sqlite
      .prepare(
        `
        UPDATE users SET
          passwordResetTokenHash = ?,
          passwordResetExpires = ?,
          updatedAt = ?
        WHERE id = ?
      `
      )
      .run(hashedToken, expiresTimestamp, now, id);
    return this.findById(id);
  },

  clearResetPasswordToken(id) {
    const now = new Date().toISOString();
    sqlite
      .prepare(
        `
        UPDATE users SET
          passwordResetTokenHash = NULL,
          passwordResetExpires = NULL,
          updatedAt = ?
        WHERE id = ?
      `
      )
      .run(now, id);
    return this.findById(id);
  },

  delete(id) {
    return deleteUserStmt.run(id);
  },
};
