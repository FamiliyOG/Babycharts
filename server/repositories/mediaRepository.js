/**
 * server/repositories/mediaRepository.js
 * Encapsulated SQLite data access layer for Media Files & Encryption metadata.
 * Matches exact schema: id, familyId, userId, originalName, mimeType, sizeBytes, iv, authTag, createdAt.
 */

import { sqlite } from '../utils/db.js';

export const mediaRepository = {
  findById(id) {
    if (!id) return null;
    return sqlite.prepare('SELECT * FROM media_files WHERE id = ?').get(id) || null;
  },

  findByFamilyId(familyId) {
    if (!familyId) return [];
    return sqlite
      .prepare('SELECT * FROM media_files WHERE familyId = ? ORDER BY createdAt DESC')
      .all(familyId);
  },

  findByUserId(userId) {
    if (!userId) return [];
    return sqlite
      .prepare('SELECT * FROM media_files WHERE userId = ? ORDER BY createdAt DESC')
      .all(userId);
  },

  create(media) {
    const now = new Date().toISOString();
    sqlite
      .prepare(
        `
        INSERT INTO media_files (
          id, familyId, userId, originalName, mimeType, sizeBytes, iv, authTag, createdAt
        ) VALUES (
          @id, @familyId, @userId, @originalName, @mimeType, @sizeBytes, @iv, @authTag, @createdAt
        )
      `
      )
      .run({
        id: media.id,
        familyId: media.familyId || null,
        userId: media.userId || null,
        originalName: media.originalName || 'file',
        mimeType: media.mimeType || 'application/octet-stream',
        sizeBytes: media.sizeBytes || media.size || 0,
        iv: media.iv || media.encryptionIv || '',
        authTag: media.authTag || media.encryptionTag || '',
        createdAt: media.createdAt || now,
      });

    return this.findById(media.id);
  },

  delete(id) {
    return sqlite.prepare('DELETE FROM media_files WHERE id = ?').run(id);
  },
};
