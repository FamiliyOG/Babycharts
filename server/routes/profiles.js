/**
 * server/routes/profiles.js
 * REST API for child profile CRUD with family association & role-based permissions
 */

import { Router } from 'express';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { readDb, writeDb, getProfileById, restoreProfile, softDeleteProfile } from '../utils/db.js';
import { rescheduleAll } from '../scheduler.js';
import { requireAuth, getUserFamilyRole, JWT_SECRET } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { ProfileInputSchema } from '../validators/schemas.js';

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

// GET all profiles (strictly restricted to user's authorized family)
router.get('/', requireAuth, (req, res) => {
  const { familyId } = req.query;
  const db = readDb();

  // Find all families the authenticated user belongs to
  const userFamilies = db.families.filter(
    (f) => f.ownerId === req.user.id || f.members?.some((m) => m.userId === req.user.id)
  );
  const userFamilyIds = new Set(userFamilies.map((f) => f.id));

  // If a specific familyId is queried, verify the user has access to it
  if (familyId) {
    if (!userFamilyIds.has(familyId)) {
      return res
        .status(403)
        .json({ error: 'Zugriff verweigert: Sie gehören nicht zu dieser Familie.' });
    }
    return res.json(db.profiles.filter((p) => p.familyId === familyId));
  }

  // Return profiles across all authorized families for the user
  return res.json(db.profiles.filter((p) => p.familyId && userFamilyIds.has(p.familyId)));
});

// GET single profile (strictly restricted to authorized family members)
router.get('/:id', requireAuth, (req, res) => {
  const db = readDb();
  const profile = db.profiles.find((p) => p.id === req.params.id);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });

  // If profile belongs to a family, verify user's access
  if (profile.familyId) {
    const family = db.families.find((f) => f.id === profile.familyId);
    const role = getUserFamilyRole(family, req.user.id);
    if (!role) {
      return res
        .status(403)
        .json({ error: 'Zugriff verweigert: Sie gehören nicht zu dieser Familie.' });
    }
  } else {
    // Legacy unassigned profiles require user to own a family or be assigned
    return res
      .status(403)
      .json({ error: 'Zugriff verweigert: Profil ist keiner Familie zugewiesen.' });
  }

  return res.json(profile);
});

// GET /api/profiles/share/doctor-view – Dedicated temporary read-only doctor viewer (BC-231, Issue #176)
router.get('/share/doctor-view', (req, res) => {
  const rawToken = req.query.token;
  if (typeof rawToken !== 'string' || !rawToken.trim()) {
    return res.status(400).json({ error: 'Token erforderlich.' });
  }

  try {
    const decoded = jwt.verify(rawToken.trim(), JWT_SECRET);
    if (decoded.scope !== 'doctor_share' || !decoded.profileId || !decoded.shareId) {
      return res.status(403).json({ error: 'Ungültiger Freigabe-Token.' });
    }

    const db = readDb();
    // Check if share was revoked
    const tokenHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
    const shareEntry = (db.doctorShares || []).find((s) => s.id === decoded.shareId);
    if (shareEntry && (shareEntry.revoked || shareEntry.tokenHash !== tokenHash)) {
      return res.status(401).json({ error: 'Dieser Arzt-Freigabelink wurde widerrufen.' });
    }

    const profile = db.profiles.find((p) => p.id === decoded.profileId);
    if (!profile) {
      return res.status(404).json({ error: 'Profil nicht mehr vorhanden.' });
    }

    return res.json({
      id: profile.id,
      name: profile.name,
      gender: profile.gender,
      birthdate: profile.birthdate,
      bloodType: profile.bloodType,
      measurements: profile.measurements || [],
      uCheckups: profile.uCheckups || {},
      vaccines: profile.vaccines || {},
      isDoctorShareView: true,
    });
  } catch {
    return res.status(401).json({ error: 'Der Arzt-Freigabelink ist abgelaufen oder ungültig.' });
  }
});

// POST /api/profiles/:id/doctor-share – generate temporary read-only QR share token with revocable hash (BC-231, Issue #176)
router.post('/:id/doctor-share', requireAuth, (req, res) => {
  const db = readDb();
  const profile = db.profiles.find((p) => p.id === req.params.id);
  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  if (profile.familyId) {
    const family = db.families.find((f) => f.id === profile.familyId);
    const role = getUserFamilyRole(family, req.user.id);
    if (!role) {
      return res.status(403).json({ error: 'Zugriff verweigert.' });
    }
  }

  const durationStr = req.body?.duration || '24h';
  const validDurations = {
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
  };
  const durationMs = validDurations[durationStr] || validDurations['24h'];
  const expiresAt = new Date(Date.now() + durationMs).toISOString();

  const shareId = `dshare-${crypto.randomBytes(8).toString('hex')}`;
  const shareToken = jwt.sign(
    {
      scope: 'doctor_share',
      shareId,
      profileId: profile.id,
      generatedBy: req.user.id,
    },
    JWT_SECRET,
    { expiresIn: durationStr }
  );

  const tokenHash = crypto.createHash('sha256').update(shareToken).digest('hex');
  if (!db.doctorShares) {
    db.doctorShares = [];
  }
  db.doctorShares.push({
    id: shareId,
    profileId: profile.id,
    tokenHash,
    expiresAt,
    createdBy: req.user.id,
    revoked: false,
    createdAt: new Date().toISOString(),
  });
  writeDb(db);

  return res.json({
    shareId,
    shareToken,
    expiresAt,
    expiresIn: durationStr,
    shareUrl: `/api/profiles/share/doctor-view?token=${shareToken}`,
  });
});

