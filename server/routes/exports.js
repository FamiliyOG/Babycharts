/**
 * server/routes/exports.js
 * REST API for listing and downloading generated PDF reports
 *
 * GET    /api/exports                       – list all generated PDFs
 * GET    /api/exports/download?file=<path>  – download a specific PDF
 * DELETE /api/exports/delete?file=<path>    – delete a specific PDF
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getSettings, readDb } from '../utils/db.js';
import { requireAuth, getUserFamilyRole } from '../middleware/auth.js';

const router = Router();

// Dedicated download / exports rate limiter (100 operations / 15 min per IP)
const exportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Export-Anfragen. Bitte versuchen Sie es in wenigen Minuten erneut.' },
});

router.use(exportLimiter);

function getExportDir() {
  const settings = getSettings();
  const rawDir = settings.pdfOutputDir || './pdf_exports';
  return path.resolve(process.cwd(), rawDir);
}

function resolveSafePath(exportDir, filename) {
  if (!filename) return null;
  const normalized = path.normalize(filename).replace(/^(\.\.(\/|\\|$))+/, '');
  const full = path.join(exportDir, normalized);
  // Prevent path traversal
  if (!full.startsWith(exportDir)) return null;
  return full;
}

function sanitizeName(name) {
  if (!name || typeof name !== 'string') return '';
  return name.replace(/[^a-zA-Z0-9\-_äöüÄÖÜß]/g, '_');
}

/**
 * Helper to get all allowed profile names (sanitized) for the authenticated user
 */
function getAllowedChildFolders(user, db) {
  const userFamilies = db.families.filter(
    (f) => f.ownerId === user.id || f.members?.some((m) => m.userId === user.id)
  );
  const userFamilyIds = new Set(userFamilies.map((f) => f.id));
  const userProfiles = db.profiles.filter((p) => p.familyId && userFamilyIds.has(p.familyId));
  return new Set(userProfiles.map((p) => sanitizeName(p.name)).filter(Boolean));
}

async function processPdfFile(dir, entryName, relPath, allowedFolders, files) {
  if (!entryName.endsWith('.pdf')) return;
  const topFolder = relPath.split('/')[0];
  if (!allowedFolders.has(topFolder)) return;

  try {
    const stat = await fs.stat(path.join(dir, entryName));
    files.push({
      filename: relPath,
      sizeBytes: stat.size,
      createdAt: stat.birthtime.toISOString(),
      modifiedAt: stat.mtime.toISOString(),
    });
  } catch {
    // Ignore stat errors
  }
}

