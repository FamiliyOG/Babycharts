/**
 * server/routes/families.js
 * Family management, member roles, and invitation codes
 */

import crypto from 'node:crypto';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { readDb, writeDb } from '../utils/db.js';
import { requireAuth, getUserFamilyRole } from '../middleware/auth.js';

const router = express.Router();

// ── Rate Limiters for Invitations ───────────────────────────────────────────
export const inviteCreateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // max 20 invites created per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Einladungen erstellt. Bitte warten Sie einige Minuten.' },
});

export const inviteJoinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // max 15 join attempts per 15 min per IP (prevents brute-forcing codes)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Einlöseversuche. Bitte warten Sie 15 Minuten.' },
});

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
 * POST /api/families/:familyId/transfer-ownership
 * Transfers family ownership to another member (owner only, BC-044)
 */
router.post('/:familyId/transfer-ownership', requireAuth, (req, res) => {
  const { familyId } = req.params;
  const { newOwnerId } = req.body || {};

  if (!newOwnerId || typeof newOwnerId !== 'string') {
    return res.status(400).json({ error: 'newOwnerId ist erforderlich.' });
  }

  const db = readDb();
  const family = db.families.find((f) => f.id === familyId);

  if (!family) {
    return res.status(404).json({ error: 'Familie nicht gefunden.' });
  }

  // Only the current owner can transfer ownership
  if (family.ownerId !== req.user.id) {
    return res
      .status(403)
      .json({ error: 'Nur der aktuelle Inhaber darf die Inhaberschaft übertragen.' });
  }

  if (newOwnerId === req.user.id) {
    return res.status(400).json({ error: 'Sie sind bereits der Inhaber dieser Familie.' });
  }

  const targetMember = (family.members || []).find((m) => m.userId === newOwnerId);
  if (!targetMember) {
    return res
      .status(404)
      .json({ error: 'Der neue Inhaber muss bereits Mitglied dieser Familie sein.' });
  }

  const previousOwnerId = family.ownerId;
  family.ownerId = newOwnerId;
  targetMember.role = 'admin'; // New owner is guaranteed admin

  // Previous owner remains an admin member
  const prevOwnerMember = (family.members || []).find((m) => m.userId === previousOwnerId);
  if (prevOwnerMember) {
    prevOwnerMember.role = 'admin';
  } else {
    family.members.push({
      userId: previousOwnerId,
      role: 'admin',
      joinedAt: new Date().toISOString(),
    });
  }

  writeDb(db);

  console.log(
    `\x1b[35m[OWNER TRANSFER ${new Date().toISOString()}]\x1b[0m Family ${family.name} (${family.id}) ownership transferred from ${previousOwnerId} to ${newOwnerId}`
  );

  return res.json({
    message: 'Inhaberschaft der Familie erfolgreich übertragen.',
    family,
  });
});

/**
 * POST /api/families/:familyId/invites
 * Creates an invite code for members with configurable expiration time & max uses (BC-045, BC-046, BC-047)
 * Supports:
 * - expiresInHours: 1, 24, 48, 168 (7 days), 720 (30 days), defaults to 48 hours.
 * - maxUses: 1 (single-use), 3, 5, 10, or 0 (unlimited within expiry), defaults to 1.
 */
