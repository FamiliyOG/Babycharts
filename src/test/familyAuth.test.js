import { describe, it, expect } from 'vitest';
import { getUserFamilyRole, requireFamilyPermission } from '../../server/middleware/auth.js';

describe('Family Permission Helper & Middleware', () => {
  const mockFamily = {
    id: 'fam-1',
    name: 'Test Family',
    ownerId: 'user-owner',
    members: [
      { userId: 'user-editor', role: 'editor' },
      { userId: 'user-viewer', role: 'viewer' },
    ],
  };

  it('correctly identifies owner as admin', () => {
    expect(getUserFamilyRole(mockFamily, 'user-owner')).toBe('admin');
  });

  it('correctly identifies member roles', () => {
    expect(getUserFamilyRole(mockFamily, 'user-editor')).toBe('editor');
    expect(getUserFamilyRole(mockFamily, 'user-viewer')).toBe('viewer');
  });

  it('returns null for non-members', () => {
    expect(getUserFamilyRole(mockFamily, 'user-stranger')).toBeNull();
    expect(getUserFamilyRole(null, 'user-1')).toBeNull();
    expect(getUserFamilyRole(mockFamily, null)).toBeNull();
  });

  it('requireFamilyPermission middleware blocks unauthenticated requests', () => {
    const middleware = requireFamilyPermission(['admin', 'editor']);
    let status = null;
    let jsonPayload = null;
    const req = { user: null };
    const res = {
      status: (s) => {
        status = s;
        return {
          json: (j) => {
            jsonPayload = j;
          },
        };
      },
    };
    const next = () => {};

    middleware(req, res, next);
    expect(status).toBe(401);
    expect(jsonPayload?.error).toContain('Nicht autorisiert');
  });
});
