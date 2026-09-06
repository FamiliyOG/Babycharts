import { describe, it, expect } from 'vitest';
import { familyService, generateInviteCode } from '../../server/services/familyService.js';
import { profileService } from '../../server/services/profileService.js';
import { userRepository, familyRepository } from '../../server/repositories/index.js';

describe('Server Service Layer Test Suite (BC-290, BC-286)', () => {
  const ownerUserId = `srv_owner_${Date.now()}`;
  const editorUserId = `srv_editor_${Date.now()}`;
  const strangerUserId = `srv_stranger_${Date.now()}`;
  let testFamilyId;

  it('generateInviteCode produces unique 6-character strings avoiding collisions', () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(6);
    expect(typeof code).toBe('string');

    const collisions = new Set([code]);
    const nextCode = generateInviteCode(collisions);
    expect(nextCode).not.toBe(code);
  });

  it('familyService manages family creation, access checks and permissions', () => {
    // 1. Create users
    userRepository.create({
      id: ownerUserId,
      name: 'Owner User',
      email: `${ownerUserId}@example.com`,
      password: 'hash',
    });
    userRepository.create({
      id: editorUserId,
      name: 'Editor User',
      email: `${editorUserId}@example.com`,
      password: 'hash',
    });
    userRepository.create({
      id: strangerUserId,
      name: 'Stranger User',
      email: `${strangerUserId}@example.com`,
      password: 'hash',
    });

    // 2. Create family
    const createRes = familyService.createFamily({
      name: 'Service Test Family',
      userId: ownerUserId,
    });
    expect(createRes.success).toBe(true);
    testFamilyId = createRes.family.id;

    // 3. Check access
    const ownerAccess = familyService.checkAccess(testFamilyId, ownerUserId);
    expect(ownerAccess.userRole).toBe('admin');

    const strangerAccess = familyService.checkAccess(testFamilyId, strangerUserId);
    expect(strangerAccess.error).toBeDefined();
    expect(strangerAccess.status).toBe(403);

    // 4. Add editor member
    familyRepository.addMember(testFamilyId, editorUserId, 'editor');
    const editorAccess = familyService.checkAccess(testFamilyId, editorUserId, 'editor');
    expect(editorAccess.userRole).toBe('editor');

    // Editor cannot do admin-only action
    const adminCheck = familyService.checkAccess(testFamilyId, editorUserId, 'admin');
    expect(adminCheck.error).toBeDefined();
    expect(adminCheck.status).toBe(403);
  });

  it('familyService manages invites lifecycle', () => {
    const inviteRes = familyService.createInvite({
      familyId: testFamilyId,
      role: 'editor',
      userId: ownerUserId,
      expiresInDays: 1,
    });
    expect(inviteRes.success).toBe(true);
    expect(inviteRes.invite.code).toBeDefined();

    const stranger2Id = `srv_stranger2_${Date.now()}`;
    userRepository.create({
      id: stranger2Id,
      name: 'Stranger 2',
      email: `${stranger2Id}@example.com`,
      password: 'hash',
    });

    // Redeem invite
    const redeemRes = familyService.redeemInvite(
      inviteRes.invite.code,
      stranger2Id,
      `${stranger2Id}@example.com`
    );
    expect(redeemRes.success).toBe(true);

    // Verify member added
    const access = familyService.checkAccess(testFamilyId, stranger2Id);
    expect(access.userRole).toBe('editor');
  });

  it('profileService handles family-isolated profile CRUD and soft delete', () => {
    // 1. Create profile
    const createRes = profileService.createProfile(
      {
        familyId: testFamilyId,
        name: 'Service Baby',
        birthdate: '2025-06-01',
        gender: 'boy',
      },
      ownerUserId
    );
    expect(createRes.success).toBe(true);
    const profileId = createRes.profile.id;

    // 2. Stranger cannot view profile
    const strangerRes = profileService.getProfileById(profileId, strangerUserId);
    expect(strangerRes.error).toBeDefined();
    expect(strangerRes.status).toBe(403);

    // 3. Family member can view profile
    const viewRes = profileService.getProfileById(profileId, ownerUserId);
    expect(viewRes.success).toBe(true);
    expect(viewRes.profile.name).toBe('Service Baby');

    // 4. Update profile
    const updateRes = profileService.updateProfile(
      profileId,
      { name: 'Updated Baby' },
      ownerUserId
    );
    expect(updateRes.success).toBe(true);
    expect(updateRes.profile.name).toBe('Updated Baby');

    // 5. Soft-delete profile
    const deleteRes = profileService.softDeleteProfile(profileId, ownerUserId);
    expect(deleteRes.success).toBe(true);

    const afterDelete = profileService.getProfileById(profileId, ownerUserId, false);
    expect(afterDelete.error).toBeDefined();
    expect(afterDelete.status).toBe(404);

    // 6. Restore profile
    const restoreRes = profileService.restoreProfile(profileId, ownerUserId);
    expect(restoreRes.success).toBe(true);

    const afterRestore = profileService.getProfileById(profileId, ownerUserId, false);
    expect(afterRestore.success).toBe(true);
    expect(afterRestore.profile.name).toBe('Updated Baby');
  });

  it('redactSensitive masks sensitive keys and preserves non-sensitive metadata (BC-309)', async () => {
    const { redactSensitive } = await import('../../server/utils/logger.js');
    const sensitiveObj = {
      user: 'Alice',
      password: 'SuperSecretPassword!',
      token: 'jwt.token.string',
      nested: {
        twoFactorSecret: 'ABCDEF123456',
        normalField: 42,
      },
      list: [{ notes: 'confidential' }, { id: 'clean-1' }],
    };

    const redacted = redactSensitive(sensitiveObj);
    expect(redacted.user).toBe('Alice');
    expect(redacted.password).toBe('[REDACTED]');
    expect(redacted.token).toBe('[REDACTED]');
    expect(redacted.nested.twoFactorSecret).toBe('[REDACTED]');
    expect(redacted.nested.normalField).toBe(42);
    expect(redacted.list[0].notes).toBe('[REDACTED]');
    expect(redacted.list[1].id).toBe('clean-1');
  });
});
