import { Router } from 'express';
import { readDb, writeDb } from '../utils/db.js';
import { requireAuth, requireInstanceAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/settings – authenticated app settings
router.get('/', requireAuth, (req, res) => {
  const db = readDb();
  const safeSettings = { ...db.settings };
  // Never expose sensitive keys in client response
  delete safeSettings.jwt_secret;
  delete safeSettings.media_master_key;

  res.json({
    ...safeSettings,
    databaseEngine: 'SQLite',
    journalMode: 'WAL',
  });
});

// POST /api/settings – update app settings (strictly requires Instance-Admin RBAC)
router.post('/', requireAuth, requireInstanceAdmin, (req, res) => {
  const db = readDb();
  const updates = { ...req.body };

  // Protect internal infrastructure settings from unauthorized overwrite
  delete updates.jwt_secret;
  delete updates.media_master_key;
  delete updates.databaseEngine;
  delete updates.journalMode;

  db.settings = { ...db.settings, ...updates };
  writeDb(db);

  const responseSettings = { ...db.settings };
  delete responseSettings.jwt_secret;
  delete responseSettings.media_master_key;

  res.json(responseSettings);
});

export default router;
