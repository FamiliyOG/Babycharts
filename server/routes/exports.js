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

// GET – list all PDFs (strictly authenticated & filtered to user's family children)
router.get('/', requireAuth, async (req, res) => {
  const exportDir = getExportDir();
  const db = readDb();
  const allowedFolders = getAllowedChildFolders(req.user, db);

  const files = [];
  const scanDir = async (dir, base = '') => {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const relPath = base ? `${base}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          // Only scan subdirectories that match the user's family profiles
          if (!base && !allowedFolders.has(entry.name)) {
            continue;
          }
          await scanDir(path.join(dir, entry.name), relPath);
        } else if (entry.name.endsWith('.pdf')) {
          const topFolder = relPath.split('/')[0];
          if (allowedFolders.has(topFolder)) {
            try {
              const stat = await fs.stat(path.join(dir, entry.name));
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
        }
      }
    } catch {
      // Ignore missing or inaccessible directories
    }
  };

  await scanDir(exportDir);
  files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return res.json(files);
});

// GET – download a specific PDF via query param (strictly authorized by family)
// /api/exports/download?file=ChildName/report.pdf
router.get('/download', requireAuth, (req, res) => {
  const fileParam = typeof req.query.file === 'string' ? req.query.file.trim() : null;
  if (!fileParam?.endsWith('.pdf')) {
    return res.status(400).json({ error: 'Invalid file parameter' });
  }

  const exportDir = getExportDir();
  const filePath = resolveSafePath(exportDir, fileParam);

  if (!filePath) {
    return res.status(400).json({ error: 'Invalid file path' });
  }

  // Check authorization for the child folder
  const db = readDb();
  const allowedFolders = getAllowedChildFolders(req.user, db);
  const normalizedRel = path.relative(exportDir, filePath).replace(/\\/g, '/');
  const topFolder = normalizedRel.split('/')[0];

  if (!allowedFolders.has(topFolder)) {
    return res
      .status(403)
      .json({ error: 'Zugriff verweigert: Sie sind nicht für diese PDF-Datei autorisiert.' });
  }

  return res.download(filePath, path.basename(filePath), (err) => {
    if (err && !res.headersSent) {
      return res.status(404).json({ error: 'File not found' });
    }
  });
});

// DELETE – remove a specific PDF via query param (requires editor or admin role)
// DELETE /api/exports/delete?file=ChildName/report.pdf
router.delete('/delete', requireAuth, async (req, res) => {
  const fileParam = typeof req.query.file === 'string' ? req.query.file.trim() : null;
  if (!fileParam?.endsWith('.pdf')) {
    return res.status(400).json({ error: 'Invalid file parameter' });
  }

  const exportDir = getExportDir();
  const filePath = resolveSafePath(exportDir, fileParam);

  if (!filePath) {
    return res.status(400).json({ error: 'Invalid file path' });
  }

  const db = readDb();
  const normalizedRel = path.relative(exportDir, filePath).replace(/\\/g, '/');
  const topFolder = normalizedRel.split('/')[0];

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

export default router;
