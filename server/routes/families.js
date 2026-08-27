/**
 * server/routes/families.js
 * Family management, member roles, and invitation codes
 */

import crypto from 'node:crypto';
import express from 'express';
import { readDb, writeDb } from '../utils/db.js';
import { requireAuth, getUserFamilyRole } from '../middleware/auth.js';

const router = express.Router();

/**
 * Helper to generate a guaranteed unique random 6-character alphanumeric invite code (e.g. "K7M9P2")
 * Never reuses a code that has already been generated or consumed.
 */
function generateInviteCode(existingInvites = [], usedInvites = []) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const existingCodes = new Set([
    ...(existingInvites || []).map((inv) => inv.code),
    ...(usedInvites || []).map((code) => (typeof code === 'string' ? code : code.code)),
  ]);

  let code = '';
  let attempts = 0;

  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      const randIndex = crypto.randomInt(0, chars.length);
      code += chars.charAt(randIndex);
    }
    attempts++;
  } while (existingCodes.has(code) && attempts < 100);

  return code;
}

/**
 * PUT /api/families/:familyId
 * Updates family name and avatar/icon (admin only)
 */
router.put('/:familyId', requireAuth, (req, res) => {
  const { familyId } = req.params;
  const rawName = typeof req.body?.name === 'string' ? req.body.name.trim() : null;
  const { avatar } = req.body || {};

  if (req.body?.name !== undefined && !rawName) {
    return res.status(400).json({ error: 'Familienname darf nicht leer sein.' });
  }

  const db = readDb();
  const family = db.families.find((f) => f.id === familyId);

  if (!family) {
    return res.status(404).json({ error: 'Familie nicht gefunden.' });
  }

  const role = getUserFamilyRole(family, req.user.id);
  if (role !== 'admin' && role !== 'editor') {
    return res
      .status(403)
      .json({ error: 'Nur Administratoren oder Eltern (Editoren) dürfen Familiendetails ändern.' });
  }

  if (rawName !== null) {
    family.name = rawName;
  }
  if (avatar !== undefined) {
    family.avatar = avatar; // base64 data URI or image URL or null
  }

  writeDb(db);

  return res.json({
    message: 'Familie erfolgreich aktualisiert.',
    family: {
      id: family.id,
      name: family.name,
      avatar: family.avatar || null,
      role,
      isOwner: family.ownerId === req.user.id,
    },
  });
});

/**
 * GET /api/families/:familyId
 * Gets details of a family (members, roles, invite codes)
 */
router.get('/:familyId', requireAuth, (req, res) => {
  const { familyId } = req.params;
  const db = readDb();
  const family = db.families.find((f) => f.id === familyId);

  if (!family) {
    return res.status(404).json({ error: 'Familie nicht gefunden.' });
  }

  const role = getUserFamilyRole(family, req.user.id);
  if (!role) {
    return res.status(403).json({ error: 'Kein Zugriff auf diese Familie.' });
  }

  // Populate member names & emails
  const members = (family.members || []).map((m) => {
    const u = db.users.find((user) => user.id === m.userId);
    return {
      userId: m.userId,
      role: m.role,
      name: u ? u.name : 'Unbekannt',
      email: u ? u.email : '',
      avatar: u?.avatar || null,
      joinedAt: m.joinedAt,
    };
  });

  // Include active invites for this family if admin or editor
  const familyInvites =
    role !== 'viewer' ? db.invites.filter((inv) => inv.familyId === familyId) : [];

  return res.json({
    id: family.id,
    name: family.name,
    avatar: family.avatar || null,
    isOwner: family.ownerId === req.user.id,
    currentRole: role,
    members,
    invites: familyInvites,
  });
});

/**
 * POST /api/families
 * Creates a new family
 */
router.post('/', requireAuth, (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  if (!name) {
    return res.status(400).json({ error: 'Familienname ist erforderlich.' });
  }

  const db = readDb();
  const newFamilyId = `fam-${Date.now()}`;
  const newFamily = {
    id: newFamilyId,
    name,
    ownerId: req.user.id,
    members: [{ userId: req.user.id, role: 'admin', joinedAt: new Date().toISOString() }],
    createdAt: new Date().toISOString(),
  };

  db.families.push(newFamily);
  writeDb(db);

  return res.status(201).json({
    family: {
      id: newFamily.id,
      name: newFamily.name,
      role: 'admin',
      isOwner: true,
      memberCount: 1,
    },
  });
});

/**
 * POST /api/families/:familyId/invites
 * Creates an invite code for members (role: 'editor' or 'viewer')
 */
router.post('/:familyId/invites', requireAuth, (req, res) => {
  const { familyId } = req.params;
  const { role = 'editor' } = req.body;

  const db = readDb();
  const family = db.families.find((f) => f.id === familyId);

  if (!family) {
    return res.status(404).json({ error: 'Familie nicht gefunden.' });
  }

  const userRole = getUserFamilyRole(family, req.user.id);
  if (!userRole) {
    return res
      .status(403)
      .json({ error: 'Zugriff verweigert: Sie gehören nicht zu dieser Familie.' });
  }
  if (userRole === 'viewer') {
    return res.status(403).json({ error: 'Betrachter dürfen keine Einladungen erstellen.' });
  }

  const inviteCode = generateInviteCode(db.invites);
  const newInvite = {
    code: inviteCode,
    familyId,
    familyName: family.name,
    createdBy: req.user.id,
    createdByName: req.user.name,
    role: role === 'viewer' ? 'viewer' : 'editor',
    createdAt: new Date().toISOString(),
  };

  db.invites.push(newInvite);
  writeDb(db);

  return res.status(201).json(newInvite);
});

