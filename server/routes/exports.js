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
import { getSettings } from '../utils/db.js';

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

// GET – list all PDFs (flat scan of export dir including subdirs asynchronously)
router.get('/', async (_req, res) => {
  const exportDir = getExportDir();

  const files = [];
  const scanDir = async (dir, base = '') => {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const relPath = base ? `${base}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          await scanDir(path.join(dir, entry.name), relPath);
        } else if (entry.name.endsWith('.pdf')) {
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
    } catch {
      // Ignore missing or inaccessible directories
    }
  };

  await scanDir(exportDir);
  files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return res.json(files);
});

// GET – download a specific PDF via query param
// /api/exports/download?file=ChildName/report.pdf
router.get('/download', exportLimiter, (req, res) => {
  const fileParam = typeof req.query.file === 'string' ? req.query.file.trim() : null;
  if (!fileParam?.endsWith('.pdf')) {
    return res.status(400).json({ error: 'Invalid file parameter' });
  }

  const exportDir = getExportDir();
  const filePath = resolveSafePath(exportDir, fileParam);

  if (!filePath) {
    return res.status(400).json({ error: 'Invalid file path' });
  }

  return res.download(filePath, path.basename(filePath), (err) => {
    if (err && !res.headersSent) {
      return res.status(404).json({ error: 'File not found' });
    }
  });
});

// DELETE – remove a specific PDF via query param
// DELETE /api/exports/delete?file=ChildName/report.pdf
router.delete('/delete', exportLimiter, async (req, res) => {
  const fileParam = typeof req.query.file === 'string' ? req.query.file.trim() : null;
  if (!fileParam?.endsWith('.pdf')) {
    return res.status(400).json({ error: 'Invalid file parameter' });
  }

  const exportDir = getExportDir();
  const filePath = resolveSafePath(exportDir, fileParam);

  if (!filePath) {
    return res.status(400).json({ error: 'Invalid file path' });
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
