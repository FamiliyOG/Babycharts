/**
 * server/services/backupCryptoService.js
 * Server-side AES-256-GCM encryption & decryption for BabyCharts backups (Issue #250).
 * Uses Node.js crypto module with PBKDF2.
 */

import crypto from 'node:crypto';

const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 32; // 256 bits
const SALT_BYTES = 16;
const IV_BYTES = 12;

/**
 * Derives key using PBKDF2.
 */
function deriveKeySync(passphrase, saltBuffer) {
  return crypto.pbkdf2Sync(passphrase, saltBuffer, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
}

/**
 * Encrypts a data object with AES-256-GCM.
 */
export function encryptBackupNode(data, passphrase) {
  if (!passphrase || typeof passphrase !== 'string') {
    throw new Error('Passphrase erforderlich für verschlüsseltes Backup.');
  }

  const salt = crypto.randomBytes(SALT_BYTES);
  const iv = crypto.randomBytes(IV_BYTES);
  const key = deriveKeySync(passphrase, salt);

  const plaintext = Buffer.from(JSON.stringify(data), 'utf8');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Combined ciphertext + authTag to match Web Crypto AES-GCM format
  const combined = Buffer.concat([encrypted, authTag]);

  return {
    version: 'babycharts-enc-v1',
    algorithm: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA256',
    iterations: PBKDF2_ITERATIONS,
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    data: combined.toString('hex'),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Decrypts an encrypted backup object with AES-256-GCM.
 */
export function decryptBackupNode(encryptedObj, passphrase) {
  if (
    !encryptedObj ||
    encryptedObj.version !== 'babycharts-enc-v1' ||
    encryptedObj.algorithm !== 'AES-256-GCM'
  ) {
    throw new Error('Ungültiges oder nicht unterstütztes Verschlüsselungsformat.');
  }

  if (!passphrase || typeof passphrase !== 'string') {
    throw new Error('Passphrase erforderlich zur Entschlüsselung.');
  }

  try {
    const salt = Buffer.from(encryptedObj.salt, 'hex');
    const iv = Buffer.from(encryptedObj.iv, 'hex');
    const combined = Buffer.from(encryptedObj.data, 'hex');

    // In AES-GCM, the last 16 bytes are the auth tag
    const authTagLength = 16;
    const ciphertext = combined.subarray(0, combined.length - authTagLength);
    const authTag = combined.subarray(combined.length - authTagLength);

    const key = deriveKeySync(passphrase, salt);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
  } catch {
    throw new Error('Entschlüsselung fehlgeschlagen. Das Passwort ist möglicherweise falsch.');
  }
}