router.post('/:familyId/invites', requireAuth, inviteCreateLimiter, (req, res) => {
  const { familyId } = req.params;
  const { role = 'editor', expiresInHours = 48, maxUses = 1 } = req.body;

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

  // Validate and constrain expiration time (minimum 1 hour, maximum 720 hours = 30 days)
  const parsedHours = Number.parseInt(expiresInHours, 10);
  const validHours =
    !Number.isNaN(parsedHours) && parsedHours >= 1 && parsedHours <= 720 ? parsedHours : 48;
  const expiresAt = new Date(Date.now() + validHours * 60 * 60 * 1000).toISOString();

  // BC-047: Validate maxUses (0 = unlimited, 1..50)
  const parsedUses = Number.parseInt(maxUses, 10);
  const validMaxUses =
    !Number.isNaN(parsedUses) && parsedUses >= 0 && parsedUses <= 50 ? parsedUses : 1;

  const inviteCode = generateInviteCode(db.invites);
  const newInvite = {
    code: inviteCode,
    familyId,
    familyName: family.name,
    createdBy: req.user.id,
    createdByName: req.user.name,
    role: role === 'viewer' ? 'viewer' : 'editor',
    createdAt: new Date().toISOString(),
    expiresAt,
    maxUses: validMaxUses,
    usesCount: 0,
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
 * Joins a family using an invite code (enforces max uses and expiration timestamp, BC-045, BC-047)
 */
router.post('/join', requireAuth, inviteJoinLimiter, (req, res) => {
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

  // BC-045: Check if invite code has expired
  if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) {
    // Clean up expired code from DB
    db.invites = db.invites.filter((inv) => inv.code !== normalizedCode);
    writeDb(db);
    return res
      .status(400)
      .json({ error: 'Dieser Einladungscode ist abgelaufen. Bitte fordern Sie einen neuen an.' });
  }

  // BC-047: Check if max uses reached
  const currentUses = invite.usesCount || 0;
  const maxUses = invite.maxUses !== undefined ? invite.maxUses : 1;
  if (maxUses > 0 && currentUses >= maxUses) {
    db.invites = db.invites.filter((inv) => inv.code !== normalizedCode);
    writeDb(db);
    return res
      .status(400)
      .json({ error: 'Dieser Einladungscode hat die maximale Anzahl an Verwendungen erreicht.' });
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

  // BC-047: Increment usesCount and cleanup if max reached
  invite.usesCount = (invite.usesCount || 0) + 1;
  if (maxUses > 0 && invite.usesCount >= maxUses) {
    db.invites = db.invites.filter((inv) => inv.code !== normalizedCode);
  }

  db.usedInvites = db.usedInvites || [];
  db.usedInvites.push({
    code: `${normalizedCode}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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
 * PUT /api/families/:familyId/members/:userId
 * Updates a member's role in the family (admin only, Issue BC-039, BC-040)
 */
router.put('/:familyId/members/:userId', requireAuth, (req, res) => {
  const { familyId, userId } = req.params;
  const { role } = req.body || {};

  const ALLOWED_ROLES = ['admin', 'editor', 'viewer'];
  if (!role || !ALLOWED_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Ungültige Rolle. Erlaubt sind: admin, editor, viewer.' });
  }

  const db = readDb();
  const family = db.families.find((f) => f.id === familyId);

  if (!family) {
    return res.status(404).json({ error: 'Familie nicht gefunden.' });
  }

  const userRole = getUserFamilyRole(family, req.user.id);
  if (userRole !== 'admin') {
    return res.status(403).json({ error: 'Nur Administratoren dürfen Mitgliedsrollen ändern.' });
  }

  // BC-043: Prevent modifying the owner's role
  if (family.ownerId === userId) {
    return res
      .status(400)
      .json({ error: 'Die Rolle des Familieninhabers kann nicht geändert werden (Owner-Schutz).' });
  }

  const member = (family.members || []).find((m) => m.userId === userId);
  if (!member) {
    return res.status(404).json({ error: 'Mitglied nicht in dieser Familie gefunden.' });
  }

  const oldRole = member.role;

  // BC-042: Protect the last admin in the family from being demoted
  if (oldRole === 'admin' && role !== 'admin') {
    const adminCount = (family.members || []).filter(
      (m) => m.role === 'admin' || m.userId === family.ownerId
    ).length;
    if (adminCount <= 1) {
      return res.status(400).json({
        error: 'Der letzte Administrator einer Familie kann nicht herabgestuft werden.',
      });
    }
  }

  member.role = role;
  writeDb(db);

  console.log(
    `\x1b[35m[ROLE CHANGE ${new Date().toISOString()}]\x1b[0m User ${req.user.email} changed role of ${userId} in family ${family.id} from ${oldRole} to ${role}`
  );

  return res.json({
    message: `Rolle erfolgreich auf "${role === 'admin' ? 'Administrator' : role === 'editor' ? 'Elternteil' : 'Besucher'}" geändert.`,
    member,
  });
});

/**
 * POST /api/families/:familyId/leave
 * Allows a member to leave a family (BC-041, BC-042, BC-043)
 */
router.post('/:familyId/leave', requireAuth, (req, res) => {
  const { familyId } = req.params;
  const db = readDb();
  const family = db.families.find((f) => f.id === familyId);

  if (!family) {
    return res.status(404).json({ error: 'Familie nicht gefunden.' });
  }

  // BC-043: The family owner cannot leave their own family (must delete it or transfer ownership)
  if (family.ownerId === req.user.id) {
    return res.status(400).json({
      error:
        'Als Inhaber können Sie die Familie nicht verlassen. Sie können die Familie stattdessen löschen.',
    });
  }

  const memberIndex = (family.members || []).findIndex((m) => m.userId === req.user.id);
  if (memberIndex === -1) {
    return res.status(400).json({ error: 'Sie sind kein Mitglied dieser Familie.' });
  }

  const member = family.members[memberIndex];

  // BC-042: If the member is an admin, ensure they are not the sole remaining admin
  if (member.role === 'admin') {
    const adminCount = (family.members || []).filter(
      (m) => m.role === 'admin' || m.userId === family.ownerId
    ).length;
    if (adminCount <= 1) {
      return res.status(400).json({
        error:
          'Sie sind der letzte Administrator. Bitte ernennen Sie ein anderes Mitglied zum Administrator, bevor Sie die Familie verlassen.',
      });
    }
  }

  // Remove the member from the family
  family.members.splice(memberIndex, 1);

  // If this family was the active family of the user, switch to another available family
  const user = db.users.find((u) => u.id === req.user.id);
  if (user && user.activeFamilyId === familyId) {
    const remainingFamily = db.families.find(
      (f) =>
        f.id !== familyId &&
        (f.ownerId === req.user.id || (f.members || []).some((m) => m.userId === req.user.id))
    );
    user.activeFamilyId = remainingFamily ? remainingFamily.id : null;
  }

  writeDb(db);

  console.log(
    `\x1b[35m[FAMILY LEAVE ${new Date().toISOString()}]\x1b[0m User ${req.user.email} left family ${family.name} (${family.id})`
  );

  return res.json({
    message: `Sie haben die Familie "${family.name}" erfolgreich verlassen.`,
  });
});

/**
 * DELETE /api/families/:familyId/members/:userId
 * Removes a member from the family (admin only, BC-042, BC-043)
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

  // BC-043: Owner protection
  if (family.ownerId === userId) {
    return res
      .status(400)
      .json({ error: 'Der Familieninhaber kann nicht entfernt werden (Owner-Schutz).' });
  }

  const targetMember = (family.members || []).find((m) => m.userId === userId);
  if (!targetMember) {
    return res.status(404).json({ error: 'Mitglied nicht in dieser Familie gefunden.' });
  }

  // BC-042: Protect the last admin
  if (targetMember.role === 'admin') {
    const adminCount = (family.members || []).filter(
      (m) => m.role === 'admin' || m.userId === family.ownerId
    ).length;
    if (adminCount <= 1) {
      return res.status(400).json({
        error: 'Der letzte Administrator einer Familie kann nicht entfernt werden.',
      });
    }
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
