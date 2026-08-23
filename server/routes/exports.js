/**
 * server/routes/exports.js
 * REST API for listing and downloading generated PDF reports
 *
 * GET    /api/exports                       – list all generated PDFs
 * GET    /api/exports/download?file=<path>  – download a specific PDF
 * DELETE /api/exports/delete?file=<path>    – delete a specific PDF
 */

import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { getSettings } from '../utils/db.js';

const router = Router();

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

// GET – list all PDFs (flat scan of export dir including subdirs)
router.get('/', (_req, res) => {
  const exportDir = getExportDir();

  if (!fs.existsSync(exportDir)) {
    return res.json([]);
  }

  const files = [];
  const scanDir = (dir, base = '') => {
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const relPath = base ? `${base}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          scanDir(path.join(dir, entry.name), relPath);
        } else if (entry.name.endsWith('.pdf')) {
          const stat = fs.statSync(path.join(dir, entry.name));
          files.push({
            filename: relPath,
            sizeBytes: stat.size,
            createdAt: stat.birthtime.toISOString(),
            modifiedAt: stat.mtime.toISOString(),
          });
        }
      }
    } catch {
      // skip inaccessible directories
    }
  };

  scanDir(exportDir);
  files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(files);
});

// GET – download a specific PDF via query param
// /api/exports/download?file=ChildName/report.pdf
router.get('/download', (req, res) => {
  const exportDir = getExportDir();
  const filePath = resolveSafePath(exportDir, req.query.file);

  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.download(filePath);
});

// DELETE – remove a specific PDF via query param
// DELETE /api/exports/delete?file=ChildName/report.pdf
router.delete('/delete', (req, res) => {
  const exportDir = getExportDir();
  const filePath = resolveSafePath(exportDir, req.query.file);

  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  fs.unlinkSync(filePath);
  res.json({ ok: true });
});

export default router;
