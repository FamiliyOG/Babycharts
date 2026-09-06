import { describe, it, expect } from 'vitest';
import {
  userRepository,
  familyRepository,
  profileRepository,
  mediaRepository,
} from '../../server/repositories/index.js';

describe('Server Repository Layer Test Suite (BC-290)', () => {
  const testUserId = `test_repo_user_${Date.now()}`;
  const testFamilyId = `test_repo_fam_${Date.now()}`;
  const testProfileId = `test_repo_prof_${Date.now()}`;
  const testEmail = `repo_test_${Date.now()}@example.com`;

  it('UserRepository performs CRUD, password updates, and token lifecycle correctly', () => {
    // 1. Create
    const user = userRepository.create({
      id: testUserId,
      name: 'RepoTester',
      email: testEmail,
      password: '$2a$12$hashedpasswordplaceholder',
      role: 'user',
    });
    expect(user).toBeDefined();
    expect(user.id).toBe(testUserId);
    expect(user.email).toBe(testEmail.toLowerCase());
    expect(user.name).toBe('RepoTester');
    expect(user.role).toBe('user');

    // 2. Find by ID, Email
    expect(userRepository.findById(testUserId)?.name).toBe('RepoTester');
    expect(userRepository.findByEmail(testEmail)?.id).toBe(testUserId);

    // 3. Update Password
    const updated = userRepository.updatePassword(testUserId, '$2a$12$newhashedpassword', true);
    expect(updated.tokenVersion).toBe(1);

    // 4. Two-Factor update
    userRepository.updateTwoFactor(testUserId, {
      secret: 'encrypted_secret_xyz',
      recoveryCodes: ['code-1', 'code-2'],
    });
    const user2fa = userRepository.findById(testUserId);
    expect(user2fa.twoFactorEnabled).toBe(true);
    expect(user2fa.recoveryCodes).toEqual(['code-1', 'code-2']);

    // 5. Reset Password Token lifecycle
    const expiresTimestamp = Date.now() + 3600000;
    userRepository.setResetPasswordToken(testUserId, 'hashed_reset_token', expiresTimestamp);
    expect(userRepository.findByResetToken('hashed_reset_token')?.id).toBe(testUserId);

    userRepository.clearResetPasswordToken(testUserId);
    expect(userRepository.findByResetToken('hashed_reset_token')).toBeNull();
  });

  it('FamilyRepository performs family creation, membership and invite operations', () => {
    // 1. Create Family with creator as owner
    const family = familyRepository.create(
      { id: testFamilyId, name: 'Test Repository Family' },
      testUserId,
      'owner'
    );
    expect(family).toBeDefined();
    expect(family.id).toBe(testFamilyId);
    expect(family.name).toBe('Test Repository Family');
    expect(family.members).toHaveLength(1);
    expect(family.members[0].role).toBe('owner');

    // 2. Add another member & update role
    const member2Id = `user_m2_${Date.now()}`;
    userRepository.create({
      id: member2Id,
      name: 'MemberTwo',
      email: `m2_${Date.now()}@example.com`,
      password: 'passwordhash',
    });

    familyRepository.addMember(testFamilyId, member2Id, 'editor');
    expect(familyRepository.getMember(testFamilyId, member2Id)?.role).toBe('editor');

    familyRepository.updateMemberRole(testFamilyId, member2Id, 'admin');
    expect(familyRepository.getMember(testFamilyId, member2Id)?.role).toBe('admin');

    // 3. Invite lifecycle
    const inviteCode = `TST${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
    const invite = familyRepository.createInvite({
      code: inviteCode,
      familyId: testFamilyId,
      role: 'editor',
      createdBy: testUserId,
    });
    expect(invite.code).toBe(inviteCode);
    expect(familyRepository.getInviteByCode(inviteCode)?.familyId).toBe(testFamilyId);

    familyRepository.deleteInvite(inviteCode);
    expect(familyRepository.getInviteByCode(inviteCode)).toBeNull();

    // 4. Create real profile first for foreign key integrity
    profileRepository.create({
      id: testProfileId,
      familyId: testFamilyId,
      name: 'Baby Repo',
      birthdate: '2025-01-01',
      gender: 'girl',
    });

    // 5. Visitor Grants
    familyRepository.setVisitorGrants(testFamilyId, member2Id, [
      { profileId: testProfileId, category: 'growth' },
      { profileId: testProfileId, category: 'milestones' },
    ]);
    const grants = familyRepository.getVisitorGrants(testFamilyId, member2Id);
    expect(grants.some((g) => g.category === 'growth')).toBe(true);
    expect(grants.some((g) => g.category === 'milestones')).toBe(true);
  });

  it('ProfileRepository manages profiles, measurements and soft delete transitions', () => {
    const testProfileId2 = `test_repo_prof_2_${Date.now()}`;
    // 1. Create Profile with measurements
    const profile = profileRepository.create({
      id: testProfileId2,
      familyId: testFamilyId,
      name: 'Baby Repo Two',
      birthdate: '2025-01-01',
      gender: 'girl',
      measurements: [
        {
          id: `m_repo_1_${Date.now()}`,
          date: '2025-01-01',
          weight: 3.5,
          length: 50,
          headCircumference: 35,
          checkup: 'U1',
        },
      ],
      healthLog: [],
    });

    expect(profile).toBeDefined();
    expect(profile.name).toBe('Baby Repo Two');
    expect(profile.measurements).toHaveLength(1);
    expect(profile.measurements[0].weight).toBe(3.5);

    // 2. Soft-delete
    profileRepository.softDelete(testProfileId2);
    expect(profileRepository.findById(testProfileId2, false)).toBeNull();
    expect(profileRepository.findById(testProfileId2, true)).toBeDefined();

    // 3. Restore
    profileRepository.restore(testProfileId2);
    expect(profileRepository.findById(testProfileId2, false)).toBeDefined();
  });

  it('MediaRepository records and retrieves media file metadata', () => {
    const mediaId = `media_repo_${Date.now()}`;
    const media = mediaRepository.create({
      id: mediaId,
      userId: testUserId,
      familyId: testFamilyId,
      originalName: 'photo.jpg',
      mimeType: 'image/webp',
      sizeBytes: 10240,
      iv: 'mock_iv_hex',
      authTag: 'mock_tag_hex',
    });

    expect(media).toBeDefined();
    expect(media.id).toBe(mediaId);

    const found = mediaRepository.findById(mediaId);
    expect(found?.sizeBytes).toBe(10240);

    const userMedia = mediaRepository.findByUserId(testUserId);
    expect(userMedia.some((m) => m.id === mediaId)).toBe(true);

    mediaRepository.delete(mediaId);
    expect(mediaRepository.findById(mediaId)).toBeNull();
  });
});
