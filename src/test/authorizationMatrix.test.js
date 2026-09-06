/**
 * src/test/authorizationMatrix.test.js
 * Automated test suite enforcing the Central Authorization Matrix (Issue #268 / BC-268)
 * and RBAC test coverage (Issue #334 / BC-334).
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ROUTE_POLICIES, PERMISSIONS, hasPermission } from '../../server/security/authMatrix.js';

describe('Central Authorization Matrix Gate (BC-268, BC-334)', () => {
  it('every route in server/routes/ has a registered policy in ROUTE_POLICIES', () => {
    const routesDir = path.resolve(process.cwd(), 'server', 'routes');
    const files = fs.readdirSync(routesDir);
    const discoveredRoutes = [];

    for (const file of files) {
      if (!file.endsWith('.js')) continue;
      const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
      const basePrefix =
        file === 'auth.js'
          ? '/api/auth'
          : file === 'families.js'
            ? '/api/families'
            : file === 'profiles.js'
              ? '/api/profiles'
              : file === 'settings.js'
                ? '/api/settings'
                : file === 'exports.js'
                  ? '/api/exports'
                  : file === 'media.js'
                    ? '/api/media'
                    : '/api';

      const routeRegex = /router\.(get|post|put|delete|patch)\(\s*['"]([^'"]+)['"]/g;
      let match;
      while ((match = routeRegex.exec(content)) !== null) {
        const method = match[1].toUpperCase();
        const subPath = match[2] === '/' ? '' : match[2];
        discoveredRoutes.push(`${method} ${basePrefix}${subPath}`);
      }
    }

    const policyKeys = new Set(Object.keys(ROUTE_POLICIES));
    const missing = discoveredRoutes.filter((r) => !policyKeys.has(r));

    expect(
      missing,
      `Found unregistered routes not covered by ROUTE_POLICIES: ${missing.join(', ')}`
    ).toEqual([]);
  });

  it('no rogue or orphaned routes exist in ROUTE_POLICIES', () => {
    const routesDir = path.resolve(process.cwd(), 'server', 'routes');
    const files = fs.readdirSync(routesDir);
    const discoveredRoutes = new Set();

    for (const file of files) {
      if (!file.endsWith('.js')) continue;
      const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
      const basePrefix =
        file === 'auth.js'
          ? '/api/auth'
          : file === 'families.js'
            ? '/api/families'
            : file === 'profiles.js'
              ? '/api/profiles'
              : file === 'settings.js'
                ? '/api/settings'
                : file === 'exports.js'
                  ? '/api/exports'
                  : file === 'media.js'
                    ? '/api/media'
                    : '/api';

      const routeRegex = /router\.(get|post|put|delete|patch)\(\s*['"]([^'"]+)['"]/g;
      let match;
      while ((match = routeRegex.exec(content)) !== null) {
        const method = match[1].toUpperCase();
        const subPath = match[2] === '/' ? '' : match[2];
        discoveredRoutes.add(`${method} ${basePrefix}${subPath}`);
      }
    }

    const extra = Object.keys(ROUTE_POLICIES).filter((r) => !discoveredRoutes.has(r));
    expect(
      extra,
      `Found orphaned policies in ROUTE_POLICIES for non-existent routes: ${extra.join(', ')}`
    ).toEqual([]);
  });

  describe('Permission Evaluation Function (hasPermission)', () => {
    const superadminUser = { id: 'sa-1', role: 'superadmin', isDev: false };
    const standardUser = { id: 'usr-1', role: 'user', isDev: false };

    it('allows PUBLIC permission to unauthenticated and authenticated requests', () => {
      expect(hasPermission(PERMISSIONS.PUBLIC, null, null)).toBe(true);
      expect(hasPermission(PERMISSIONS.PUBLIC, standardUser, null)).toBe(true);
    });

    it('restricts AUTHENTICATED permission to logged-in users only', () => {
      expect(hasPermission(PERMISSIONS.AUTHENTICATED, null, null)).toBe(false);
      expect(hasPermission(PERMISSIONS.AUTHENTICATED, standardUser, null)).toBe(true);
    });

    it('restricts INSTANCE_ADMIN permission to superadmin users only', () => {
      expect(hasPermission(PERMISSIONS.INSTANCE_ADMIN, null, null)).toBe(false);
      expect(hasPermission(PERMISSIONS.INSTANCE_ADMIN, standardUser, null)).toBe(false);
      expect(hasPermission(PERMISSIONS.INSTANCE_ADMIN, standardUser, 'admin')).toBe(false);
      expect(hasPermission(PERMISSIONS.INSTANCE_ADMIN, superadminUser, null)).toBe(true);
    });

    it('evaluates FAMILY_MEMBER for owner, parent and visitor', () => {
      expect(hasPermission(PERMISSIONS.FAMILY_MEMBER, standardUser, null)).toBe(false);
      expect(hasPermission(PERMISSIONS.FAMILY_MEMBER, standardUser, 'owner')).toBe(true);
      expect(hasPermission(PERMISSIONS.FAMILY_MEMBER, standardUser, 'parent')).toBe(true);
      expect(hasPermission(PERMISSIONS.FAMILY_MEMBER, standardUser, 'visitor')).toBe(true);
      // Legacy alias support
      expect(hasPermission(PERMISSIONS.FAMILY_MEMBER, standardUser, 'admin')).toBe(true);
      expect(hasPermission(PERMISSIONS.FAMILY_MEMBER, standardUser, 'editor')).toBe(true);
      expect(hasPermission(PERMISSIONS.FAMILY_MEMBER, standardUser, 'viewer')).toBe(true);
    });

    it('evaluates FAMILY_EDITOR for owner and parent, but denies visitor', () => {
      expect(hasPermission(PERMISSIONS.FAMILY_EDITOR, standardUser, 'visitor')).toBe(false);
      expect(hasPermission(PERMISSIONS.FAMILY_EDITOR, standardUser, 'viewer')).toBe(false);
      expect(hasPermission(PERMISSIONS.FAMILY_EDITOR, standardUser, 'parent')).toBe(true);
      expect(hasPermission(PERMISSIONS.FAMILY_EDITOR, standardUser, 'editor')).toBe(true);
      expect(hasPermission(PERMISSIONS.FAMILY_EDITOR, standardUser, 'owner')).toBe(true);
      expect(hasPermission(PERMISSIONS.FAMILY_EDITOR, standardUser, 'admin')).toBe(true);
    });

    it('evaluates FAMILY_ADMIN strictly for family owner/admin', () => {
      expect(hasPermission(PERMISSIONS.FAMILY_ADMIN, standardUser, 'visitor')).toBe(false);
      expect(hasPermission(PERMISSIONS.FAMILY_ADMIN, standardUser, 'parent')).toBe(false);
      expect(hasPermission(PERMISSIONS.FAMILY_ADMIN, standardUser, 'editor')).toBe(false);
      expect(hasPermission(PERMISSIONS.FAMILY_ADMIN, standardUser, 'owner')).toBe(true);
      expect(hasPermission(PERMISSIONS.FAMILY_ADMIN, standardUser, 'admin')).toBe(true);
    });
  });
});
