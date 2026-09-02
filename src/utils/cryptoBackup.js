/**
 * src/utils/cryptoBackup.js
 * Client-side AES-256-GCM encryption & decryption for BabyCharts backups (Issue #250).
 * Uses native Web Crypto API (SubtleCrypto) with PBKDF2 key derivation.
 */

const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH_BITS = 256;
const SALT_BYTES = 16;
const IV_BYTES = 12;

function buf2hex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hex2buf(hexString) {
  const bytes = new Uint8Array(Math.ceil(hexString.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hexString.substr(i * 2, 2), 16);
  }
  return bytes.buffer;
}

async function deriveKey(passphrase, saltBuffer) {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH_BITS },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a JavaScript object (e.g. profiles backup) with AES-256-GCM.
 * @param {object|Array} data
 * @param {string} passphrase
 * @returns {Promise<object>} encrypted backup payload
 */
export async function encryptBackup(data, passphrase) {
  if (!passphrase || typeof passphrase !== 'string') {
    throw new Error('Passphrase erforderlich für verschlüsseltes Backup.');
  }

  const salt = window.crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_BYTES));

  const key = await deriveKey(passphrase, salt);
  const enc = new TextEncoder();
  const plaintext = enc.encode(JSON.stringify(data));

  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    plaintext
  );

  return {
    version: 'babycharts-enc-v1',
    algorithm: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA256',
    iterations: PBKDF2_ITERATIONS,
    salt: buf2hex(salt),
    iv: buf2hex(iv),
    data: buf2hex(ciphertext),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Decrypts an encrypted backup payload with AES-256-GCM.
 * @param {object} encryptedObj
 * @param {string} passphrase
 * @returns {Promise<object|Array>} decrypted JavaScript data object
 */
export async function decryptBackup(encryptedObj, passphrase) {
  if (!isEncryptedBackup(encryptedObj)) {
    throw new Error('Ungültiges oder nicht unterstütztes Verschlüsselungsformat.');
  }

  if (!passphrase || typeof passphrase !== 'string') {
    throw new Error('Passphrase erforderlich zur Entschlüsselung.');
  }

  try {
    const salt = hex2buf(encryptedObj.salt);
    const iv = hex2buf(encryptedObj.iv);
    const ciphertext = hex2buf(encryptedObj.data);

    const key = await deriveKey(passphrase, salt);

    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      ciphertext
    );

    const dec = new TextDecoder();
    return JSON.parse(dec.decode(decrypted));
  } catch {
    throw new Error('Entschlüsselung fehlgeschlagen. Das Passwort ist möglicherweise falsch.');
  }
}

/**
 * Checks if a parsed JSON payload is an encrypted BabyCharts backup.
 */
export function isEncryptedBackup(obj) {
  return Boolean(
    obj &&
    typeof obj === 'object' &&
    obj.version === 'babycharts-enc-v1' &&
    obj.algorithm === 'AES-256-GCM' &&
    typeof obj.salt === 'string' &&
    typeof obj.iv === 'string' &&
    typeof obj.data === 'string'
  );
}
