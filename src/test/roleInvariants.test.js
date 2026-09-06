import { describe, it, expect } from 'vitest';
import {
  INSTANCE_ROLES,
  FAMILY_ROLES,
  normalizeFamilyRole,
  normalizeInstanceRole,
} from '../../server/security/roles.js';
import { PERMISSIONS as PERM_CATALOG, checkPermission } from '../../server/security/permissions.js';
import { hasPermission, PERMISSIONS } from '../../server/security/authMatrix.js';

describe('Two-Tier RBAC Roles and Permissions Invariants (BC-321, BC-322)', () => {
  describe('Role Normalization', () => {
    it('normalizes legacy family roles correctly', () => {
      expect(normalizeFamilyRole('admin')).toBe(FAMILY_ROLES.OWNER);
      expect(normalizeFamilyRole('owner')).toBe(FAMILY_ROLES.OWNER);
      expect(normalizeFamilyRole(null, true)).toBe(FAMILY_ROLES.OWNER);

      expect(normalizeFamilyRole('editor')).toBe(FAMILY_ROLES.PARENT);
      expect(normalizeFamilyRole('parent')).toBe(FAMILY_ROLES.PARENT);

      expect(normalizeFamilyRole('viewer')).toBe(FAMILY_ROLES.VISITOR);
      expect(normalizeFamilyRole('visitor')).toBe(FAMILY_ROLES.VISITOR);
      expect(normalizeFamilyRole('unknown')).toBe(FAMILY_ROLES.VISITOR);
    });

    it('normalizes legacy instance roles correctly', () => {
      expect(normalizeInstanceRole('superadmin')).toBe(INSTANCE_ROLES.SUPERADMIN);
      expect(normalizeInstanceRole('user', true)).toBe(INSTANCE_ROLES.SUPERADMIN);
      expect(normalizeInstanceRole('user', false)).toBe(INSTANCE_ROLES.USER);
      expect(normalizeInstanceRole(null, false)).toBe(INSTANCE_ROLES.USER);
    });
  });

  describe('Central Permission Catalog', () => {
    it('allows superadmin instance actions and denies standard users', () => {
      expect(checkPermission(PERM_CATALOG.INSTANCE_SETTINGS_WRITE, INSTANCE_ROLES.SUPERADMIN)).toBe(
        true
      );
      expect(checkPermission(PERM_CATALOG.INSTANCE_BACKUP_MANAGE, INSTANCE_ROLES.SUPERADMIN)).toBe(
        true
      );

      expect(checkPermission(PERM_CATALOG.INSTANCE_SETTINGS_WRITE, INSTANCE_ROLES.USER)).toBe(
        false
      );
      expect(checkPermission(PERM_CATALOG.INSTANCE_BACKUP_MANAGE, INSTANCE_ROLES.USER)).toBe(false);
    });

    it('allows owners full family management including delete, export and transfer', () => {
      expect(
        checkPermission(PERM_CATALOG.FAMILY_DELETE, INSTANCE_ROLES.USER, FAMILY_ROLES.OWNER)
      ).toBe(true);
      expect(
        checkPermission(
          PERM_CATALOG.FAMILY_OWNERSHIP_TRANSFER,
          INSTANCE_ROLES.USER,
          FAMILY_ROLES.OWNER
        )
      ).toBe(true);
      expect(
        checkPermission(PERM_CATALOG.FAMILY_BACKUP_EXPORT, INSTANCE_ROLES.USER, FAMILY_ROLES.OWNER)
      ).toBe(true);
      expect(
        checkPermission(PERM_CATALOG.PROFILE_WRITE, INSTANCE_ROLES.USER, FAMILY_ROLES.OWNER)
      ).toBe(true);
    });

    it('allows parents profile editing and visitor invite, but denies destructive owner actions', () => {
      expect(
        checkPermission(PERM_CATALOG.PROFILE_WRITE, INSTANCE_ROLES.USER, FAMILY_ROLES.PARENT)
      ).toBe(true);
      expect(
        checkPermission(PERM_CATALOG.PROFILE_DELETE, INSTANCE_ROLES.USER, FAMILY_ROLES.PARENT)
      ).toBe(true);
      expect(
        checkPermission(PERM_CATALOG.FAMILY_INVITE_MANAGE, INSTANCE_ROLES.USER, FAMILY_ROLES.PARENT)
      ).toBe(true);

      expect(
        checkPermission(PERM_CATALOG.FAMILY_DELETE, INSTANCE_ROLES.USER, FAMILY_ROLES.PARENT)
      ).toBe(false);
      expect(
        checkPermission(
          PERM_CATALOG.FAMILY_OWNERSHIP_TRANSFER,
          INSTANCE_ROLES.USER,
          FAMILY_ROLES.PARENT
        )
      ).toBe(false);
      expect(
        checkPermission(PERM_CATALOG.FAMILY_BACKUP_EXPORT, INSTANCE_ROLES.USER, FAMILY_ROLES.PARENT)
      ).toBe(false);
    });

    it('restricts visitors to read permissions', () => {
      expect(
        checkPermission(PERM_CATALOG.FAMILY_READ, INSTANCE_ROLES.USER, FAMILY_ROLES.VISITOR)
      ).toBe(true);
      expect(
        checkPermission(PERM_CATALOG.PROFILE_READ, INSTANCE_ROLES.USER, FAMILY_ROLES.VISITOR)
      ).toBe(true);

      expect(
        checkPermission(PERM_CATALOG.PROFILE_WRITE, INSTANCE_ROLES.USER, FAMILY_ROLES.VISITOR)
      ).toBe(false);
      expect(
        checkPermission(PERM_CATALOG.PROFILE_DELETE, INSTANCE_ROLES.USER, FAMILY_ROLES.VISITOR)
      ).toBe(false);
      expect(
        checkPermission(
          PERM_CATALOG.FAMILY_INVITE_MANAGE,
          INSTANCE_ROLES.USER,
          FAMILY_ROLES.VISITOR
        )
      ).toBe(false);
    });
  });

  describe('Authorization Matrix Guard (authMatrix)', () => {
    const superadminUser = { id: 'u1', role: 'superadmin', isDev: false };
    const normalUser = { id: 'u2', role: 'user', isDev: false };

    it('correctly gates instance admin permission', () => {
      expect(hasPermission(PERMISSIONS.INSTANCE_ADMIN, superadminUser)).toBe(true);
      expect(hasPermission(PERMISSIONS.INSTANCE_ADMIN, normalUser)).toBe(false);
    });

    it('correctly gates family editor and admin permissions', () => {
      expect(hasPermission(PERMISSIONS.FAMILY_EDITOR, normalUser, 'parent')).toBe(true);
      expect(hasPermission(PERMISSIONS.FAMILY_EDITOR, normalUser, 'editor')).toBe(true);
      expect(hasPermission(PERMISSIONS.FAMILY_EDITOR, normalUser, 'visitor')).toBe(false);

      expect(hasPermission(PERMISSIONS.FAMILY_ADMIN, normalUser, 'owner')).toBe(true);
      expect(hasPermission(PERMISSIONS.FAMILY_ADMIN, normalUser, 'admin')).toBe(true);
      expect(hasPermission(PERMISSIONS.FAMILY_ADMIN, normalUser, 'parent')).toBe(false);
    });
  });
});
