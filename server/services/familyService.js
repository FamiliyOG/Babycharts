/**
 * server/services/familyService.js
 * Business logic layer for Family management, memberships, invitations & permissions.
 */

import crypto from 'node:crypto';
import { familyRepository } from '../repositories/index.js';
import { getUserFamilyRole } from '../middleware/auth.js';
import { logSecurityEvent } from '../utils/db.js';

export function generateInviteCode(existingCodes = new Set()) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
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

export const familyService = {
  checkAccess(familyId, userId, minRole = null) {
    const family = familyRepository.findById(familyId);
    if (!family) {
      return { error: 'Familie nicht gefunden.', status: 404 };
    }

    let userRole = getUserFamilyRole(family, userId);

    // Superadmin Break-Glass Access (Issue #332)
    if (!userRole) {
      const activeEmergency = familyRepository.getActiveEmergencyAccess(familyId, userId);
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
    if (minRole === 'admin' && userRole !== 'admin' && userRole !== 'owner') {
      return { error: 'Nur Administratoren dürfen diese Aktion ausführen.', status: 403 };
    }

    return { family, userRole };
  },

  listFamiliesForUser(userId) {
    return familyRepository.findByUserId(userId);
  },

  getFamilyDetails(familyId, userId) {
    const access = this.checkAccess(familyId, userId);
    if (access.error) return access;
    return { success: true, family: access.family, userRole: access.userRole };
  },

  createFamily({ name, userId }) {
    const cleanName = typeof name === 'string' && name.trim() ? name.trim() : 'Neue Familie';
    const familyId = `fam-${Date.now()}`;
    const family = familyRepository.create({ id: familyId, name: cleanName }, userId, 'owner');
    return { success: true, family };
  },

  updateFamily(familyId, updates, userId) {
    const access = this.checkAccess(familyId, userId, 'editor');
    if (access.error) return access;

    const updated = familyRepository.update(familyId, updates);
    return { success: true, family: updated };
  },

  deleteFamily(familyId, userId) {
    const access = this.checkAccess(familyId, userId, 'admin');
    if (access.error) return access;

    familyRepository.delete(familyId);
    return { success: true };
  },

  transferOwnership(familyId, newOwnerId, requestingUserId, currentOwnerNewRole = 'parent') {
    const access = this.checkAccess(familyId, requestingUserId, 'admin');
    if (access.error) return access;

    if (access.userRole !== 'owner') {
      return {
        error: 'Nur der aktuelle Eigentümer kann die Eigentümerschaft übertragen.',
        status: 403,
      };
    }

    const newOwnerMember = familyRepository.getMember(familyId, newOwnerId);
    if (!newOwnerMember) {
      return { error: 'Das angegebene Mitglied gehört nicht zu dieser Familie.', status: 400 };
    }

    const updated = familyRepository.transferOwnership(
      familyId,
      requestingUserId,
      newOwnerId,
      currentOwnerNewRole
    );
    return { success: true, family: updated };
  },

  updateMemberRole(familyId, targetUserId, newRole, requestingUserId) {
    const access = this.checkAccess(familyId, requestingUserId, 'admin');
    if (access.error) return access;

    const targetMember = familyRepository.getMember(familyId, targetUserId);
    if (!targetMember) {
      return { error: 'Mitglied nicht gefunden.', status: 404 };
    }

    familyRepository.updateMemberRole(familyId, targetUserId, newRole);
    return { success: true };
  },

  removeMember(familyId, targetUserId, requestingUserId) {
    const access = this.checkAccess(familyId, requestingUserId);
    if (access.error) return access;

    // Self-leave or admin remove
    if (
      requestingUserId !== targetUserId &&
      access.userRole !== 'admin' &&
      access.userRole !== 'owner'
    ) {
      return { error: 'Keine Berechtigung zum Entfernen dieses Mitglieds.', status: 403 };
    }

    familyRepository.removeMember(familyId, targetUserId);
    return { success: true };
  },

  // Invites
  createInvite({ familyId, role = 'editor', email, userId, expiresInDays = 7 }) {
    const access = this.checkAccess(familyId, userId, 'editor');
    if (access.error) return access;

    const invites = familyRepository.getInvites(familyId);
    const used = familyRepository.getUsedInvites(familyId);
    const existingCodes = new Set([...invites.map((i) => i.code), ...used.map((u) => u.code)]);

    const code = generateInviteCode(existingCodes);
    const inviteId = `inv-${Date.now()}`;
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

    const invite = familyRepository.createInvite({
      id: inviteId,
      code,
      familyId,
      role,
      email: email || null,
      createdBy: userId,
      expiresAt,
    });

    return { success: true, invite };
  },

  revokeInvite(inviteId, familyId, userId) {
    const access = this.checkAccess(familyId, userId, 'editor');
    if (access.error) return access;

    const invite = familyRepository.getInviteById(inviteId);
    if (!invite || invite.familyId !== familyId) {
      return { error: 'Einladung nicht gefunden.', status: 404 };
    }

    // Creator or admin can revoke
    if (invite.createdBy !== userId && access.userRole !== 'admin' && access.userRole !== 'owner') {
      return { error: 'Keine Berechtigung zum Widerrufen dieser Einladung.', status: 403 };
    }

    familyRepository.deleteInvite(inviteId);
    return { success: true };
  },

  redeemInvite(code, userId, userEmail) {
    if (!code || typeof code !== 'string') {
      return { error: 'Ungültiger Einladungscode.', status: 400 };
    }

    const normalizedCode = code.trim().toUpperCase();
    const invite = familyRepository.getInviteByCode(normalizedCode);
    if (!invite) {
      return { error: 'Einladungscode ungültig oder abgelaufen.', status: 404 };
    }

    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      familyRepository.deleteInvite(invite.id);
      return { error: 'Dieser Einladungscode ist bereits abgelaufen.', status: 400 };
    }

    if (invite.email && userEmail && invite.email.toLowerCase() !== userEmail.toLowerCase()) {
      return {
        error: 'Dieser Einladungscode ist für eine andere E-Mail-Adresse bestimmt.',
        status: 403,
      };
    }

    const family = familyRepository.findById(invite.familyId);
    if (!family) {
      return { error: 'Zugehörige Familie wurde nicht gefunden.', status: 404 };
    }

    familyRepository.addMember(family.id, userId, invite.role || 'editor');
    familyRepository.deleteInvite(invite.id);
    familyRepository.recordUsedInvite({
      id: `used-${Date.now()}`,
      code: normalizedCode,
      familyId: family.id,
      usedBy: userId,
    });

    return { success: true, family };
  },

  // Visitor Grants
  getVisitorGrants(familyId, visitorUserId, requestingUserId) {
    const access = this.checkAccess(familyId, requestingUserId);
    if (access.error) return access;

    const grants = familyRepository.getVisitorGrants(familyId, visitorUserId);
    return { success: true, grants };
  },

  setVisitorGrants(familyId, visitorUserId, grants, requestingUserId) {
    const access = this.checkAccess(familyId, requestingUserId, 'admin');
    if (access.error) return access;

    const updated = familyRepository.setVisitorGrants(familyId, visitorUserId, grants);
    return { success: true, grants: updated };
  },

  // Emergency Access
  requestEmergencyAccess(familyId, userId, reason) {
    const grant = familyRepository.grantEmergencyAccess(familyId, userId, reason);
    logSecurityEvent({
      event: 'EMERGENCY_ACCESS_GRANTED',
      userId,
      details: { familyId, reason },
      status: 'success',
    });
    return { success: true, grant };
  },

  revokeEmergencyAccess(familyId, userId) {
    familyRepository.revokeEmergencyAccess(familyId, userId);
    logSecurityEvent({
      event: 'EMERGENCY_ACCESS_REVOKED',
      userId,
      details: { familyId },
      status: 'success',
    });
    return { success: true };
  },
};