// POST /api/profiles/:id/doctor-share/:shareId/revoke – Revoke an active doctor share link (BC-231)
router.post('/:id/doctor-share/:shareId/revoke', requireAuth, (req, res) => {
  const db = readDb();
  const profile = db.profiles.find((p) => p.id === req.params.id);
  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  if (profile.familyId) {
    const family = db.families.find((f) => f.id === profile.familyId);
    const role = getUserFamilyRole(family, req.user.id);
    if (!role || role === 'viewer') {
      return res.status(403).json({ error: 'Zugriff verweigert.' });
    }
  }

  if (!db.doctorShares) db.doctorShares = [];
  const share = db.doctorShares.find(
    (s) => s.id === req.params.shareId && s.profileId === profile.id
  );
  if (!share) {
    return res.status(404).json({ error: 'Freigabe nicht gefunden.' });
  }

  share.revoked = true;
  share.revokedAt = new Date().toISOString();
  writeDb(db);

  return res.json({ ok: true, message: 'Arzt-Freigabe wurde erfolgreich widerrufen.' });
});

// POST – bulk import profiles (scoped strictly to user's authorized family)
router.post('/import', requireAuth, (req, res) => {
  const { profiles, familyId } = req.body;
  if (!Array.isArray(profiles)) {
    return res.status(400).json({ error: 'Expected { profiles: [] }' });
  }
  const db = readDb();

  // Determine target family: explicitly passed or active user family
  let targetFamilyId = familyId;
  if (!targetFamilyId) {
    const userFamily = db.families.find(
      (f) =>
        f.ownerId === req.user.id ||
        f.members?.some((m) => m.userId === req.user.id && m.role !== 'viewer')
    );
    if (userFamily) {
      targetFamilyId = userFamily.id;
    }
  }

  if (!targetFamilyId) {
    return res.status(400).json({ error: 'familyId ist erforderlich für den Import.' });
  }

  const permError = checkFamilyWritePermission(
    targetFamilyId,
    req.user.id,
    db,
    'keine Profile importieren'
  );
  if (permError) {
    return res.status(permError.status).json({ error: permError.error });
  }

  const importedMap = new Map();
  for (const p of profiles) {
    if (!p?.id || !p.name) continue;
    importedMap.set(p.id, {
      ...p,
      familyId: targetFamilyId,
      schedule: p.schedule ?? defaultSchedule(),
    });
  }

  // Replace or add only within this target context
  const existingOtherProfiles = db.profiles.filter(
    (p) => p.familyId !== targetFamilyId || !importedMap.has(p.id)
  );

  db.profiles = [...existingOtherProfiles, ...importedMap.values()];

  writeDb(db);
  rescheduleAll();
  return res.json({ ok: true, count: importedMap.size });
});

/** Helper to check family write permission */
function checkFamilyWritePermission(familyId, userId, db, actionLabel) {
  if (!familyId) {
    return {
      status: 400,
      error: 'familyId ist erforderlich. Profile müssen einer Familie zugewiesen sein.',
    };
  }
  const family = db.families.find((f) => f.id === familyId);
  if (!family) {
    return { status: 404, error: 'Familie nicht gefunden.' };
  }
  const role = getUserFamilyRole(family, userId);
  if (!role) {
    return { status: 403, error: 'Zugriff verweigert: Sie gehören nicht zu dieser Familie.' };
  }
  if (role === 'viewer') {
    return {
      status: 403,
      error: `Betrachter dürfen ${actionLabel || 'keine Änderungen vornehmen'}.`,
    };
  }
  return null;
}

