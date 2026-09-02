/**
 * server/services/sessionService.js
 * Device and Session Management for authenticated users (Issue #249).
 */

import crypto from 'node:crypto';

/**
 * Parses user agent string to identify device, OS and browser.
 */
export function parseUserAgent(userAgent = '') {
  const ua = userAgent.toLowerCase();
  let browser = 'Browser';
  let os = 'Unbekanntes OS';

  if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('edg')) browser = 'Edge';
  else if (ua.includes('chrome')) browser = 'Chrome';
  else if (ua.includes('safari')) browser = 'Safari';

  if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('macintosh') || ua.includes('mac os')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';

  return `${browser} auf ${os}`;
}

/**
 * Creates a new session record for a user upon login or registration.
 */
export function createSession(user, req) {
  const sessionId = crypto.randomUUID();
  const rawUa = req.headers['user-agent'] || 'Unbekanntes Gerät';
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'Unbekannt';

  const session = {
    id: sessionId,
    device: parseUserAgent(rawUa),
    userAgent: rawUa,
    ip: typeof ip === 'string' ? ip.split(',')[0].trim() : 'Unbekannt',
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  };

  user.sessions = user.sessions || [];
  // Keep maximum 20 active sessions per user to avoid unbounded list growth
  if (user.sessions.length >= 20) {
    user.sessions.shift();
  }
  user.sessions.push(session);

  return sessionId;
}

/**
 * Updates the last activity timestamp for a given session.
 */
export function touchSession(user, sessionId) {
  if (!user.sessions || !sessionId) return;
  const session = user.sessions.find((s) => s.id === sessionId);
  if (session) {
    session.lastActiveAt = new Date().toISOString();
  }
}

/**
 * Revokes a specific session by sessionId.
 */
export function revokeSession(user, sessionId) {
  if (!user.sessions) return false;
  const initialLength = user.sessions.length;
  user.sessions = user.sessions.filter((s) => s.id !== sessionId);
  return user.sessions.length < initialLength;
}

/**
 * Revokes all sessions except the currently active session.
 */
export function revokeAllOtherSessions(user, currentSessionId) {
  if (!user.sessions) return;
  user.sessions = user.sessions.filter((s) => s.id === currentSessionId);
}
