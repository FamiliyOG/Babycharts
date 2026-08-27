import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { readDb, sqlite } from '../utils/db.js';

/**
 * Resolve or dynamically generate a secure JWT Secret
 * Checks:
 * 1. process.env.JWT_SECRET (Environment override)
 * 2. SQLite settings table ('jwt_secret')
 * 3. Dynamically generated 64-byte random hex string persisted in SQLite
 */
function getOrCreateJwtSecret() {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length > 0) {
    return process.env.JWT_SECRET.trim();
  }

  try {
    const row = sqlite.prepare('SELECT value FROM settings WHERE key = ?').get('jwt_secret');
    if (row?.value) {
      return row.value;
    }

    const generated = crypto.randomBytes(64).toString('hex');
    sqlite
      .prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
      .run('jwt_secret', generated);
    return generated;
  } catch {
    return crypto.randomBytes(64).toString('hex');
  }
}

export const JWT_SECRET = getOrCreateJwtSecret();
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

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

    // Invalidate sessions if password was changed or sessions revoked (Issues BC-028, BC-029)
    const currentTokenVersion = user.tokenVersion || 0;
    const tokenVersionInJwt = decoded.tokenVersion || 0;
    if (tokenVersionInJwt < currentTokenVersion) {
      return res.status(401).json({
        error:
          'Ihre Sitzung ist abgelaufen, da das Passwort geändert wurde. Bitte erneut anmelden.',
      });
    }

    req.user = { id: user.id, email: user.email, name: user.name };
    next();
  } catch (err) {
    const timestamp = new Date().toISOString();
    console.warn(
      `\x1b[33m[AUTH TOKEN ${timestamp}]\x1b[0m Token verification rejected: ${err.message} (Client needs to re-login)`
    );
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

/**
 * Middleware: Requires the user to have specific role(s) in the target family.
 * Looks for familyId in req.params, req.body, or req.query.
 * @param {string[]} allowedRoles - e.g. ['admin'], ['admin', 'editor']
 */
export function requireFamilyPermission(allowedRoles = ['admin', 'editor']) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Nicht autorisiert. Bitte einloggen.' });
    }

    const familyId = req.params?.familyId || req.body?.familyId || req.query?.familyId;
    if (!familyId) {
      return res.status(400).json({ error: 'familyId ist erforderlich.' });
    }

    const db = readDb();
    const family = db.families.find((f) => f.id === familyId);
    if (!family) {
      return res.status(404).json({ error: 'Familie nicht gefunden.' });
    }

    const role = getUserFamilyRole(family, req.user.id);
    if (!role) {
      return res
        .status(403)
        .json({ error: 'Zugriff verweigert: Sie gehören nicht zu dieser Familie.' });
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
      return res.status(403).json({ error: 'Unzureichende Berechtigungen für diese Aktion.' });
    }

    req.family = family;
    req.familyRole = role;
    next();
  };
}
