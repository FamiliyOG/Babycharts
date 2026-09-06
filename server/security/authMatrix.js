import {
  INSTANCE_ROLES,
  FAMILY_ROLES,
  normalizeFamilyRole,
  normalizeInstanceRole,
} from './roles.js';

export const PERMISSIONS = Object.freeze({
  PUBLIC: 'public',
  AUTHENTICATED: 'authenticated',
  FAMILY_MEMBER: 'family:member',
  FAMILY_EDITOR: 'family:editor',
  FAMILY_ADMIN: 'family:admin',
  INSTANCE_ADMIN: 'instance:admin',
});

/**
 * Route-to-Permission definitions
 */
export const ROUTE_POLICIES = Object.freeze({
  // Auth Public
  'GET /api/auth/setup-status': PERMISSIONS.PUBLIC,
  'POST /api/auth/register': PERMISSIONS.PUBLIC,
  'POST /api/auth/login': PERMISSIONS.PUBLIC,
  'POST /api/auth/forgot-password': PERMISSIONS.PUBLIC,
  'POST /api/auth/reset-password': PERMISSIONS.PUBLIC,

  // Auth Authenticated
  'POST /api/auth/logout': PERMISSIONS.AUTHENTICATED,
  'GET /api/auth/me': PERMISSIONS.AUTHENTICATED,
  'PUT /api/auth/me': PERMISSIONS.AUTHENTICATED,
  'GET /api/auth/sessions': PERMISSIONS.AUTHENTICATED,
  'DELETE /api/auth/sessions': PERMISSIONS.AUTHENTICATED,
  'DELETE /api/auth/sessions/:sessionId': PERMISSIONS.AUTHENTICATED,
  'POST /api/auth/2fa/setup': PERMISSIONS.AUTHENTICATED,
  'POST /api/auth/2fa/verify': PERMISSIONS.AUTHENTICATED,
  'POST /api/auth/2fa/disable': PERMISSIONS.AUTHENTICATED,
  'POST /api/auth/change-password': PERMISSIONS.AUTHENTICATED,
  'DELETE /api/auth/account': PERMISSIONS.AUTHENTICATED,
  'POST /api/auth/delete-account': PERMISSIONS.AUTHENTICATED,
  'GET /api/auth/export-my-data': PERMISSIONS.AUTHENTICATED,
  'POST /api/auth/reauth': PERMISSIONS.AUTHENTICATED,

  // Families
  'POST /api/families': PERMISSIONS.AUTHENTICATED,
  'POST /api/families/join': PERMISSIONS.AUTHENTICATED,
  'GET /api/families/:familyId': PERMISSIONS.FAMILY_MEMBER,
  'PUT /api/families/:familyId': PERMISSIONS.FAMILY_EDITOR,
  'DELETE /api/families/:familyId': PERMISSIONS.FAMILY_ADMIN,
  'POST /api/families/:familyId/invites': PERMISSIONS.FAMILY_EDITOR,
  'DELETE /api/families/:familyId/invites/:code': PERMISSIONS.FAMILY_EDITOR,
  'PUT /api/families/:familyId/members/:userId': PERMISSIONS.FAMILY_ADMIN,
  'DELETE /api/families/:familyId/members/:userId': PERMISSIONS.FAMILY_ADMIN,
  'POST /api/families/:familyId/transfer-ownership': PERMISSIONS.FAMILY_ADMIN,
  'POST /api/families/:familyId/leave': PERMISSIONS.FAMILY_MEMBER,
  'GET /api/families/:familyId/audit-log': PERMISSIONS.FAMILY_MEMBER,
  'GET /api/families/:familyId/visitor-grants/:visitorUserId': PERMISSIONS.FAMILY_MEMBER,
  'PUT /api/families/:familyId/visitor-grants/:visitorUserId': PERMISSIONS.FAMILY_EDITOR,
  'POST /api/families/:familyId/emergency-access': PERMISSIONS.INSTANCE_ADMIN,
  'GET /api/families/:familyId/backup': PERMISSIONS.FAMILY_ADMIN,
  'POST /api/families/:familyId/backup/dry-run': PERMISSIONS.FAMILY_ADMIN,

  // Profiles
  'GET /api/profiles': PERMISSIONS.AUTHENTICATED,
  'GET /api/profiles/search': PERMISSIONS.AUTHENTICATED,
  'POST /api/profiles': PERMISSIONS.FAMILY_EDITOR,
  'POST /api/profiles/import': PERMISSIONS.FAMILY_ADMIN,
  'GET /api/profiles/:id': PERMISSIONS.FAMILY_MEMBER,
  'GET /api/profiles/:id/measurements': PERMISSIONS.FAMILY_MEMBER,
  'GET /api/profiles/:id/health-logs': PERMISSIONS.FAMILY_MEMBER,
  'PUT /api/profiles/:id': PERMISSIONS.FAMILY_EDITOR,
  'DELETE /api/profiles/:id': PERMISSIONS.FAMILY_EDITOR,
  'POST /api/profiles/:id/restore': PERMISSIONS.FAMILY_EDITOR,
  'POST /api/profiles/:id/doctor-share': PERMISSIONS.FAMILY_EDITOR,
  'POST /api/profiles/:id/doctor-share/:shareId/revoke': PERMISSIONS.FAMILY_EDITOR,
  'GET /api/profiles/share/doctor-view': PERMISSIONS.PUBLIC,

  // Settings
  'GET /api/settings/public': PERMISSIONS.PUBLIC,
  'GET /api/settings/catalog': PERMISSIONS.INSTANCE_ADMIN,
  'GET /api/settings': PERMISSIONS.AUTHENTICATED,
  'POST /api/settings': PERMISSIONS.INSTANCE_ADMIN,
  'GET /api/settings/developer-diagnostics': PERMISSIONS.INSTANCE_ADMIN,
  'POST /api/settings/retention/cleanup': PERMISSIONS.INSTANCE_ADMIN,

  // Exports & Media
  'GET /api/exports': PERMISSIONS.AUTHENTICATED,
  'GET /api/exports/download': PERMISSIONS.AUTHENTICATED,
  'DELETE /api/exports/delete': PERMISSIONS.FAMILY_EDITOR,
  'GET /api/exports/health': PERMISSIONS.AUTHENTICATED,
  'GET /api/exports/backups': PERMISSIONS.INSTANCE_ADMIN,
  'POST /api/exports/backups/create': PERMISSIONS.INSTANCE_ADMIN,
  'POST /api/exports/backups/restore/:filename': PERMISSIONS.INSTANCE_ADMIN,
  'GET /api/media/:id': PERMISSIONS.FAMILY_MEMBER,
  'POST /api/media/upload': PERMISSIONS.AUTHENTICATED,
  'DELETE /api/media/:id': PERMISSIONS.FAMILY_EDITOR,
});