async function scanExportFiles(dir, base, allowedFolders, files) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const relPath = base ? `${base}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (!base && !allowedFolders.has(entry.name)) {
          continue;
        }
        await scanExportFiles(path.join(dir, entry.name), relPath, allowedFolders, files);
      } else {
        await processPdfFile(dir, entry.name, relPath, allowedFolders, files);
      }
    }
  } catch {
    // Ignore missing or inaccessible directories
  }
}

// GET – list all PDFs (strictly authenticated & filtered to user's family children)
router.get('/', requireAuth, async (req, res) => {
  const exportDir = getExportDir();
  const db = readDb();
  const allowedFolders = getAllowedChildFolders(req.user, db);

  const files = [];
  await scanExportFiles(exportDir, '', allowedFolders, files);
  files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return res.json(files);
});

function validatePdfFileParam(exportDir, fileQuery) {
  const fileParam = typeof fileQuery === 'string' ? fileQuery.trim() : null;
  if (!fileParam?.endsWith('.pdf')) {
    return { error: 'Invalid file parameter', status: 400 };
  }

  const filePath = resolveSafePath(exportDir, fileParam);
  if (!filePath) {
    return { error: 'Invalid file path', status: 400 };
  }

  const normalizedRel = path.relative(exportDir, filePath).replaceAll('\\', '/');
  const topFolder = normalizedRel.split('/')[0];
  return { filePath, topFolder };
}

// GET – download a specific PDF via query param (strictly authorized by family)
// /api/exports/download?file=ChildName/report.pdf
router.get('/download', requireAuth, (req, res) => {
  const exportDir = getExportDir();
  const validation = validatePdfFileParam(exportDir, req.query.file);
  if (validation.error) {
    return res.status(validation.status).json({ error: validation.error });
  }

  // Check authorization for the child folder
  const db = readDb();
  const allowedFolders = getAllowedChildFolders(req.user, db);

  if (!allowedFolders.has(validation.topFolder)) {
    return res
      .status(403)
      .json({ error: 'Zugriff verweigert: Sie sind nicht für diese PDF-Datei autorisiert.' });
  }

  return res.download(validation.filePath, path.basename(validation.filePath), (err) => {
    if (err && !res.headersSent) {
      return res.status(404).json({ error: 'File not found' });
    }
  });
});

// DELETE – remove a specific PDF via query param (requires editor or admin role)
// DELETE /api/exports/delete?file=ChildName/report.pdf
router.delete('/delete', requireAuth, async (req, res) => {
  const exportDir = getExportDir();
  const validation = validatePdfFileParam(exportDir, req.query.file);
  if (validation.error) {
    return res.status(validation.status).json({ error: validation.error });
  }

  const { filePath, topFolder } = validation;
  const db = readDb();

  // Find the corresponding profile & family
  const targetProfile = db.profiles.find((p) => sanitizeName(p.name) === topFolder);
  if (targetProfile?.familyId) {
    const family = db.families.find((f) => f.id === targetProfile.familyId);
    const role = getUserFamilyRole(family, req.user.id);
    if (!role || role === 'viewer') {
      return res
        .status(403)
        .json({ error: 'Zugriff verweigert: Sie dürfen diese Datei nicht löschen.' });
    }
  } else {
    const allowedFolders = getAllowedChildFolders(req.user, db);
    if (!allowedFolders.has(topFolder)) {
      return res.status(403).json({ error: 'Zugriff verweigert.' });
    }
  }

  try {
    await fs.unlink(filePath);
    return res.json({ ok: true });
  } catch (err) {
    if (err.code === 'ENOENT') {
      return res.status(404).json({ error: 'File not found' });
    }
    return res.status(500).json({ error: 'Failed to delete file' });
  }
});

// ── Database Backup & Restore API (Issues BC-098, BC-099, BC-100, BC-101, BC-102) ───────────

// GET /api/exports/backups – list server SQLite backups (Admin/Dev only)
router.get('/backups', requireAuth, async (req, res) => {
  if (!req.user.isDev && req.user.role !== 'admin') {
    return res
      .status(403)
      .json({ error: 'Zugriff verweigert: Nur Administratoren dürfen Backups einsehen.' });
  }

  try {
    const backupDir = path.resolve(process.cwd(), 'server', 'data', 'backups');
    await fs.mkdir(backupDir, { recursive: true });
    const entries = await fs.readdir(backupDir);

    const backups = [];
    for (const file of entries) {
      if (!file.endsWith('.sqlite')) continue;
      try {
        const fullPath = path.join(backupDir, file);
        const stat = await fs.stat(fullPath);
        backups.push({
          filename: file,
          sizeBytes: stat.size,
          createdAt: stat.birthtime.toISOString(),
          mtime: stat.mtime.toISOString(),
        });
      } catch {
        // ignore individual stat errors
      }
    }

    backups.sort((a, b) => new Date(b.mtime) - new Date(a.mtime));
    return res.json({ backups });
  } catch (err) {
    return res.status(500).json({ error: 'Fehler beim Laden der Backups: ' + err.message });
  }
});

// POST /api/exports/backups/create – trigger manual SQLite database backup
router.post('/backups/create', requireAuth, async (req, res) => {
  if (!req.user.isDev && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Zugriff verweigert.' });
  }

  const { createDbBackup } = await import('../utils/db.js');
  const backupPath = await createDbBackup();
  if (backupPath) {
    return res.json({ ok: true, filename: path.basename(backupPath) });
  }
  return res.status(500).json({ error: 'Backup-Erstellung fehlgeschlagen.' });
});

// POST /api/exports/backups/restore/:filename – restore database from an existing server backup
router.post('/backups/restore/:filename', requireAuth, async (req, res) => {
  if (!req.user.isDev && req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Zugriff verweigert: Nur Administratoren dürfen Datenbanken wiederherstellen.',
    });
  }

  const filename = path.basename(req.params.filename);
  const backupDir = path.resolve(process.cwd(), 'server', 'data', 'backups');
  const targetPath = path.join(backupDir, filename);

  const { restoreFromBackup } = await import('../utils/db.js');
  const result = await restoreFromBackup(targetPath);

  if (!result.ok) {
    return res.status(400).json({ error: result.error });
  }

  return res.json({
    ok: true,
    message: 'Datenbank erfolgreich wiederhergestellt.',
    preRestoreBackup: result.preRestoreBackupPath
      ? path.basename(result.preRestoreBackupPath)
      : null,
  });
});

export default router;
