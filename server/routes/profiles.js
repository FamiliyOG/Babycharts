/**
 * server/routes/profiles.js
 * REST API for child profile CRUD with family association & role-based permissions
 */

import { Router } from 'express';
import { readDb, writeDb } from '../utils/db.js';
import { rescheduleAll } from '../scheduler.js';
import { optionalAuth, requireAuth, getUserFamilyRole } from '../middleware/auth.js';

const router = Router();

/** Default schedule object for new profiles */
function defaultSchedule() {
  return {
    enabled: false,
    frequency: 'daily',
    intervalDays: 7,
    lastExportAt: null,
  };
}

// GET all profiles (strictly filtered by familyId if provided, or user's active family)
router.get('/', optionalAuth, (req, res) => {
  const { familyId } = req.query;
  const db = readDb();

  if (familyId) {
    const familyProfiles = db.profiles.filter((p) => p.familyId === familyId);
    return res.json(familyProfiles);
  }

  // If user is authenticated, check their active family or only return their own families
  if (req.user) {
    const userFamilies = db.families.filter(
      (f) => f.ownerId === req.user.id || f.members?.some((m) => m.userId === req.user.id)
    );
    const userFamilyIds = new Set(userFamilies.map((f) => f.id));
    const profiles = db.profiles.filter((p) => p.familyId && userFamilyIds.has(p.familyId));
    return res.json(profiles);
  }

  // Fallback for non-authenticated legacy / public mode
  return res.json(db.profiles.filter((p) => !p.familyId));
});

// GET single profile
router.get('/:id', optionalAuth, (req, res) => {
  const db = readDb();
  const profile = db.profiles.find((p) => p.id === req.params.id);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  return res.json(profile);
});

// POST – bulk import profiles
router.post('/import', requireAuth, (req, res) => {
  const { profiles, familyId } = req.body;
  if (!Array.isArray(profiles)) {
    return res.status(400).json({ error: 'Expected { profiles: [] }' });
  }
  const db = readDb();

  // Check role in target family if provided
  if (familyId) {
    const family = db.families.find((f) => f.id === familyId);
    const role = getUserFamilyRole(family, req.user.id);
    if (role === 'viewer') {
      return res.status(403).json({ error: 'Betrachter haben keine Schreibrechte.' });
    }
  }

  db.profiles = profiles.map((p) => ({
    ...p,
    familyId: p.familyId || familyId || null,
    schedule: p.schedule ?? defaultSchedule(),
  }));

  writeDb(db);
  rescheduleAll();
  return res.json({ ok: true, count: db.profiles.length });
});

// POST – create single profile (requires editor or admin role)
router.post('/', requireAuth, (req, res) => {
  const data = req.body;
  if (!data.id || !data.name) {
    return res.status(400).json({ error: 'id and name are required' });
  }

  const db = readDb();
  if (db.profiles.some((p) => p.id === data.id)) {
    return res.status(409).json({ error: 'Profile already exists' });
  }

  // Verify family permissions if familyId is specified
  if (data.familyId) {
    const family = db.families.find((f) => f.id === data.familyId);
    const role = getUserFamilyRole(family, req.user.id);
    if (role === 'viewer') {
      return res.status(403).json({ error: 'Betrachter dürfen keine neuen Kinder anlegen.' });
    }
  }

  const profile = {
    ...data,
    familyId: data.familyId || null,
    schedule: data.schedule ?? defaultSchedule(),
  };

  db.profiles.push(profile);
  writeDb(db);
  rescheduleAll();
  return res.status(201).json(profile);
});

// PUT – update profile (requires editor or admin role)
router.put('/:id', requireAuth, (req, res) => {
  const db = readDb();
  const idx = db.profiles.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Profile not found' });

  const existingProfile = db.profiles[idx];

  // Verify permissions in profile's family
  if (existingProfile.familyId) {
    const family = db.families.find((f) => f.id === existingProfile.familyId);
    const role = getUserFamilyRole(family, req.user.id);
    if (role === 'viewer') {
      return res.status(403).json({ error: 'Betrachter dürfen keine Änderungen vornehmen.' });
    }
  }

  db.profiles[idx] = {
    ...existingProfile,
    ...req.body,
    id: req.params.id, // prevent id change
    schedule: req.body.schedule ?? existingProfile.schedule ?? defaultSchedule(),
  };

  writeDb(db);
  rescheduleAll();
  return res.json(db.profiles[idx]);
});

// DELETE – remove profile (requires editor or admin role)
router.delete('/:id', requireAuth, (req, res) => {
  const db = readDb();
  const existingProfile = db.profiles.find((p) => p.id === req.params.id);
  if (!existingProfile) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  if (existingProfile.familyId) {
    const family = db.families.find((f) => f.id === existingProfile.familyId);
    const role = getUserFamilyRole(family, req.user.id);
    if (role === 'viewer') {
      return res.status(403).json({ error: 'Betrachter dürfen keine Profile löschen.' });
    }
  }

  db.profiles = db.profiles.filter((p) => p.id !== req.params.id);
  writeDb(db);
  rescheduleAll();
  return res.json({ ok: true });
});

export default router;
