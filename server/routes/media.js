/**
 * server/routes/media.js
 * Secure encrypted media storage route:
 * - Stores files on disk in server/data/uploads/ as AES-256-GCM encrypted chunks (.enc)
 * - Restricts access strictly to members of the corresponding family (or the owning user)
 * - Streams decrypted binary on-the-fly directly to authorized clients
 */

import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'node:url';
import { readDb, sqlite } from '../utils/db.js';
import { requireAuth, getUserFamilyRole, JWT_SECRET } from '../middleware/auth.js';

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', 'data', 'uploads');

// Ensure uploads folder exists
try {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
} catch (err) {
  console.warn('[MEDIA] mkdir uploads warning:', err.message);
}

function requireMediaAuth(req, res, next) {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.headers.cookie) {
    const regex = /(?:^|;\s*)(?:babycharts_token|babycharts_session)=([^;]+)/;
    const match = regex.exec(req.headers.cookie);
    if (match?.[1]) {
      token = decodeURIComponent(match[1]);
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Nicht autorisiert. Bitte einloggen.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = readDb();
    const user = db.users.find((u) => u.id === decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'Benutzerkonto nicht gefunden.' });
    }

    // Invalidate media sessions if password was changed or sessions revoked
    const currentTokenVersion = user.tokenVersion || 0;
    const tokenVersionInJwt = decoded.tokenVersion || 0;
    if (tokenVersionInJwt < currentTokenVersion) {
      return res.status(401).json({
        error:
          'Ihre Sitzung ist abgelaufen, da das Passwort geändert wurde. Bitte erneut anmelden.',
      });
    }

    req.user = { id: user.id, email: user.email, name: user.name };
    next();
  } catch {
    return res.status(401).json({ error: 'Ungültiges oder abgelaufenes Token.' });
  }
}

/**
 * Resolves or dynamically generates and persists a cryptographically secure 32-byte Master Encryption Key
 * Checks:
 * 1. process.env.MEDIA_ENCRYPTION_KEY (Environment override)
 * 2. SQLite settings table ('media_master_key')
 * 3. Cryptographically random 32-byte key persisted to SQLite settings
 */
function getOrCreateMediaMasterKey() {
  if (process.env.MEDIA_ENCRYPTION_KEY && process.env.MEDIA_ENCRYPTION_KEY.trim().length > 0) {
    return crypto.createHash('sha256').update(process.env.MEDIA_ENCRYPTION_KEY.trim()).digest();
  }

  try {
    const row = sqlite.prepare('SELECT value FROM settings WHERE key = ?').get('media_master_key');
    if (row?.value) {
      return Buffer.from(row.value, 'hex');
    }

    const randomBytes = crypto.randomBytes(32);
    sqlite
      .prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
      .run('media_master_key', randomBytes.toString('hex'));
    return randomBytes;
  } catch (err) {
    console.error('[FATAL] Failed to initialize Media Master Encryption Key:', err.message);
    throw new Error(
      'Media Master Encryption Key initialization failed. Server starting in fail-closed state.'
    );
  }
}

const MEDIA_MASTER_KEY = getOrCreateMediaMasterKey();

function getEncryptionKey() {
  return MEDIA_MASTER_KEY;
}

function normalizeMimeType(rawMime) {
  const mime = rawMime.toLowerCase();
  if (mime === 'image/jpg') return 'image/jpeg';
  if (mime === 'video/quicktime') return 'video/mp4';
  return mime;
}

function verifyFamilyUploadAccess(familyId, userId) {
  if (!familyId) return { ok: true };
  const db = readDb();
  const family = db.families.find((f) => f.id === familyId);
  if (!family) {
    return { ok: false, status: 404, error: 'Familie nicht gefunden.' };
  }
  const role = getUserFamilyRole(family, userId);
  if (!role) {
    return { ok: false, status: 403, error: 'Kein Zugriff auf diese Familie.' };
  }
  return { ok: true };
}

