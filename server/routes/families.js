/**
 * server/routes/families.js
 * Family management, member roles, and invitation codes
 */

import crypto from 'node:crypto';
import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  readDb,
  writeDb,
  getVisitorGrants,
  setVisitorGrants,
  getActiveEmergencyAccess,
  grantEmergencyAccess,
  logSecurityEvent,
} from '../utils/db.js';
import { requireAuth, getUserFamilyRole, requireInstanceAdmin } from '../middleware/auth.js';
import { requireRecentAuth } from '../middleware/requireRecentAuth.js';
import { getFamilyAuditLogs, logFamilyAudit } from '../services/auditService.js';
import { decodeCursor, encodeCursor } from '../utils/cursor.js';

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
 * Helper to get family and verify member permissions
 */
export function getFamilyAndCheckAccess(db, familyId, userId, minRole = null) {
  const family = db.families.find((f) => f.id === familyId);
  if (!family) {
    return { error: 'Familie nicht gefunden.', status: 404 };
  }
  let userRole = getUserFamilyRole(family, userId);

  // Superadmin Privacy Isolation & Break-Glass Access (Issue #332):
  // Superadmins have NO silent bypass. Only if an active, audited emergency grant exists, admin access is granted.
  if (!userRole) {
    const activeEmergency = getActiveEmergencyAccess(familyId, userId);
    if (activeEmergency) {
      userRole = 'admin';
    }
  }

  if (!userRole) {
    return { error: 'Zugriff verweigert: Sie gehören nicht zu dieser Familie.', status: 403 };
  }
  if (minRole === 'editor' && userRole === 'viewer') {
    return {
      error: 'Keine ausreichenden Berechtigungen (mindestens Bearbeiter erforderlich).',
      status: 403,
    };
  }
  if (minRole === 'admin' && userRole !== 'admin') {
    return { error: 'Nur Administratoren dürfen diese Aktion ausführen.', status: 403 };
  }
  return { family, userRole };
}
router.put('/:familyId', requireAuth, (req, res) => {
  const { familyId } = req.params;
  const rawName = typeof req.body?.name === 'string' ? req.body.name.trim() : null;
  const { avatar } = req.body || {};

  if (req.body?.name !== undefined && !rawName) {
    return res.status(400).json({ error: 'Familienname darf nicht leer sein.' });
  }

  const db = readDb();
  const access = getFamilyAndCheckAccess(db, familyId, req.user.id, 'editor');
  if (access.error) {
    return res.status(access.status).json({ error: access.error });
  }
  const { family, userRole: role } = access;

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
  const access = getFamilyAndCheckAccess(db, familyId, req.user.id);
  if (access.error) {
    return res.status(access.status).json({ error: access.error });
  }
  const { family, userRole: role } = access;

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

  // Include active invites for this family (admins see all, parents see visitor invites or own invites, Issue #325)
  let familyInvites = [];
  if (role === 'admin') {
    familyInvites = db.invites.filter((inv) => inv.familyId === familyId);
  } else if (role === 'editor') {
    familyInvites = db.invites.filter(
      (inv) => inv.familyId === familyId && (inv.role === 'viewer' || inv.createdBy === req.user.id)
    );
  }

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
router.post('/:familyId/transfer-ownership', requireAuth, requireRecentAuth, (req, res) => {
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

  // Issue #326: Target member must be parent/admin, cannot be visitor
  if (targetMember.role === 'viewer') {
    return res.status(400).json({
      error: 'Inhaberschaft kann nur an ein Elternteil übertragen werden, nicht an einen Besucher.',
    });
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

  logFamilyAudit({
    familyId,
    userId: req.user.id,
    userName: req.user.name,
    action: 'FAMILY_OWNERSHIP_TRANSFER',
    details: `Inhaberschaft von ${previousOwnerId} an ${newOwnerId} übertragen`,
  });

  return res.json({
    message: 'Inhaberschaft der Familie erfolgreich übertragen.',
    family,
  });
});

/**
 * POST /api/families/:familyId/invites
 * Creates an invite code for members with configurable expiration time & max uses (BC-045, BC-046, BC-047)
 * Parents (editor) can delegate visitor invites (Issue #325).
 * Only owners/admins can invite parents or other admins.
 */
router.post('/:familyId/invites', requireAuth, inviteCreateLimiter, (req, res) => {
  const { familyId } = req.params;
  const { role = 'editor', expiresInHours = 48, maxUses = 1, invitedEmail = null } = req.body;

  const db = readDb();
  const access = getFamilyAndCheckAccess(db, familyId, req.user.id, 'editor');
  if (access.error) {
    return res.status(access.status).json({ error: access.error });
  }
  const { family, userRole } = access;

  // Issue #325: Parents can only create visitor invites (role: viewer)
  if (userRole !== 'admin' && role !== 'viewer') {
    return res.status(403).json({
      error:
        'Elternteile dürfen nur Besuchereinladungen erstellen. Für Elterneinladungen ist der Familiengründer erforderlich.',
    });
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

  // Issue #324: Validate email binding if provided
  let normalizedInvitedEmail = null;
  if (invitedEmail && typeof invitedEmail === 'string' && invitedEmail.trim()) {
    const trimmed = invitedEmail.trim().toLowerCase();
    // Check email format without super-linear backtracking
    const atIndex = trimmed.indexOf('@');
    const dotIndex = trimmed.lastIndexOf('.');
    if (
      atIndex <= 0 ||
      dotIndex <= atIndex + 1 ||
      dotIndex >= trimmed.length - 1 ||
      trimmed.includes(' ')
    ) {
      return res.status(400).json({ error: 'Ungültige E-Mail-Adresse für Einladung.' });
    }
    normalizedInvitedEmail = trimmed;
  }

  const inviteCode = generateInviteCode(db.invites);
  const newInvite = {
    code: inviteCode,
    familyId,
    familyName: family.name,
    createdBy: req.user.id,
    createdByName: req.user.name,
    role: role === 'viewer' ? 'viewer' : 'editor',
    invitedEmail: normalizedInvitedEmail,
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
  const access = getFamilyAndCheckAccess(db, familyId, req.user.id, 'editor');
  if (access.error) {
    return res.status(access.status).json({ error: access.error });
  }

  const invite = (db.invites || []).find(
    (inv) => inv.familyId === familyId && inv.code === code.toUpperCase()
  );
  if (!invite) {
    return res.status(404).json({ error: 'Einladungscode nicht gefunden.' });
  }

  // Issue #325: Parents can revoke visitor invites or invites they created themselves
  if (access.userRole !== 'admin' && invite.createdBy !== req.user.id && invite.role !== 'viewer') {
    return res.status(403).json({
      error: 'Sie dürfen nur selbst erstellte oder Besucher-Einladungen widerrufen.',
    });
  }

  db.invites = db.invites.filter(
    (inv) => !(inv.familyId === familyId && inv.code === code.toUpperCase())
  );
  writeDb(db);
  return res.json({ ok: true, message: 'Einladungscode widerrufen.' });
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

  // Issue #324: Enforce email binding if invite was created for a specific email
  if (invite.invitedEmail && invite.invitedEmail !== req.user.email?.toLowerCase()) {
    return res.status(403).json({
      error: `Dieser Einladungscode ist personengebunden und kann nur von ${invite.invitedEmail} eingelöst werden.`,
    });
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
    code: `${normalizedCode}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
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
 * Helper to get user-friendly role label
 */
function getRoleLabel(role) {
  if (role === 'admin') return 'Administrator';
  if (role === 'editor') return 'Elternteil';
  return 'Besucher';
}

/**
 * Helper to count admins including the family owner
 */
function countFamilyAdmins(family) {
  return (family.members || []).filter((m) => m.role === 'admin' || m.userId === family.ownerId)
    .length;
}

/**
 * Helper to validate admin permission and target member status for admin operations on members
 */
function validateTargetMemberAdminOp(db, familyId, reqUserId, targetUserId, actionDesc) {
  const family = db.families.find((f) => f.id === familyId);
  if (!family) {
    return { status: 404, error: 'Familie nicht gefunden.' };
  }

  const userRole = getUserFamilyRole(family, reqUserId);
  if (userRole !== 'admin') {
    return { status: 403, error: `Nur Administratoren dürfen ${actionDesc}.` };
  }

  if (family.ownerId === targetUserId) {
    return { status: 400, error: 'Der Familieninhaber ist geschützt (Owner-Schutz).' };
  }

  const member = (family.members || []).find((m) => m.userId === targetUserId);
  if (!member) {
    return { status: 404, error: 'Mitglied nicht in dieser Familie gefunden.' };
  }

  return { family, member };
}

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
  const validation = validateTargetMemberAdminOp(
    db,
    familyId,
    req.user.id,
    userId,
    'Mitgliedsrollen ändern'
  );
  if (validation.error) {
    return res.status(validation.status).json({ error: validation.error });
  }

  const { family, member } = validation;
  const oldRole = member.role;

  // BC-042: Protect the last admin in the family from being demoted
  if (oldRole === 'admin' && role !== 'admin' && countFamilyAdmins(family) <= 1) {
    return res.status(400).json({
      error: 'Der letzte Administrator einer Familie kann nicht herabgestuft werden.',
    });
  }

  member.role = role;
  writeDb(db);

  console.log(
    '[ROLE CHANGE]',
    new Date().toISOString(),
    'User:',
    String(req.user.email).replace(/[\r\n]/g, ''),
    'changed role of:',
    String(userId).replace(/[\r\n]/g, ''),
    'in family:',
    String(family.id).replace(/[\r\n]/g, ''),
    'from:',
    String(oldRole).replace(/[\r\n]/g, ''),
    'to:',
    String(role).replace(/[\r\n]/g, '')
  );

  return res.json({
    message: `Rolle erfolgreich auf "${getRoleLabel(role)}" geändert.`,
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
  if (member.role === 'admin' && countFamilyAdmins(family) <= 1) {
    return res.status(400).json({
      error:
        'Sie sind der letzte Administrator. Bitte ernennen Sie ein anderes Mitglied zum Administrator, bevor Sie die Familie verlassen.',
    });
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
  const validation = validateTargetMemberAdminOp(
    db,
    familyId,
    req.user.id,
    userId,
    'Mitglieder entfernen'
  );
  if (validation.error) {
    return res.status(validation.status).json({ error: validation.error });
  }

  const { family, member: targetMember } = validation;

  // BC-042: Protect the last admin
  if (targetMember.role === 'admin' && countFamilyAdmins(family) <= 1) {
    return res.status(400).json({
      error: 'Der letzte Administrator einer Familie kann nicht entfernt werden.',
    });
  }

  family.members = (family.members || []).filter((m) => m.userId !== userId);
  writeDb(db);

  return res.json({ message: 'Mitglied erfolgreich entfernt.' });
});

/**
 * DELETE /api/families/:familyId
 * Deletes a family, all its child profiles and associated records (owner/admin only, requires recent auth, Issue #333)
 */
router.delete('/:familyId', requireAuth, requireRecentAuth, (req, res) => {
  const { familyId } = req.params;
  const db = readDb();
  const familyIndex = db.families.findIndex((f) => f.id === familyId);

  if (familyIndex === -1) {
    return res.status(404).json({ error: 'Familie nicht gefunden.' });
  }

  const family = db.families[familyIndex];
  const isOwner = family.ownerId === req.user.id;
  const isEmergencyAdmin = Boolean(
    req.user.isDev && getActiveEmergencyAccess(familyId, req.user.id)
  );

  // Issue #326: Only the family owner (or audited break-glass emergency admin) can delete a family
  if (!isOwner && !isEmergencyAdmin) {
    return res
      .status(403)
      .json({ error: 'Nur der Familiengründer (Owner) darf die Familie löschen.' });
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

/**
 * GET /api/families/:familyId/audit-log
 * Retrieves the audit trail and history of actions performed within the family (Issue #248)
 */
router.get('/:familyId/audit-log', requireAuth, (req, res) => {
  const { familyId } = req.params;
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

  const requestedLimit = req.query.limit ? Number(req.query.limit) : 50;
  const safeLimit = Math.min(Math.max(requestedLimit, 1), 100);

  let cursor = null;
  if (req.query.cursor) {
    try {
      cursor = decodeCursor(String(req.query.cursor), `family:${familyId}`);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  const result = getFamilyAuditLogs(familyId, safeLimit, cursor);

  let nextCursor = null;
  if (result.hasMore && result.items.length > 0) {
    const last = result.items[result.items.length - 1];
    nextCursor = encodeCursor({
      id: last.id,
      sortValue: last.timestamp,
      scope: `family:${familyId}`,
    });
  }

  return res.json({
    logs: result.items,
    items: result.items,
    nextCursor,
    hasMore: result.hasMore,
    limit: safeLimit,
  });
});

/**
 * GET /api/families/:familyId/visitor-grants/:visitorUserId
 * Retrieves granular category grants for a specific visitor (Issue #323)
 */
router.get('/:familyId/visitor-grants/:visitorUserId', requireAuth, (req, res) => {
  const { familyId, visitorUserId } = req.params;
  const db = readDb();
  const access = getFamilyAndCheckAccess(db, familyId, req.user.id, 'visitor');
  if (access.error) {
    return res.status(access.status).json({ error: access.error });
  }

  // Non-parent/owner can only read their own grants
  if (access.userRole === 'viewer' && req.user.id !== visitorUserId) {
    return res.status(403).json({ error: 'Zugriff verweigert.' });
  }

  const grants = getVisitorGrants(familyId, visitorUserId);
  return res.json({ grants });
});

/**
 * PUT /api/families/:familyId/visitor-grants/:visitorUserId
 * Updates category grants for a visitor (strictly requires editor/parent or owner role, Issue #323)
 */
router.put('/:familyId/visitor-grants/:visitorUserId', requireAuth, (req, res) => {
  const { familyId, visitorUserId } = req.params;
  const { grants } = req.body;

  if (!Array.isArray(grants)) {
    return res.status(400).json({ error: 'Ungültiges Format: grants Array erwartet.' });
  }

  const db = readDb();
  const access = getFamilyAndCheckAccess(db, familyId, req.user.id, 'editor');
  if (access.error) {
    return res.status(access.status).json({ error: access.error });
  }

  setVisitorGrants(familyId, visitorUserId, grants);

  logFamilyAudit({
    familyId,
    userId: req.user.id,
    userName: req.user.name,
    action: 'VISITOR_GRANTS_UPDATE',
    details: `Besucher-Freigaben für Benutzer ${visitorUserId} aktualisiert`,
  });

  return res.json({ ok: true, count: grants.length });
});

/**
 * POST /api/families/:familyId/emergency-access
 * Audited, time-limited Break-Glass emergency access for Instance Superadmins (Issue #332).
 * Strictly requires superadmin role, recent password re-authentication, and a justified reason.
 */
router.post(
  '/:familyId/emergency-access',
  requireAuth,
  requireInstanceAdmin,
  requireRecentAuth,
  (req, res) => {
    const { familyId } = req.params;
    const { reason, durationMinutes } = req.body || {};

    if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
      return res.status(400).json({
        error:
          'Ein ausführlicher Grund (mindestens 10 Zeichen) für den Notfallzugriff ist erforderlich.',
      });
    }

    const db = readDb();
    const family = db.families.find((f) => f.id === familyId);
    if (!family) {
      return res.status(404).json({ error: 'Familie nicht gefunden.' });
    }

    // Default 60 minutes, capped between 5 and 240 minutes
    const requestedMins = Number(durationMinutes);
    const validDurationMins =
      !Number.isNaN(requestedMins) && requestedMins >= 5 && requestedMins <= 240
        ? requestedMins
        : 60;
    const durationMs = validDurationMins * 60 * 1000;

    const grant = grantEmergencyAccess(familyId, req.user.id, reason.trim(), durationMs);

    // Record immutable audit trails in both security audit and family audit logs
    logSecurityEvent({
      event: 'SUPERADMIN_BREAK_GLASS_ACCESS',
      userId: req.user.id,
      email: req.user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success',
      details: {
        familyId,
        familyName: family.name,
        reason: reason.trim(),
        expiresAt: grant.expiresAt,
      },
    });

    logFamilyAudit({
      familyId,
      userId: req.user.id,
      userName: req.user.name,
      action: 'EMERGENCY_BREAK_GLASS_ACCESS',
      details: `Notfall-Zugriff aktiviert durch Superadmin: ${reason.trim()}`,
    });

    return res.status(201).json({
      ok: true,
      message: 'Notfallzugriff erfolgreich gewährt.',
      grant: {
        id: grant.id,
        familyId: grant.familyId,
        expiresAt: grant.expiresAt,
        reason: grant.reason,
      },
    });
  }
);

/**
 * GET /api/families/:familyId/backup
 * Exports a complete, isolated family backup (family owner only, Issue #327)
 */
router.get('/:familyId/backup', requireAuth, (req, res) => {
  const { familyId } = req.params;
  const db = readDb();
  const access = getFamilyAndCheckAccess(db, familyId, req.user.id, 'admin');
  if (access.error) {
    return res.status(access.status).json({ error: access.error });
  }

  const { family } = access;
  if (family.ownerId !== req.user.id && access.userRole !== 'admin') {
    return res.status(403).json({
      error:
        'Zugriff verweigert: Nur der Familiengründer darf ein vollständiges Familien-Backup exportieren.',
    });
  }

  const familyProfiles = (db.profiles || []).filter((p) => p.familyId === familyId);
  const grants = (db.visitorGrants || []).filter((g) => g.familyId === familyId);

  const backupData = {
    version: 'babycharts-family-backup-v1',
    family: {
      id: family.id,
      name: family.name,
      createdAt: family.createdAt,
    },
    exportedAt: new Date().toISOString(),
    profiles: familyProfiles,
    visitorGrants: grants,
  };

  logFamilyAudit({
    familyId,
    userId: req.user.id,
    userName: req.user.name,
    action: 'FAMILY_BACKUP_EXPORT',
    details: `Vollständiges Familien-Backup exportiert (${familyProfiles.length} Profile)`,
  });

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="family-backup-${familyId}.json"`);
  return res.json(backupData);
});

/**
 * POST /api/families/:familyId/backup/dry-run
 * Validates a family backup without applying changes (Issue #327)
 */
router.post('/:familyId/backup/dry-run', requireAuth, (req, res) => {
  const { familyId } = req.params;
  const db = readDb();
  const access = getFamilyAndCheckAccess(db, familyId, req.user.id, 'admin');
  if (access.error) {
    return res.status(access.status).json({ error: access.error });
  }

  const { family } = access;
  if (family.ownerId !== req.user.id && access.userRole !== 'admin') {
    return res.status(403).json({
      error: 'Zugriff verweigert: Nur der Familiengründer darf Backups validieren.',
    });
  }

  const { backup } = req.body || {};
  if (!backup || typeof backup !== 'object') {
    return res.status(400).json({ error: 'Ungültiges Backup-Format: JSON-Objekt erwartet.' });
  }

  let profiles = null;
  if (Array.isArray(backup.profiles)) {
    profiles = backup.profiles;
  } else if (Array.isArray(backup)) {
    profiles = backup;
  }
  if (!profiles) {
    return res
      .status(400)
      .json({ error: 'Ungültiges Backup-Format: Keine Profil-Daten gefunden.' });
  }

  const existingProfileIds = new Set(
    (db.profiles || []).filter((p) => p.familyId === familyId).map((p) => p.id)
  );
  const conflicts = [];
  let validProfileCount = 0;
  let measurementCount = 0;

  for (const p of profiles) {
    if (!p?.id || !p?.name) continue;
    validProfileCount++;
    if (existingProfileIds.has(p.id)) {
      conflicts.push({ id: p.id, name: p.name, type: 'overwrite' });
    }
    if (Array.isArray(p.measurements)) {
      measurementCount += p.measurements.length;
    }
  }

  return res.json({
    ok: true,
    valid: true,
    preview: {
      profileCount: validProfileCount,
      measurementCount,
      conflicts,
    },
  });
});

export default router;
