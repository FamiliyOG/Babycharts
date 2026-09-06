/**
 * server/services/profileService.js
 * Business logic layer for Profiles, Child Measurements & Health Logs.
 */

import crypto from 'node:crypto';
import { profileRepository } from '../repositories/index.js';
import { familyService } from './familyService.js';
import { logFamilyAudit } from './auditService.js';

export const profileService = {
  getProfilesForFamily(familyId, userId, includeDeleted = false) {
    const access = familyService.checkAccess(familyId, userId);
    if (access.error) return access;

    const profiles = profileRepository.findByFamilyId(familyId, includeDeleted);
    return { success: true, profiles, userRole: access.userRole };
  },

  getProfileById(profileId, userId, includeDeleted = false) {
    const profile = profileRepository.findById(profileId, includeDeleted);
    if (!profile) {
      return { error: 'Profil nicht gefunden.', status: 404 };
    }

    const access = familyService.checkAccess(profile.familyId, userId);
    if (access.error) return access;

    return { success: true, profile, userRole: access.userRole };
  },

  createProfile(profileData, userId) {
    const access = familyService.checkAccess(profileData.familyId, userId, 'editor');
    if (access.error) return access;

    const profileId =
      profileData.id || `child-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const created = profileRepository.create({
      ...profileData,
      id: profileId,
    });

    logFamilyAudit({
      familyId: profileData.familyId,
      userId,
      action: 'PROFILE_CREATED',
      details: { profileId, name: profileData.name },
    });

    return { success: true, profile: created };
  },

  updateProfile(profileId, updates, userId) {
    const current = profileRepository.findById(profileId, true);
    if (!current) {
      return { error: 'Profil nicht gefunden.', status: 404 };
    }

    const access = familyService.checkAccess(current.familyId, userId, 'editor');
    if (access.error) return access;

    const updated = profileRepository.update(profileId, updates);

    logFamilyAudit({
      familyId: current.familyId,
      userId,
      action: 'PROFILE_UPDATED',
      details: { profileId, updatedFields: Object.keys(updates) },
    });

    return { success: true, profile: updated };
  },

  softDeleteProfile(profileId, userId) {
    const current = profileRepository.findById(profileId, false);
    if (!current) {
      return { error: 'Profil nicht gefunden.', status: 404 };
    }

    const access = familyService.checkAccess(current.familyId, userId, 'editor');
    if (access.error) return access;

    profileRepository.softDelete(profileId);

    logFamilyAudit({
      familyId: current.familyId,
      userId,
      action: 'PROFILE_DELETED',
      details: { profileId, name: current.name },
    });

    return { success: true };
  },

  restoreProfile(profileId, userId) {
    const current = profileRepository.findById(profileId, true);
    if (!current) {
      return { error: 'Profil nicht gefunden.', status: 404 };
    }

    const access = familyService.checkAccess(current.familyId, userId, 'editor');
    if (access.error) return access;

    profileRepository.restore(profileId);

    logFamilyAudit({
      familyId: current.familyId,
      userId,
      action: 'PROFILE_RESTORED',
      details: { profileId, name: current.name },
    });

    return { success: true };
  },
};
