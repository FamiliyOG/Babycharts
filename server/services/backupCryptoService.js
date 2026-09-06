/**
 * server/services/backupCryptoService.js
 * Server-side AES-256-GCM encryption & decryption for BabyCharts backups (Issue #250, #266).
 * Uses Node.js crypto module with modern scrypt KDF (babycharts-enc-v2) and PBKDF2 backwards compatibility (babycharts-enc-v1).
 */

import crypto from 'node:crypto';

const PBKDF2_ITERATIONS = 100000;
const SCRYPT_PARAMS = {
  N: 16384, // CPU/memory cost
  r: 8, // block size
  p: 1, // parallelization
  maxmem: 32 * 1024 * 1024,
};
const KEY_LENGTH = 32; // 256 bits
const SALT_BYTES = 16;
const IV_BYTES = 12;

/**
 * Derives key using modern scrypt.
 */
function deriveKeyScryptSync(passphrase, saltBuffer) {
  return crypto.scryptSync(passphrase, saltBuffer, KEY_LENGTH, SCRYPT_PARAMS);
}

/**
 * Derives key using PBKDF2 (legacy backwards-compatibility).
 */
function deriveKeyPbkdf2Sync(passphrase, saltBuffer, iterations = PBKDF2_ITERATIONS) {
  return crypto.pbkdf2Sync(passphrase, saltBuffer, iterations, KEY_LENGTH, 'sha256');
}

/**
 * Encrypts a data object with AES-256-GCM using modern scrypt key derivation (Issue #266).
 */
export function encryptBackupNode(data, passphrase, _options = {}) {
  if (!passphrase || typeof passphrase !== 'string') {
    throw new Error('Passphrase erforderlich für verschlüsseltes Backup.');
  }

  const salt = crypto.randomBytes(SALT_BYTES);
  const iv = crypto.randomBytes(IV_BYTES);
  const key = deriveKeyScryptSync(passphrase, salt);

  const plaintext = Buffer.from(JSON.stringify(data), 'utf8');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Combined ciphertext + authTag to match Web Crypto AES-GCM format
  const combined = Buffer.concat([encrypted, authTag]);

  return {
    version: 'babycharts-enc-v2',
    algorithm: 'AES-256-GCM',
    kdf: 'scrypt',
    scryptParams: { N: SCRYPT_PARAMS.N, r: SCRYPT_PARAMS.r, p: SCRYPT_PARAMS.p },
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    data: combined.toString('hex'),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Decrypts an encrypted backup object with AES-256-GCM (supports both v1 and v2 formats).
 */
export function decryptBackupNode(encryptedObj, passphrase) {
  const version = encryptedObj?.version;
  if (
    (version !== 'babycharts-enc-v1' && version !== 'babycharts-enc-v2') ||
    encryptedObj?.algorithm !== 'AES-256-GCM'
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

    let key;
    if (
      encryptedObj.kdf === 'scrypt' ||
      (version === 'babycharts-enc-v2' && !encryptedObj.kdf?.startsWith('PBKDF2'))
    ) {
      key = deriveKeyScryptSync(passphrase, salt);
    } else {
      // Legacy PBKDF2 derivation
      const iterations = Number(encryptedObj.iterations) || PBKDF2_ITERATIONS;
      key = deriveKeyPbkdf2Sync(passphrase, salt, iterations);
    }

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv, { authTagLength });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
  } catch {
    throw new Error('Entschlüsselung fehlgeschlagen. Das Passwort ist möglicherweise falsch.');
  }
}
