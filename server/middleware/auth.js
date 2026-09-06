import jwt from 'jsonwebtoken';
import { readDb, sqlite } from '../utils/db.js';
import { getJwtSecret } from '../security/keys.js';

export const JWT_SECRET = getJwtSecret();
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
    const userRow = sqlite.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);

    if (!userRow) {
      return res.status(401).json({ error: 'Benutzerkonto nicht gefunden.' });
    }

    let sessions = [];
    if (userRow.sessions) {
      try {
        sessions = JSON.parse(userRow.sessions);
      } catch {
        sessions = [];
      }
    }

    // Invalidate sessions if specific session was revoked or expired (Issue #249, #262)
    if (decoded.sessionId && Array.isArray(sessions)) {
      const activeSession = sessions.find((s) => s.id === decoded.sessionId);
      if (!activeSession) {
        return res.status(401).json({
          error: 'Diese Sitzung wurde abgemeldet. Bitte erneut anmelden.',
        });
      }

      const maxLifetimeMs = 30 * 24 * 60 * 60 * 1000;
      const inactivityTimeoutMs = 7 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      const created = new Date(activeSession.createdAt).getTime();
      const lastActive = new Date(activeSession.lastActiveAt || activeSession.createdAt).getTime();

      if (now - created > maxLifetimeMs || now - lastActive > inactivityTimeoutMs) {
        // Expire session
        const updatedSessions = sessions.filter((s) => s.id !== decoded.sessionId);
        sqlite
          .prepare('UPDATE users SET sessions = ? WHERE id = ?')
          .run(JSON.stringify(updatedSessions), userRow.id);
        return res.status(401).json({
          error: 'Diese Sitzung ist durch Inaktivität abgelaufen. Bitte erneut anmelden.',
        });
      }

      activeSession.lastActiveAt = new Date().toISOString();
      sqlite
        .prepare('UPDATE users SET sessions = ? WHERE id = ?')
        .run(JSON.stringify(sessions), userRow.id);
    }

    const isDev = Boolean(
      userRow.isDev ||
      userRow.role === 'superadmin' ||
      (process.env.DEV_EMAIL &&
        userRow.email?.toLowerCase() === process.env.DEV_EMAIL.toLowerCase())
    );

    req.user = {
      id: userRow.id,
      email: userRow.email,
      name: userRow.name,
      role: userRow.role || (isDev ? 'superadmin' : 'user'),
      isDev,
      sessionId: decoded.sessionId,
    };
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
  const isInstAdmin = Boolean(
    user && (user.role === 'admin' || user.role === 'superadmin' || user.isDev)
  );
  if (!isInstAdmin) {
    return res.status(403).json({
      error:
        'Zugriff verweigert: Nur Instanz-Administratoren dürfen Server-Einstellungen verwalten.',
    });
  }

  next();
}
