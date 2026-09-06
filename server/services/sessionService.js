/**
 * server/services/sessionService.js
 * Device and Session Management for authenticated users (Issue #249).
 */

import crypto from 'node:crypto';
import { userRepository } from '../repositories/index.js';

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
 * Creates a new session record for a user upon login or registration,
 * persists it to the database and returns the new sessionId.
 *
 * @param {object} user - Hydrated user object (must have .id and .sessions[]).
 * @param {string} userAgent - Raw User-Agent header string.
 * @param {string} ip - Client IP address.
 * @returns {string} The new sessionId.
 */
export function createSession(user, userAgent, ip) {
  const sessionId = crypto.randomUUID();
  const rawUa = typeof userAgent === 'string' ? userAgent : 'Unbekanntes Gerät';
  const rawIp = typeof ip === 'string' ? ip.split(',')[0].trim() : 'Unbekannt';

  const session = {
    id: sessionId,
    device: parseUserAgent(rawUa),
    userAgent: rawUa,
    ip: rawIp,
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  };

  const maxLifetimeMs = 30 * 24 * 60 * 60 * 1000; // 30 days maximum session lifetime
  const inactivityTimeoutMs = 7 * 24 * 60 * 60 * 1000; // 7 days inactivity expiration
  const now = Date.now();

  const activeSessions = (user.sessions || []).filter((s) => {
    const created = new Date(s.createdAt).getTime();
    const lastActive = new Date(s.lastActiveAt || s.createdAt).getTime();
    return now - created < maxLifetimeMs && now - lastActive < inactivityTimeoutMs;
  });

  // Keep maximum 20 active sessions per user to avoid unbounded list growth
  if (activeSessions.length >= 20) {
    activeSessions.shift();
  }
  activeSessions.push(session);

  // Persist updated session list to SQLite
  userRepository.updateSessions(user.id, activeSessions);

  return sessionId;
}

/**
 * Updates the last activity timestamp for a given session and persists it.
 */
export function touchSession(user, sessionId) {
  if (!user.sessions || !sessionId) return;
  const session = user.sessions.find((s) => s.id === sessionId);
  if (session) {
    session.lastActiveAt = new Date().toISOString();
    userRepository.updateSessions(user.id, user.sessions);
  }
}

/**
 * Revokes a specific session by sessionId and persists it.
 */
export function revokeSession(user, sessionId) {
  if (!user.sessions) return false;
  const initialLength = user.sessions.length;
  const remaining = user.sessions.filter((s) => s.id !== sessionId);
  const removed = remaining.length < initialLength;
  if (removed) {
    userRepository.updateSessions(user.id, remaining);
  }
  return removed;
}

/**
 * Revokes all sessions except the currently active session and persists it.
 */
export function revokeAllOtherSessions(user, currentSessionId) {
  if (!user.sessions) return;
  const remaining = user.sessions.filter((s) => s.id === currentSessionId);
  userRepository.updateSessions(user.id, remaining);
}
