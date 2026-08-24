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