function parseAndValidateMediaPayload(dataUrl) {
  if (
    !dataUrl ||
    typeof dataUrl !== 'string' ||
    (!dataUrl.startsWith('data:image/') && !dataUrl.startsWith('data:video/'))
  ) {
    return {
      error: 'Gültiges Medienformat (Bild oder Video Data URL) erforderlich.',
    };
  }

  const matches = dataUrl.match(
    /^data:((?:image\/(?:png|jpeg|jpg|webp|gif)|video\/(?:mp4|webm|quicktime)));base64,(.+)$/i
  );
  if (matches?.length !== 3) {
    return {
      error:
        'Ungültiges oder nicht unterstütztes Medienformat (nur PNG, JPEG, WebP, GIF, MP4, WebM).',
    };
  }

  const mimeType = normalizeMimeType(matches[1]);
  const buffer = Buffer.from(matches[2], 'base64');
  const isVideo = mimeType.startsWith('video/');
  const maxLimit = isVideo ? 25 * 1024 * 1024 : 15 * 1024 * 1024;

  if (buffer.length > maxLimit) {
    const limitText = isVideo ? '25 MB für Videos' : '15 MB für Bilder';
    return {
      error: `Datei zu groß. Maximal ${limitText} erlaubt.`,
    };
  }

  return { mimeType, buffer };
}

/**
 * POST /api/media/upload
 * Accepts a base64 Data URL or raw file payload, encrypts it with AES-256-GCM,
 * stores it to server/data/uploads/<id>.enc and registers it in SQLite.
 *
 * Body: { dataUrl: string, familyId?: string, filename?: string }
 */
router.post('/upload', requireAuth, (req, res) => {
  try {
    const { dataUrl, familyId, filename } = req.body || {};

    const familyCheck = verifyFamilyUploadAccess(familyId, req.user.id);
    if (!familyCheck.ok) {
      return res.status(familyCheck.status).json({ error: familyCheck.error });
    }

    const parsed = parseAndValidateMediaPayload(dataUrl);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }

    const { mimeType, buffer } = parsed;

    // Encrypt using AES-256-GCM
    const id = `med-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    const iv = crypto.randomBytes(16);
    const key = getEncryptionKey();

    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Write encrypted binary to disk
    const filePath = path.join(UPLOADS_DIR, `${id}.enc`);
    fs.writeFileSync(filePath, encrypted);

    // Save metadata in SQLite
    const createdAt = new Date().toISOString();
    sqlite
      .prepare(
        `
        INSERT INTO media_files (id, familyId, userId, originalName, mimeType, sizeBytes, iv, authTag, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        id,
        familyId || null,
        req.user.id,
        filename || 'image',
        mimeType,
        buffer.length,
        iv.toString('hex'),
        authTag.toString('hex'),
        createdAt
      );

    return res.status(201).json({
      ok: true,
      mediaId: id,
      url: `/api/media/${id}`,
      mimeType,
      sizeBytes: buffer.length,
    });
  } catch (err) {
    console.error('[MEDIA] Upload error:', err);
    return res.status(500).json({ error: 'Fehler beim sicheren Speichern des Mediums.' });
  }
});

function checkMediaAccess(meta, user, db) {
  if (meta.familyId) {
    const family = db.families.find((f) => f.id === meta.familyId);
    if (family) {
      return family.ownerId === user.id || family.members?.some((m) => m.userId === user.id);
    }
    return false;
  }

  if (meta.userId === user.id) {
    return true;
  }

  // Check if user shares any family with meta.userId or if media is referenced in any profile user has access to
  const userFamilies = db.families.filter(
    (f) => f.ownerId === user.id || f.members?.some((m) => m.userId === user.id)
  );
  const userFamilyIds = new Set(userFamilies.map((f) => f.id));

  const sharedFamily = db.families.some(
    (f) =>
      (f.ownerId === meta.userId || f.members?.some((m) => m.userId === meta.userId)) &&
      (f.ownerId === user.id || f.members?.some((m) => m.userId === user.id))
  );

  const profileReferenced = db.profiles.some(
    (p) =>
      p.familyId &&
      userFamilyIds.has(p.familyId) &&
      (p.avatar?.includes(meta.id) ||
        Object.values(p.milestones || {}).some((m) => m?.photo?.includes(meta.id)))
  );

  return sharedFamily || profileReferenced;
}