// POST – single profile creation (strictly requires familyId and editor/admin role)
router.post('/', requireAuth, validateBody(ProfileInputSchema), (req, res) => {
  const data = req.body;
  if (!data.id || !data.name) {
    return res.status(400).json({ error: 'id and name are required' });
  }

  const db = readDb();
  if (db.profiles.some((p) => p.id === data.id)) {
    return res.status(409).json({ error: 'Profile already exists' });
  }

  // Resolve target family: if data.familyId missing, find the user's active/owned family
  let targetFamilyId = data.familyId;
  if (!targetFamilyId) {
    const userFamily = db.families.find(
      (f) =>
        f.ownerId === req.user.id ||
        f.members?.some((m) => m.userId === req.user.id && m.role !== 'viewer')
    );
    if (userFamily) {
      targetFamilyId = userFamily.id;
    }
  }

  // Verify family write permissions strictly
  const permError = checkFamilyWritePermission(
    targetFamilyId,
    req.user.id,
    db,
    'keine neuen Kinder anlegen'
  );
  if (permError) {
    return res.status(permError.status).json({ error: permError.error });
  }

  const profile = {
    ...data,
    familyId: targetFamilyId,
    schedule: data.schedule ?? defaultSchedule(),
  };

  db.profiles.push(profile);
  writeDb(db);
  rescheduleAll();
  return res.status(201).json(profile);
});

const ALLOWED_PROFILE_KEYS = [
  'name',
  'birthdate',
  'dob',
  'gender',
  'bloodType',
  'measurements',
  'milestones',
  'customMilestones',
  'teeth',
  'uCheckups',
  'vaccinations',
  'vaccines',
  'healthLog',
  'allergies',
  'conditions',
  'notes',
  'avatar',
  'familyId',
];

/** Merges updated profile fields into existing profile safely */
function applyProfileUpdates(existingProfile, body, profileId) {
  const updated = { ...existingProfile, id: profileId };
  if (!body || typeof body !== 'object') return updated;

  for (const key of ALLOWED_PROFILE_KEYS) {
    if (body[key] !== undefined) {
      updated[key] = body[key];
    }
  }

  updated.schedule = body.schedule ?? existingProfile.schedule ?? defaultSchedule();
  return updated;
}

// PUT – update profile (requires editor or admin role in profile's family)
router.put('/:id', requireAuth, (req, res) => {
  const db = readDb();
  const idx = db.profiles.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Profile not found' });

  const existingProfile = db.profiles[idx];

  // Verify permissions in existing profile's family
  const permError = checkFamilyWritePermission(
    existingProfile.familyId,
    req.user.id,
    db,
    'keine Änderungen vornehmen'
  );
  if (permError) {
    return res.status(permError.status).json({ error: permError.error });
  }

  // If changing familyId in update, verify user has write access to target family
  if (req.body?.familyId && req.body.familyId !== existingProfile.familyId) {
    const targetPermError = checkFamilyWritePermission(
      req.body.familyId,
      req.user.id,
      db,
      'keine Änderungen an der Zielfamilie vornehmen'
    );
    if (targetPermError) {
      return res.status(targetPermError.status).json({ error: targetPermError.error });
    }
  }

  // Optimistic concurrency check (BC-237): reject if client version does not strictly match current stored version
  if (req.body?.version !== undefined && existingProfile.version !== undefined) {
    if (Number(req.body.version) !== existingProfile.version) {
      return res.status(409).json({
        error:
          'Konflikt: Das Profil wurde zwischenzeitlich von einem anderen Benutzer geändert. Bitte laden Sie die Daten neu.',
        currentVersion: existingProfile.version,
      });
    }
  }

  const updatedProfile = applyProfileUpdates(existingProfile, req.body, req.params.id);
  updatedProfile.version = (existingProfile.version || 1) + 1;
  db.profiles.splice(idx, 1, updatedProfile);

  writeDb(db);
  rescheduleAll();
  return res.json(updatedProfile);
});

// POST – restore soft-deleted profile (BC-220)
router.post('/:id/restore', requireAuth, (req, res) => {
  const profile = getProfileById(req.params.id, true);
  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  const db = readDb();
  const permError = checkFamilyWritePermission(
    profile.familyId,
    req.user.id,
    db,
    'keine Profile wiederherstellen'
  );
  if (permError) {
    return res.status(permError.status).json({ error: permError.error });
  }

  restoreProfile(req.params.id);
  rescheduleAll();
  return res.json({ ok: true, message: 'Profil erfolgreich wiederhergestellt.' });
});

// DELETE – remove profile (requires editor or admin role in profile's family)
router.delete('/:id', requireAuth, (req, res) => {
  const db = readDb();
  const existingProfile = db.profiles.find((p) => p.id === req.params.id);
  if (!existingProfile) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  const permError = checkFamilyWritePermission(
    existingProfile.familyId,
    req.user.id,
    db,
    'keine Profile löschen'
  );
  if (permError) {
    return res.status(permError.status).json({ error: permError.error });
  }

  // Support soft-delete (BC-220) or permanent deletion via ?permanent=true
  const isPermanent = req.query.permanent === 'true';
  if (!isPermanent) {
    softDeleteProfile(req.params.id);
  } else {
    const idx = db.profiles.findIndex((p) => p.id === req.params.id);
    db.profiles.splice(idx, 1);
    writeDb(db);
  }

  rescheduleAll();
  return res.json({ ok: true });
});

export default router;
