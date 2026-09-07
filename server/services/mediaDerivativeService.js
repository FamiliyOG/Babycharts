/**
 * server/services/mediaDerivativeService.js
 *
 * Secure encrypted derivative pipeline for media files (BC-296).
 * Handles thumbnail derivatives (sm: 160px, md: 480px, lg: 1080px),
 * encrypted with the family/media AES-256-GCM master key.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { sqlite } from '../utils/db.js';
import { getMediaMasterKey } from '../security/keys.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', 'data', 'uploads');

const KEY = getMediaMasterKey();

export const ALLOWED_VARIANTS = ['sm', 'md', 'lg'];

/**
 * Stores an encrypted derivative on disk and registers it in `media_derivatives`.
 *
 * @param {string} mediaId - Parent media file ID
 * @param {string} sizeVariant - 'sm' | 'md' | 'lg'
 * @param {Buffer} buffer - Decrypted image binary
 * @param {string} mimeType - MIME type (e.g. 'image/jpeg')
 * @param {number} [width] - Image width
 * @param {number} [height] - Image height
 * @returns {object} Metadata of the created derivative
 */
export function storeEncryptedDerivative(
  mediaId,
  sizeVariant,
  buffer,
  mimeType,
  width = null,
  height = null
) {
  if (!ALLOWED_VARIANTS.includes(sizeVariant)) {
    throw new Error(`Ungültige Größenvariante: ${sizeVariant}`);
  }

  const derivativeId = `${mediaId}_${sizeVariant}`;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const filePath = path.join(UPLOADS_DIR, `${derivativeId}.enc`);
  fs.writeFileSync(filePath, encrypted);

  const createdAt = new Date().toISOString();

  sqlite
    .prepare(
      `
      INSERT OR REPLACE INTO media_derivatives
        (id, mediaId, sizeVariant, mimeType, width, height, sizeBytes, iv, authTag, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
    .run(
      derivativeId,
      mediaId,
      sizeVariant,
      mimeType,
      width,
      height,
      buffer.length,
      iv.toString('hex'),
      authTag.toString('hex'),
      createdAt
    );

  return {
    id: derivativeId,
    mediaId,
    sizeVariant,
    mimeType,
    width,
    height,
    sizeBytes: buffer.length,
    createdAt,
  };
}

/**
 * Retrieves and decrypts a media derivative, falling back to null if not found.
 *
 * @param {string} mediaId - Parent media file ID
 * @param {string} sizeVariant - 'sm' | 'md' | 'lg'
 * @returns {{ buffer: Buffer, mimeType: string } | null}
 */
export function getDecryptedDerivative(mediaId, sizeVariant) {
  const meta = sqlite
    .prepare('SELECT * FROM media_derivatives WHERE mediaId = ? AND sizeVariant = ?')
    .get(mediaId, sizeVariant);

  if (!meta) return null;

  const filePath = path.join(UPLOADS_DIR, `${meta.id}.enc`);
  if (!fs.existsSync(filePath)) return null;

  try {
    const encryptedData = fs.readFileSync(filePath);
    const iv = Buffer.from(meta.iv, 'hex');
    const authTag = Buffer.from(meta.authTag, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv, { authTagLength: 16 });
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);

    return {
      buffer: decrypted,
      mimeType: meta.mimeType,
      width: meta.width,
      height: meta.height,
    };
  } catch (err) {
    // lgtm[javascript.lang.security.audit.unsafe-formatstring] - meta.id is a database-generated UUID, not user input
    console.warn(`[Derivative] Failed to decrypt derivative ${meta.id}:`, err.message);
    return null;
  }
}

/**
 * Deletes all derivatives associated with a media file from disk and database.
 *
 * @param {string} mediaId
 */
export function deleteMediaDerivatives(mediaId) {
  const rows = sqlite.prepare('SELECT id FROM media_derivatives WHERE mediaId = ?').all(mediaId);

  for (const row of rows) {
    const filePath = path.join(UPLOADS_DIR, `${row.id}.enc`);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        // lgtm[javascript.lang.security.audit.unsafe-formatstring] - filePath is constructed from a DB UUID, not user input
        console.warn(`[Derivative] Error deleting derivative file ${filePath}:`, err.message);
      }
    }
  }

  sqlite.prepare('DELETE FROM media_derivatives WHERE mediaId = ?').run(mediaId);
}