/**
 * DELETE /api/families/:familyId/invites/:code
 * Revokes an existing invite code
 */
router.delete('/:familyId/invites/:code', requireAuth, (req, res) => {
  const { familyId, code } = req.params;
  const db = readDb();
  const family = db.families.find((f) => f.id === familyId);

  if (!family) {
    return res.status(404).json({ error: 'Familie nicht gefunden.' });
  }

  const userRole = getUserFamilyRole(family, req.user.id);
  if (!userRole) {
    return res
      .status(403)
      .json({ error: 'Zugriff verweigert: Sie gehören nicht zu dieser Familie.' });
  }
  if (userRole === 'viewer') {
    return res.status(403).json({ error: 'Keine Berechtigung zum Löschen von Einladungen.' });
  }

  const initialCount = db.invites.length;
  db.invites = db.invites.filter(
    (inv) => !(inv.familyId === familyId && inv.code === code.toUpperCase())
  );

  if (db.invites.length < initialCount) {
    writeDb(db);
    return res.json({ ok: true, message: 'Einladungscode widerrufen.' });
  }

  return res.status(404).json({ error: 'Einladungscode nicht gefunden.' });
});

/**
 * POST /api/families/join
 * Joins a family using an invite code
 */
router.post('/join', requireAuth, (req, res) => {
  const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
  if (!code) {
    return res.status(400).json({ error: 'Einladungscode ist erforderlich.' });
  }

  const normalizedCode = code.toUpperCase();
  const db = readDb();
  const invite = db.invites.find((inv) => inv.code === normalizedCode);

  if (!invite) {
    return res.status(404).json({ error: 'Ungültiger oder abgelaufener Einladungscode.' });
  }

  const family = db.families.find((f) => f.id === invite.familyId);
  if (!family) {
    return res.status(404).json({ error: 'Die zugehörige Familie existiert nicht mehr.' });
  }

  family.members = family.members || [];
  const existingMember = family.members.find((m) => m.userId === req.user.id);

  if (existingMember) {
    return res.json({
      message: `Sie sind bereits Mitglied der ${family.name}.`,
      family: {
        id: family.id,
        name: family.name,
        role: existingMember.role,
        isOwner: family.ownerId === req.user.id,
      },
    });
  }

  const assignedRole = invite.role || 'editor';
  family.members.push({
    userId: req.user.id,
    role: assignedRole,
    joinedAt: new Date().toISOString(),
  });

  // Single-use: Consume and permanently delete the invite code
  db.invites = db.invites.filter((inv) => inv.code !== normalizedCode);
  db.usedInvites = db.usedInvites || [];
  db.usedInvites.push({
    code: normalizedCode,
    familyId: family.id,
    usedBy: req.user.id,
    usedAt: new Date().toISOString(),
  });

  writeDb(db);

  return res.json({
    message: `Erfolgreich ${family.name} als ${assignedRole === 'viewer' ? 'Besucher' : 'Elternteil'} beigetreten!`,
    family: {
      id: family.id,
      name: family.name,
      role: assignedRole,
      isOwner: family.ownerId === req.user.id,
    },
  });
});

/**
 * DELETE /api/families/:familyId/members/:userId
 * Removes a member from the family (admin only)
 */
router.delete('/:familyId/members/:userId', requireAuth, (req, res) => {
  const { familyId, userId } = req.params;
  const db = readDb();
  const family = db.families.find((f) => f.id === familyId);

  if (!family) {
    return res.status(404).json({ error: 'Familie nicht gefunden.' });
  }

  const userRole = getUserFamilyRole(family, req.user.id);
  if (userRole !== 'admin') {
    return res.status(403).json({ error: 'Nur Administratoren dürfen Mitglieder entfernen.' });
  }

  if (family.ownerId === userId) {
    return res.status(400).json({ error: 'Der Familieninhaber kann nicht entfernt werden.' });
  }

  family.members = (family.members || []).filter((m) => m.userId !== userId);
  writeDb(db);

  return res.json({ message: 'Mitglied erfolgreich entfernt.' });
});

/**
 * DELETE /api/families/:familyId
 * Deletes a family, all its child profiles and associated records (owner/admin only)
 */
router.delete('/:familyId', requireAuth, (req, res) => {
  const { familyId } = req.params;
  const db = readDb();
  const familyIndex = db.families.findIndex((f) => f.id === familyId);

  if (familyIndex === -1) {
    return res.status(404).json({ error: 'Familie nicht gefunden.' });
  }

  const family = db.families[familyIndex];
  const userRole = getUserFamilyRole(family, req.user.id);
  const isOwner = family.ownerId === req.user.id;

  if (!isOwner && userRole !== 'admin') {
    return res
      .status(403)
      .json({ error: 'Nur der Inhaber oder ein Administrator darf die Familie löschen.' });
  }

  // Remove family
  db.families.splice(familyIndex, 1);

  // Remove child profiles belonging to this family
  db.profiles = (db.profiles || []).filter((p) => p.familyId !== familyId);

  // Remove invites for this family
  db.invites = (db.invites || []).filter((inv) => inv.familyId !== familyId);
  db.usedInvites = (db.usedInvites || []).filter((inv) => inv.familyId !== familyId);

  // If the user's activeFamilyId was this family, switch to another family if available
  const user = db.users.find((u) => u.id === req.user.id);
  if (user && user.activeFamilyId === familyId) {
    const nextFamily = db.families.find(
      (f) => f.ownerId === req.user.id || (f.members || []).some((m) => m.userId === req.user.id)
    );
    user.activeFamilyId = nextFamily ? nextFamily.id : null;
  }

  writeDb(db);

  return res.json({ message: 'Familie und alle zugehörigen Daten wurden erfolgreich gelöscht.' });
});

export default router;
