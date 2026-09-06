import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  storeEncryptedDerivative,
  getDecryptedDerivative,
  deleteMediaDerivatives,
  ALLOWED_VARIANTS,
} from '../../server/services/mediaDerivativeService.js';
import { sqlite } from '../../server/utils/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'server', 'data', 'uploads');

describe('Media Derivative Pipeline & Range Requests (BC-296)', () => {
  const testMediaId = 'med-test-pipe-12345';
  const testBuffer = Buffer.from('Fake JPEG binary content for testing derivative pipeline');
  const mimeType = 'image/jpeg';

  beforeEach(() => {
    // Ensure test parent media exists in media_files table (familyId and userId nullable)
    sqlite
      .prepare(
        `
      INSERT OR REPLACE INTO media_files (id, familyId, userId, originalName, mimeType, sizeBytes, iv, authTag, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        testMediaId,
        null,
        null,
        'test.jpg',
        mimeType,
        testBuffer.length,
        '00112233445566778899aabbccddeeff',
        'ffeeddccbbaa99887766554433221100',
        new Date().toISOString()
      );
  });

  afterEach(() => {
    deleteMediaDerivatives(testMediaId);
    sqlite.prepare('DELETE FROM media_files WHERE id = ?').run(testMediaId);
  });

  it('verifies allowed size variants', () => {
    expect(ALLOWED_VARIANTS).toContain('sm');
    expect(ALLOWED_VARIANTS).toContain('md');
    expect(ALLOWED_VARIANTS).toContain('lg');
  });

  it('stores an encrypted derivative and creates corresponding .enc file on disk', () => {
    const meta = storeEncryptedDerivative(testMediaId, 'sm', testBuffer, mimeType, 160, 160);

    expect(meta.id).toBe(`${testMediaId}_sm`);
    expect(meta.sizeVariant).toBe('sm');
    expect(meta.width).toBe(160);
    expect(meta.height).toBe(160);

    const filePath = path.join(UPLOADS_DIR, `${meta.id}.enc`);
    expect(fs.existsSync(filePath)).toBe(true);

    const onDisk = fs.readFileSync(filePath);
    // On-disk file must be encrypted and not match plaintext
    expect(onDisk.toString()).not.toBe(testBuffer.toString());
  });

  it('decrypts stored derivative and restores exact original buffer', () => {
    storeEncryptedDerivative(testMediaId, 'md', testBuffer, mimeType, 480, 480);

    const decrypted = getDecryptedDerivative(testMediaId, 'md');
    expect(decrypted).not.toBeNull();
    expect(decrypted.mimeType).toBe(mimeType);
    expect(decrypted.buffer.toString()).toBe(testBuffer.toString());
    expect(decrypted.width).toBe(480);
    expect(decrypted.height).toBe(480);
  });

  it('returns null when requesting non-existent derivative', () => {
    const res = getDecryptedDerivative(testMediaId, 'lg');
    expect(res).toBeNull();
  });

  it('rejects invalid size variants', () => {
    expect(() => {
      storeEncryptedDerivative(testMediaId, 'xl_ultra', testBuffer, mimeType);
    }).toThrow(/Ungültige Größenvariante/);
  });

  it('cleans up derivative file and database record on deletion', () => {
    storeEncryptedDerivative(testMediaId, 'sm', testBuffer, mimeType);
    const filePath = path.join(UPLOADS_DIR, `${testMediaId}_sm.enc`);
    expect(fs.existsSync(filePath)).toBe(true);

    deleteMediaDerivatives(testMediaId);

    expect(fs.existsSync(filePath)).toBe(false);
    expect(getDecryptedDerivative(testMediaId, 'sm')).toBeNull();
  });
});
