/**
 * server/routes/settings.js
 * REST API for global app settings
 * GET  /api/settings
 * POST /api/settings
 */

import { Router } from 'express';
import { readDb, writeDb } from '../utils/db.js';

const router = Router();

router.get('/', (_req, res) => {
  const db = readDb();
  res.json({
    ...db.settings,
    databaseEngine: 'SQLite',
    journalMode: 'WAL',
  });
});

router.post('/', (req, res) => {
  const db = readDb();
  db.settings = { ...db.settings, ...req.body };
  writeDb(db);
  res.json(db.settings);
});

export default router;
