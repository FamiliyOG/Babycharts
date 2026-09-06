import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './auth.js';

/**
 * server/middleware/requireRecentAuth.js
 * Enforces fresh authentication (password / TOTP within 5 minutes) for critical actions (Issue #333).
 * Looks for 'X-Reauth-Token' header or body field.
 */
export function requireRecentAuth(req, res, next) {
  const reauthToken =
    req.headers['x-reauth-token'] || (typeof req.body === 'object' ? req.body?.reauthToken : null);

  if (!reauthToken || typeof reauthToken !== 'string') {
    return res.status(403).json({
      error: 'Re-Authentifizierung erforderlich: Bitte bestätigen Sie Ihre Identität.',
      code: 'REAUTH_REQUIRED',
    });
  }

  try {
    const decoded = jwt.verify(reauthToken.trim(), JWT_SECRET);
    if (decoded.scope !== 'recent_reauth' || decoded.id !== req.user?.id) {
      return res.status(403).json({
        error: 'Ungültiges oder fremdes Re-Authentifizierungs-Ticket.',
        code: 'REAUTH_INVALID',
      });
    }
    next();
  } catch {
    return res.status(403).json({
      error: 'Re-Authentifizierungs-Ticket ist abgelaufen oder ungültig. Bitte erneut bestätigen.',
      code: 'REAUTH_EXPIRED',
    });
  }
}