/**
 * Verifies if user has permission level
 */
export function hasPermission(requiredPermission, user, familyRole = null) {
  if (requiredPermission === PERMISSIONS.PUBLIC) return true;
  if (!user) return false;
  if (requiredPermission === PERMISSIONS.AUTHENTICATED) return true;

  const instRole = normalizeInstanceRole(user.role, user.isDev);
  const famRole = normalizeFamilyRole(familyRole);

  if (requiredPermission === PERMISSIONS.INSTANCE_ADMIN) {
    return instRole === INSTANCE_ROLES.SUPERADMIN;
  }

  if (requiredPermission === PERMISSIONS.FAMILY_MEMBER) {
    return [FAMILY_ROLES.OWNER, FAMILY_ROLES.PARENT, FAMILY_ROLES.VISITOR].includes(famRole);
  }

  if (requiredPermission === PERMISSIONS.FAMILY_EDITOR) {
    return [FAMILY_ROLES.OWNER, FAMILY_ROLES.PARENT].includes(famRole);
  }

  if (requiredPermission === PERMISSIONS.FAMILY_ADMIN) {
    return famRole === FAMILY_ROLES.OWNER;
  }

  return false;
}

/**
 * Express middleware to enforce a required permission level
 */
export function enforcePermission(requiredPermission) {
  return (req, res, next) => {
    const familyRole = req.familyRole || null;
    if (!hasPermission(requiredPermission, req.user, familyRole)) {
      return res.status(403).json({
        error: 'Zugriff verweigert: Unzureichende Berechtigungen.',
      });
    }
    next();
  };
}
