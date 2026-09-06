/**
 * server/security/roles.js
 * Central definitions for BabyCharts Two-Tier Role-Based Access Control (Issue #321).
 *
 * Tier 1: Instance Roles (Global on users table)
 * - superadmin: Full instance management (backups, settings, telemetry, diagnostics)
 * - user: Standard application user
 *
 * Tier 2: Family Roles (Scoped per family membership)
 * - owner: Full family governance, ownership transfer, family deletion, full backup export/import
 * - parent: Read & write access to all child profiles, measurements, milestones, health logs; can manage visitors
 * - visitor: Explicit read-only access (default-deny, restricted to granted categories)
 */

export const INSTANCE_ROLES = Object.freeze({
  SUPERADMIN: 'superadmin',
  USER: 'user',
});

export const FAMILY_ROLES = Object.freeze({
  OWNER: 'owner',
  PARENT: 'parent',
  VISITOR: 'visitor',
});

/**
 * Normalizes and maps legacy family role representations deterministically (Issue #321).
 * Legacy mapping:
 * - 'admin' / family owner -> 'owner'
 * - 'editor' -> 'parent'
 * - 'viewer' -> 'visitor'
 */
export function normalizeFamilyRole(role, isOwner = false) {
  if (isOwner) {
    return FAMILY_ROLES.OWNER;
  }
  if (!role) {
    return null;
  }
  if (role === 'owner' || role === 'admin') {
    return FAMILY_ROLES.OWNER;
  }
  if (role === 'parent' || role === 'editor') {
    return FAMILY_ROLES.PARENT;
  }
  if (role === 'visitor' || role === 'viewer') {
    return FAMILY_ROLES.VISITOR;
  }
  return FAMILY_ROLES.VISITOR;
}

/**
 * Normalizes global user role to instanceRole (Issue #321).
 * Legacy mapping:
 * - 'superadmin' / isDev === true -> 'superadmin'
 * - 'user' / null / other -> 'user'
 */
export function normalizeInstanceRole(role, isDev = false) {
  if (role === 'superadmin' || isDev) {
    return INSTANCE_ROLES.SUPERADMIN;
  }
  return INSTANCE_ROLES.USER;
}
