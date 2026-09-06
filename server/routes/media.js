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
import { getMediaMasterKey } from '../security/keys.js';
import {
  getDecryptedDerivative,
  deleteMediaDerivatives,
  ALLOWED_VARIANTS,
} from '../services/mediaDerivativeService.js';

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
  // BC-257: Strictly forbid passing authentication or session tokens in URL query strings
  if (req.query?.token || req.query?.jwt) {
    return res.status(400).json({
      error: 'Authentifizierungs-Tokens in URL-Query-Parametern sind nicht zulässig.',
    });
  }

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
    const user = sqlite
      .prepare('SELECT id, email, name, role, isDev, tokenVersion FROM users WHERE id = ?')
      .get(decoded.id);
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

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isDev: Boolean(user.isDev),
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Ungültiges oder abgelaufenes Token.' });
  }
}

const MEDIA_MASTER_KEY = getMediaMasterKey();

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

  // Magic bytes inspection to prevent file extension / MIME spoofing (Issue #265)
  const isPng =
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  const isJpg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isGif = buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46;
  const isWebp =
    buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP';
  const isMp4 =
    buffer.subarray(4, 8).toString() === 'ftyp' ||
    buffer.subarray(4, 12).toString().includes('mp4');
  const isWebm =
    buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3;

  const validMagic = isPng || isJpg || isGif || isWebp || isMp4 || isWebm;
  if (!validMagic) {
    return {
      error: 'Dateiinhalte entsprechen keinem gültigen Bild- oder Videoformat.',
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

    // BC-296: Check if a resized thumbnail derivative was requested (size=sm|md|lg)
    const sizeVariant = req.query.size;
    if (sizeVariant && ALLOWED_VARIANTS.includes(sizeVariant)) {
      const derivative = getDecryptedDerivative(meta.id, sizeVariant);
      if (derivative) {
        res.setHeader('Content-Type', derivative.mimeType);
        res.setHeader('Content-Length', derivative.buffer.length);
        res.setHeader('Content-Disposition', 'inline');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', 'private, max-age=86400');
        return res.end(derivative.buffer);
      }
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

    // BC-296: HTTP 206 Partial Content (Range Request) support for video streaming
    const totalSize = decrypted.length;
    const range = req.headers.range;

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', safeMime);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Download-Options', 'noopen');
    res.setHeader('Cache-Control', 'private, max-age=86400'); // Cache for 24h in client session

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = Number.parseInt(parts[0], 10);
      const end = parts[1] ? Number.parseInt(parts[1], 10) : totalSize - 1;

      if (
        Number.isNaN(start) ||
        Number.isNaN(end) ||
        start >= totalSize ||
        end >= totalSize ||
        start > end
      ) {
        res.setHeader('Content-Range', `bytes */${totalSize}`);
        return res.status(416).json({ error: 'Requested Range Not Satisfiable' });
      }

      const chunkSize = end - start + 1;
      const partialBuffer = decrypted.subarray(start, end + 1);

      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
      res.setHeader('Content-Length', chunkSize);
      return res.end(partialBuffer);
    }

    // Full file response
    res.setHeader('Content-Length', totalSize);
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

    // Clean up all thumbnails and derived files
    deleteMediaDerivatives(id);

    sqlite.prepare('DELETE FROM media_files WHERE id = ?').run(id);

    return res.json({ ok: true });
  } catch (err) {
    console.error('[MEDIA] Delete error:', err);
    return res.status(500).json({ error: 'Fehler beim Löschen des Mediums.' });
  }
});

export default router;
