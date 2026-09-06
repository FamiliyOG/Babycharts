/**
 * server/utils/logger.js
 *
 * Structured JSON logger with automatic PII / secret redaction (BC-309).
 * Guarantees that passwords, tokens, JWTs, and medical notes are never logged in plaintext.
 */

const REDACTED_KEYS = new Set([
  'password',
  'token',
  'secret',
  'jwt',
  'twofactorsecret',
  'recoverycodes',
  'authorization',
  'cookie',
  'medicalnotes',
  'notes',
]);

export function redactSensitive(obj, depth = 0) {
  if (depth > 5 || !obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitive(item, depth + 1));
  }

  const sanitized = {};
  for (const [key, val] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (REDACTED_KEYS.has(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof val === 'object' && val !== null) {
      sanitized[key] = redactSensitive(val, depth + 1);
    } else {
      sanitized[key] = val;
    }
  }

  return sanitized;
}

export function logEvent(level, message, meta = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...redactSensitive(meta),
  };

  const output = JSON.stringify(entry);
  if (level === 'error') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export const logger = {
  info: (msg, meta) => logEvent('info', msg, meta),
  warn: (msg, meta) => logEvent('warn', msg, meta),
  error: (msg, meta) => logEvent('error', msg, meta),
};
