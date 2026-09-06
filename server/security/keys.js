import crypto from 'node:crypto';
import { sqlite } from '../utils/db.js';

/**
 * server/security/keys.js
 * Centralized cryptographic key management enforcing strict separation of key duties (Issue #264).
 * Ensures that:
 * 1. JWT signing keys (JWT_SECRET)
 * 2. Database/2FA data encryption keys (DATA_ENCRYPTION_KEY)
 * 3. Media master encryption keys (MEDIA_MASTER_KEY)
 * are cryptographically independent and cannot cross-contaminate or fall back to one another.
 */

function getOrCreateSettingKey(settingKey, byteLength = 64) {
  try {
    const row = sqlite.prepare('SELECT value FROM settings WHERE key = ?').get(settingKey);
    if (row?.value) {
      return row.value;
    }
    const generated = crypto.randomBytes(byteLength).toString('hex');
    sqlite
      .prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
      .run(settingKey, generated);
    return generated;
  } catch {
    return crypto.randomBytes(byteLength).toString('hex');
  }
}

/**
 * 1. JWT Signing Key
 */
export function getJwtSecret() {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length > 0) {
    return process.env.JWT_SECRET.trim();
  }
  return getOrCreateSettingKey('jwt_secret', 64);
}

/**
 * 2. Data Encryption Key (for 2FA secrets, recovery codes)
 */
export function getDataEncryptionKey() {
  if (process.env.DATA_ENCRYPTION_KEY && process.env.DATA_ENCRYPTION_KEY.trim().length > 0) {
    return crypto.createHash('sha256').update(process.env.DATA_ENCRYPTION_KEY.trim()).digest();
  }
  const persistedHex = getOrCreateSettingKey('data_encryption_key', 32);
  return crypto.createHash('sha256').update(persistedHex).digest();
}

/**
 * 3. Media Master Encryption Key (for AES-256-GCM file storage)
 */
export function getMediaMasterKey() {
  if (process.env.MEDIA_ENCRYPTION_KEY && process.env.MEDIA_ENCRYPTION_KEY.trim().length > 0) {
    return crypto.createHash('sha256').update(process.env.MEDIA_ENCRYPTION_KEY.trim()).digest();
  }
  const persistedHex = getOrCreateSettingKey('media_master_key', 32);
  return Buffer.from(persistedHex, 'hex');
}