/**
 * GET /api/media/:id
 * Streams the decrypted image directly to the client after verifying family membership
 */
router.get('/:id', requireMediaAuth, (req, res) => {
  try {
    const rawId = req.params.id;
    if (typeof rawId !== 'string' || !/^med-[a-zA-Z0-9-]+$/.test(rawId)) {
      return res.status(400).json({ error: 'Ungültige Medien-ID.' });
    }
    const id = rawId;

    const meta = sqlite.prepare('SELECT * FROM media_files WHERE id = ?').get(id);

    if (!meta) {
      return res.status(404).json({ error: 'Medium nicht gefunden.' });
    }

    const db = readDb();
    const hasAccess = checkMediaAccess(meta, req.user, db);

    if (!hasAccess) {
      return res
        .status(403)
        .json({ error: 'Zugriff verweigert: Sie gehören nicht zu dieser Familie.' });
    }

    const filePath = path.join(UPLOADS_DIR, `${meta.id}.enc`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Datei auf dem Speicher nicht gefunden.' });
    }

    const encryptedData = fs.readFileSync(filePath);
    const key = getEncryptionKey();
    const iv = Buffer.from(meta.iv, 'hex');
    const authTag = Buffer.from(meta.authTag, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);

    // Whitelist check on mimeType before serving to prevent XSS / MIME sniffing
    const SAFE_MIMES = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/mp4',
      'video/webm',
    ];
    const safeMime = SAFE_MIMES.includes(meta.mimeType)
      ? meta.mimeType
      : 'application/octet-stream';

    // Send decrypted buffer with strict security and caching headers
    res.setHeader('Content-Type', safeMime);
    res.setHeader('Content-Length', decrypted.length);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Download-Options', 'noopen');
    res.setHeader('Cache-Control', 'private, max-age=86400'); // Cache for 24h in client session
    return res.end(decrypted);
  } catch (err) {
    console.error('[MEDIA] Decrypt error:', err);
    return res.status(500).json({ error: 'Fehler beim Entschlüsseln des Mediums.' });
  }
});

/**
 * DELETE /api/media/:id
 * Removes encrypted file from disk and deletes record from SQLite (editor or admin required)
 */
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const rawId = req.params.id;
    if (typeof rawId !== 'string' || !/^med-[a-zA-Z0-9-]+$/.test(rawId)) {
      return res.status(400).json({ error: 'Ungültige Medien-ID.' });
    }
    const id = rawId;

    const meta = sqlite.prepare('SELECT * FROM media_files WHERE id = ?').get(id);

    if (!meta) {
      return res.status(404).json({ error: 'Medium nicht gefunden.' });
    }

    const db = readDb();

    // Check delete permission
    if (meta.familyId) {
      const family = db.families.find((f) => f.id === meta.familyId);
      const role = getUserFamilyRole(family, req.user.id);
      if (role !== 'admin' && role !== 'editor') {
        return res.status(403).json({ error: 'Keine Berechtigung zum Löschen.' });
      }
    } else if (meta.userId !== req.user.id) {
      return res.status(403).json({ error: 'Keine Berechtigung zum Löschen dieses Mediums.' });
    }

    const filePath = path.join(UPLOADS_DIR, `${meta.id}.enc`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    sqlite.prepare('DELETE FROM media_files WHERE id = ?').run(id);

    return res.json({ ok: true });
  } catch (err) {
    console.error('[MEDIA] Delete error:', err);
    return res.status(500).json({ error: 'Fehler beim Löschen des Mediums.' });
  }
});

export default router;
