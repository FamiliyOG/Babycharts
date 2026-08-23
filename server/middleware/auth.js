/**
 * server/middleware/auth.js
 * Authentication & Authorization middleware using JWT
 */

import jwt from 'jsonwebtoken';
import { readDb } from '../utils/db.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'babycharts-secure-jwt-secret-key-2026';

/**
 * Middleware: Requires a valid JWT bearer token.
 * Populates req.user with { id, email, name }
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Nicht autorisiert. Bitte einloggen.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = readDb();
    const user = db.users.find((u) => u.id === decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'Benutzerkonto nicht gefunden.' });
    }

    req.user = { id: user.id, email: user.email, name: user.name };
    next();
  } catch (err) {
    console.debug('[Auth] Token verification failed:', err.message);
    return res.status(401).json({ error: 'Ungültiges oder abgelaufenes Anmelde-Token.' });
  }
}

/**
 * Middleware (optional auth): Populates req.user if valid token provided, but doesn't block.
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const db = readDb();
      const user = db.users.find((u) => u.id === decoded.id);
      if (user) {
        req.user = { id: user.id, email: user.email, name: user.name };
      }
    } catch {
      // Ignore token validation failure in optional auth
    }
  }
  next();
}

/**
 * Helper to get user's role in a family: 'admin' | 'editor' | 'viewer' | null
 */
export function getUserFamilyRole(family, userId) {
  if (!family || !userId) return null;
  if (family.ownerId === userId) return 'admin';
  const member = family.members?.find((m) => m.userId === userId);
  return member ? member.role : null;
}
