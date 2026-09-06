import { INSTANCE_ROLES, FAMILY_ROLES } from './roles.js';

/**
 * server/security/permissions.js
 * Central permission catalog for instance and family actions (Issue #322).
 */

export const PERMISSIONS = Object.freeze({
  // Family & Profiles
  FAMILY_READ: 'family.read',
  FAMILY_MANAGE: 'family.manage',
  FAMILY_DELETE: 'family.delete',
  FAMILY_OWNERSHIP_TRANSFER: 'family.ownership.transfer',
  FAMILY_INVITE_MANAGE: 'family.invite.manage',
  FAMILY_BACKUP_EXPORT: 'family.backup.export',
  FAMILY_BACKUP_IMPORT: 'family.backup.import',

  PROFILE_READ: 'profile.read',
  PROFILE_WRITE: 'profile.write',
  PROFILE_DELETE: 'profile.delete',

  VISITOR_PERMISSIONS_MANAGE: 'visitor.permissions.manage',

  // Instance / Superadmin
  INSTANCE_SETTINGS_READ: 'instance.settings.read',
  INSTANCE_SETTINGS_WRITE: 'instance.settings.write',
  INSTANCE_BACKUP_MANAGE: 'instance.backup.manage',
  DEVELOPER_DIAGNOSTICS_READ: 'developer.diagnostics.read',
});

/**
 * Static mapping of Family Roles to allowed permissions
 */
export const FAMILY_ROLE_PERMISSIONS = Object.freeze({
  [FAMILY_ROLES.OWNER]: new Set([
    PERMISSIONS.FAMILY_READ,
    PERMISSIONS.FAMILY_MANAGE,
    PERMISSIONS.FAMILY_DELETE,
    PERMISSIONS.FAMILY_OWNERSHIP_TRANSFER,
    PERMISSIONS.FAMILY_INVITE_MANAGE,
    PERMISSIONS.FAMILY_BACKUP_EXPORT,
    PERMISSIONS.FAMILY_BACKUP_IMPORT,
    PERMISSIONS.PROFILE_READ,
    PERMISSIONS.PROFILE_WRITE,
    PERMISSIONS.PROFILE_DELETE,
    PERMISSIONS.VISITOR_PERMISSIONS_MANAGE,
  ]),
  [FAMILY_ROLES.PARENT]: new Set([
    PERMISSIONS.FAMILY_READ,
    PERMISSIONS.FAMILY_INVITE_MANAGE, // Parent can invite visitors
    PERMISSIONS.PROFILE_READ,
    PERMISSIONS.PROFILE_WRITE,
    PERMISSIONS.PROFILE_DELETE,
    PERMISSIONS.VISITOR_PERMISSIONS_MANAGE,
  ]),
  [FAMILY_ROLES.VISITOR]: new Set([
    PERMISSIONS.FAMILY_READ,
    PERMISSIONS.PROFILE_READ, // Subject to granular category grants
  ]),
});

/**
 * Static mapping of Instance Roles to allowed permissions
 */
export const INSTANCE_ROLE_PERMISSIONS = Object.freeze({
  [INSTANCE_ROLES.SUPERADMIN]: new Set([
    PERMISSIONS.INSTANCE_SETTINGS_READ,
    PERMISSIONS.INSTANCE_SETTINGS_WRITE,
    PERMISSIONS.INSTANCE_BACKUP_MANAGE,
    PERMISSIONS.DEVELOPER_DIAGNOSTICS_READ,
  ]),
  [INSTANCE_ROLES.USER]: new Set([]),
});

/**
 * Evaluates whether a given user with their instance and family roles possesses a permission.
 */
export function checkPermission(permission, instanceRole, familyRole = null) {
  if (INSTANCE_ROLE_PERMISSIONS[instanceRole]?.has(permission)) {
    return true;
  }
  if (familyRole && FAMILY_ROLE_PERMISSIONS[familyRole]?.has(permission)) {
    return true;
  }
  return false;
}
