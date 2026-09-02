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

function extractTokenFromRequest(req) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  const cookieHeader = req.headers.cookie;
  if (typeof cookieHeader === 'string') {
    const regex = /(?:^|;\s*)(?:babycharts_token|babycharts_session)=([^;]+)/;
    const match = regex.exec(cookieHeader);
    if (match?.[1]) {
      return decodeURIComponent(match[1]);
    }
  }

  return null;
}

/**
 * Middleware: Requires a valid JWT bearer token or session cookie.
 * Populates req.user with { id, email, name }
 */
export function requireAuth(req, res, next) {
  const token = extractTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ error: 'Nicht autorisiert. Bitte einloggen.' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = readDb();
    const user = db.users.find((u) => u.id === decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'Benutzerkonto nicht gefunden.' });
    }

    // Invalidate sessions if specific session was revoked (Issue #249)
    if (decoded.sessionId && Array.isArray(user.sessions)) {
      const activeSession = user.sessions.find((s) => s.id === decoded.sessionId);
      if (!activeSession) {
        return res.status(401).json({
          error: 'Diese Sitzung wurde abgemeldet. Bitte erneut anmelden.',
        });
      }
      activeSession.lastActiveAt = new Date().toISOString();
    }

    req.user = { id: user.id, email: user.email, name: user.name, sessionId: decoded.sessionId };
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

/**
 * Middleware: Requires the user to be an Instance Admin (role === 'admin' on user record).
 */
export function requireInstanceAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Nicht autorisiert. Bitte einloggen.' });
  }

  const db = readDb();
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user || (user.role !== 'admin' && !user.isDev)) {
    return res.status(403).json({
      error:
        'Zugriff verweigert: Nur Instanz-Administratoren dürfen Server-Einstellungen verwalten.',
    });
  }

  next();
}
