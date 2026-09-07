/**
 * server/routes/auth.js
 * User Registration, Login, Session, 2FA, Password and Account endpoints.
 * All business logic is delegated to authService and sessionService.
 */

import express from 'express';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import rateLimit from 'express-rate-limit';
import { logSecurityEvent, sqlite } from '../utils/db.js';
import { requireAuth, JWT_SECRET, getUserFamilyRole } from '../middleware/auth.js';
import { revokeSession, revokeAllOtherSessions } from '../services/sessionService.js';
import {
  authService,
  decryptTwoFactorSecret,
  isFirstRunSetupRequired,
  formatUserPayload,
} from '../services/authService.js';
import { userRepository, familyRepository } from '../repositories/index.js';

export {
  authService,
  decryptTwoFactorSecret,
  isFirstRunSetupRequired,
} from '../services/authService.js';
export {
  encryptTwoFactorSecret,
  generateRecoveryCodes,
  hashRecoveryCode,
  validatePasswordPolicy,
  getOrGenerateSetupToken,
} from '../services/authService.js';

const router = express.Router();

// ── Rate Limiters to prevent Brute-Force & Credential Stuffing ───────────────
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: 'Zu viele Anmeldeversuche. Bitte warten Sie 15 Minuten.' },
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    error: 'Zu viele Registrierungen von dieser IP. Bitte versuchen Sie es später erneut.',
  },
});

export const twoFactorLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: 'Zu viele 2FA-Versuche. Bitte warten Sie einige Minuten.' },
});

export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: 'Zu viele Passwort-Anfragen. Bitte warten Sie eine Stunde.' },
});

// ── Cookie helpers ─────────────────────────────────────────────────────────────

function setSessionCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('babycharts_session', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/',
  });
}

function clearSessionCookie(res) {
  res.clearCookie('babycharts_session', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });
}

// ── Family formatting helpers ──────────────────────────────────────────────────

function formatFamilySummary(family, userId) {
  if (!family) return null;
  return {
    id: family.id,
    name: family.name,
    avatar: family.avatar || null,
    role: getUserFamilyRole(family, userId),
    isOwner: family.ownerId === userId,
  };
}

// ── Middleware ─────────────────────────────────────────────────────────────────

const validateLoginPayload = (req, res, next) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'E-Mail und Passwort sind erforderlich.' });
  }
  const cleanEmail = email.trim().toLowerCase();
  if (cleanEmail.length === 0 || password.length === 0) {
    return res.status(400).json({ error: 'E-Mail und Passwort sind erforderlich.' });
  }
  req.authEmail = cleanEmail;
  req.authPassword = password;
  return next();
};

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /api/auth/setup-status
 * Public endpoint to check if first-run setup is required.
 */
router.get('/setup-status', (_req, res) => {
  const setupRequired = isFirstRunSetupRequired();
  return res.json({ setupRequired });
});

/**
 * POST /api/auth/register
 * Registers a new user and automatically creates/joins their first family.
 */
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const result = await authService.register({
      name: req.body?.name,
      username: req.body?.username,
      email: req.body?.email,
      password: req.body?.password,
      familyName: req.body?.familyName,
      requestedFamilyName: req.body?.requestedFamilyName,
      inviteCode: req.body?.inviteCode,
      setupToken: req.body?.setupToken,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    if (!result.success) {
      return res.status(result.status || 400).json({ error: result.error });
    }

    setSessionCookie(res, result.token);

    const userFamilies = familyRepository.findByUserId(result.user.id);
    const activeFamily = userFamilies[0] || null;

    return res.status(201).json({
      token: result.token,
      user: result.user,
      family: activeFamily ? formatFamilySummary(activeFamily, result.user.id) : null,
      families: userFamilies.map((f) => formatFamilySummary(f, result.user.id)),
    });
  } catch (err) {
    console.error('[Auth] Register error:', err);
    return res.status(500).json({ error: 'Fehler bei der Registrierung.' });
  }
});

/**
 * POST /api/auth/login
 * Authenticates user and returns JWT + user families.
 */
router.post('/login', loginLimiter, validateLoginPayload, async (req, res) => {
  try {
    const result = await authService.login({
      email: req.authEmail,
      password: req.authPassword,
      code: req.body?.totpCode,
      recoveryCode: req.body?.recoveryCode,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    if (!result.success) {
      if (result.requires2FA) {
        return res.status(result.status || 200).json({
          requires2FA: true,
          message: result.message,
        });
      }
      return res.status(result.status || 401).json({ error: result.error });
    }

    setSessionCookie(res, result.token);

    const userFamilies = familyRepository.findByUserId(result.user.id);
    const familyIdQuery = req.query.familyId;
    const activeFamily =
      userFamilies.find((f) => f.id === familyIdQuery) || userFamilies[0] || null;

    return res.json({
      token: result.token,
      user: result.user,
      family: activeFamily ? formatFamilySummary(activeFamily, result.user.id) : null,
      families: userFamilies.map((f) => formatFamilySummary(f, result.user.id)),
    });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    return res.status(500).json({ error: 'Fehler bei der Anmeldung.' });
  }
});

/**
 * POST /api/auth/logout
 * Clears HttpOnly session cookie and revokes the active session (Issue #262).
 */
router.post('/logout', (req, res) => {
  // Attempt to revoke the session from the cookie token
  const cookieHeader = req.headers.cookie;
  if (typeof cookieHeader === 'string') {
    const match = /(?:^|;\s*)(?:babycharts_token|babycharts_session)=([^;]+)/.exec(cookieHeader);
    // lgtm[js/user-controlled-bypass] - Intentional: we read the cookie token to revoke the session on logout
    if (match?.[1]) {
      try {
        const decoded = jwt.verify(decodeURIComponent(match[1]), JWT_SECRET);
        if (decoded?.id && decoded?.sessionId) {
          const user = userRepository.findById(decoded.id);
          if (user) {
            revokeSession(user, decoded.sessionId);
          }
        }
      } catch {
        // ignore invalid or expired tokens on logout
      }
    }
  }
  clearSessionCookie(res);
  return res.json({ ok: true, message: 'Erfolgreich abgemeldet.' });
});

/**
 * GET /api/auth/me
 * Returns current user information and active families.
 */
router.get('/me', requireAuth, (req, res) => {
  const user = userRepository.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
  }

  const userFamilies = familyRepository.findByUserId(user.id);
  const familyIdQuery = req.query.familyId;
  const activeFamily = userFamilies.find((f) => f.id === familyIdQuery) || userFamilies[0] || null;

  return res.json({
    user: formatUserPayload(user),
    family: activeFamily ? formatFamilySummary(activeFamily, user.id) : null,
    families: userFamilies.map((f) => formatFamilySummary(f, user.id)),
  });
});

/**
 * PUT /api/auth/me
 * Updates current user profile (name, avatar, language).
 */
router.put('/me', requireAuth, (req, res) => {
  const result = authService.updateProfile({
    userId: req.user.id,
    name: req.body?.name,
    avatar: req.body?.avatar,
    language: req.body?.language,
  });

  if (!result.success) {
    return res.status(result.status || 400).json({ error: result.error });
  }

  return res.json({ message: 'Profil erfolgreich aktualisiert.', user: result.user });
});

/**
 * GET /api/auth/sessions
 * Returns all active login sessions for the authenticated user (Issue #249).
 */
router.get('/sessions', requireAuth, (req, res) => {
  const user = userRepository.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
  }

  const sessions = (user.sessions || []).map((s) => ({
    id: s.id,
    device: s.device,
    ip: s.ip,
    createdAt: s.createdAt,
    lastActiveAt: s.lastActiveAt,
    isCurrent: s.id === req.user.sessionId,
  }));

  return res.json({ sessions });
});

/**
 * DELETE /api/auth/sessions/:sessionId
 * Revokes a specific remote session (Issue #249).
 */
router.delete('/sessions/:sessionId', requireAuth, (req, res) => {
  const { sessionId } = req.params;
  const user = userRepository.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
  }

  const removed = revokeSession(user, sessionId);
  return res.json({
    success: true,
    message: removed ? 'Sitzung erfolgreich beendet.' : 'Sitzung nicht gefunden.',
  });
});

/**
 * DELETE /api/auth/sessions
 * Revokes all other sessions except the current one (Issue #249).
 */
router.delete('/sessions', requireAuth, (req, res) => {
  const user = userRepository.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
  }

  revokeAllOtherSessions(user, req.user.sessionId);
  return res.json({
    success: true,
    message: 'Alle anderen Sitzungen wurden erfolgreich abgemeldet.',
  });
});

/**
 * POST /api/auth/2fa/setup
 * Generates temporary TOTP secret and QR code for user.
 */
router.post('/2fa/setup', requireAuth, async (req, res) => {
  try {
    const result = await authService.setupTwoFactor(req.user.id);
    if (!result.success) {
      return res.status(result.status || 400).json({ error: result.error });
    }
    return res.json({
      secret: result.secret,
      qrCode: result.qrCode,
      expiresAt: result.expiresAt,
    });
  } catch (err) {
    console.error('[Auth] 2FA Setup error:', err);
    return res.status(500).json({ error: 'Fehler beim Generieren des 2FA-Codes.' });
  }
});

/**
 * POST /api/auth/2fa/verify
 * Verifies code and confirms permanent 2FA activation.
 */
router.post('/2fa/verify', requireAuth, twoFactorLimiter, async (req, res) => {
  try {
    const code = req.body?.totpCode;
    // lgtm[js/user-controlled-bypass] - Intentional: code must be present to verify 2FA activation
    if (typeof code !== 'string' || code.trim().length === 0) {
      return res.status(400).json({ error: 'Code ist erforderlich.' });
    }

    const result = await authService.verifyTwoFactor({
      userId: req.user.id,
      token: code.replace(/\s+/g, '').trim(),
    });

    if (!result.success) {
      return res.status(result.status || 400).json({ error: result.error });
    }

    const user = userRepository.findById(req.user.id);
    return res.json({
      message: result.message,
      user: formatUserPayload(user),
      recoveryCodes: result.recoveryCodes,
    });
  } catch (err) {
    console.error('[Auth] 2FA Verify error:', err);
    return res.status(500).json({ error: 'Fehler bei der 2FA-Verifikation.' });
  }
});

/**
 * POST /api/auth/2fa/disable
 * Disables 2FA after password confirmation.
 */
router.post('/2fa/disable', requireAuth, async (req, res) => {
  try {
    const { password } = req.body || {};
    if (!password) {
      return res.status(400).json({ error: 'Passwort erforderlich zur Deaktivierung.' });
    }

    const result = await authService.disableTwoFactor({
      userId: req.user.id,
      password,
    });

    if (!result.success) {
      return res.status(result.status || 400).json({ error: result.error });
    }

    const user = userRepository.findById(req.user.id);
    return res.json({ message: result.message, user: formatUserPayload(user) });
  } catch (err) {
    console.error('[Auth] 2FA Disable error:', err);
    return res.status(500).json({ error: 'Fehler beim Deaktivieren von 2FA.' });
  }
});

/**
 * POST /api/auth/forgot-password
 * Initiates password reset flow.
 */
router.post('/forgot-password', passwordResetLimiter, async (req, res) => {
  try {
    const rawEmail = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    if (!rawEmail) {
      return res.status(400).json({ error: 'E-Mail-Adresse ist erforderlich.' });
    }

    const result = await authService.requestPasswordReset({
      email: rawEmail,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({
      message: result.message,
      ...(result.resetToken ? { resetToken: result.resetToken, expiresAt: result.expiresAt } : {}),
    });
  } catch (err) {
    console.error('[Auth] Forgot password error:', err);
    return res.status(500).json({ error: 'Fehler beim Zurücksetzen des Passworts.' });
  }
});

/**
 * POST /api/auth/reset-password
 * Resets password using a valid reset token.
 */
router.post('/reset-password', passwordResetLimiter, async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};
    if (!token || typeof token !== 'string' || !newPassword) {
      return res.status(400).json({ error: 'Token und neues Passwort sind erforderlich.' });
    }

    const result = await authService.resetPassword({
      token,
      newPassword,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    if (!result.success) {
      return res.status(result.status || 400).json({ error: result.error });
    }

    return res.json({ message: result.message });
  } catch (err) {
    console.error('[Auth] Reset password error:', err);
    return res.status(500).json({ error: 'Fehler beim Ändern des Passworts.' });
  }
});

/**
 * POST /api/auth/change-password
 * Allows authenticated user to update their password (Issue BC-029).
 */
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword, logoutAllDevices = true } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Aktuelles und neues Passwort sind erforderlich.' });
    }

    const result = await authService.changePassword({
      userId: req.user.id,
      currentPassword,
      newPassword,
      logoutAllDevices,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    if (!result.success) {
      return res.status(result.status || 400).json({ error: result.error });
    }

    return res.json({ message: result.message, token: result.token, user: result.user });
  } catch (err) {
    console.error('[Auth] Change password error:', err);
    return res.status(500).json({ error: 'Fehler beim Ändern des Passworts.' });
  }
});

/**
 * DELETE /api/auth/account
 * POST /api/auth/delete-account
 * Completely deletes the authenticated user's account (DSGVO / GDPR Art. 17 / BC-206).
 */
function assertNotLastSuperadmin(user) {
  if (user.role === 'superadmin' || user.isDev) {
    const count = userRepository.countByRole('superadmin');
    if (count <= 1) {
      return 'Der letzte Administrator/Superadmin der Instanz kann nicht gelöscht werden.';
    }
  }
  return null;
}

function assertNoOwnedFamilyWithMembers(user, ownedFamilies) {
  for (const fam of ownedFamilies) {
    const others = (fam.members || []).filter((m) => m.userId !== user.id);
    if (others.length > 0) {
      return `Sie sind Inhaber der Familie "${fam.name}" mit weiteren Mitgliedern. Bitte übertragen Sie zuerst die Inhaberschaft auf ein anderes Mitglied, bevor Sie Ihr Konto löschen.`;
    }
  }
  return null;
}

async function handleDeleteAccount(req, res) {
  try {
    const { password } = req.body || {};
    if (!password || typeof password !== 'string') {
      return res.status(400).json({
        error: 'Zur Bestätigung der Kontolöschung ist das aktuelle Passwort erforderlich.',
      });
    }

    const user = userRepository.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Benutzerkonto nicht gefunden.' });
    }

    const { default: bcrypt } = await import('bcryptjs');
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Das angegebene Passwort ist nicht korrekt.' });
    }

    const superadminError = assertNotLastSuperadmin(user);
    if (superadminError) {
      return res.status(400).json({ error: superadminError });
    }

    const ownedFamilies = familyRepository
      .findByUserId(user.id)
      .filter((f) => f.ownerId === user.id);

    const familyBlockError = assertNoOwnedFamilyWithMembers(user, ownedFamilies);
    if (familyBlockError) {
      return res.status(400).json({ error: familyBlockError });
    }

    // Delete solo-owned families (profiles cascade via SQLite FK)
    for (const fam of ownedFamilies) {
      const others = (fam.members || []).filter((m) => m.userId !== user.id);
      if (others.length === 0) familyRepository.delete(fam.id);
    }

    // Remove from other families' member lists
    for (const fam of familyRepository.findByUserId(user.id)) {
      if (fam.ownerId !== user.id) familyRepository.removeMember(fam.id, user.id);
    }

    userRepository.delete(user.id);
    clearSessionCookie(res);

    logSecurityEvent({
      event: 'ACCOUNT_DELETED',
      userId: user.id,
      email: user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success',
    });

    return res.json({
      ok: true,
      message: 'Ihr Benutzerkonto und alle zugehörigen Daten wurden erfolgreich gelöscht.',
    });
  } catch (err) {
    console.error('[Auth] Delete account error:', err);
    return res.status(500).json({ error: 'Fehler beim Löschen des Benutzerkontos.' });
  }
}

router.delete('/account', requireAuth, handleDeleteAccount);
router.post('/delete-account', requireAuth, handleDeleteAccount);

/**
 * GET /api/auth/export-my-data
 * Exports all personal data for the authenticated user (DSGVO / GDPR Art. 20 / BC-207).
 */
router.get('/export-my-data', requireAuth, (req, res) => {
  try {
    const user = userRepository.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Benutzerkonto nicht gefunden.' });
    }

    const userFamilies = familyRepository.findByUserId(user.id);
    const userFamilyIds = new Set(userFamilies.map((f) => f.id));

    const profiles =
      userFamilyIds.size > 0
        ? sqlite
            .prepare(
              `SELECT * FROM profiles WHERE familyId IN (${[...userFamilyIds].map(() => '?').join(',')}) ORDER BY createdAt ASC`
            )
            .all([...userFamilyIds])
        : [];

    const exportData = {
      exportVersion: '1.0',
      exportedAt: new Date().toISOString(),
      account: {
        id: user.id,
        name: user.name,
        email: user.email,
        language: user.language || 'de',
        role: user.role || 'user',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      families: userFamilies.map((f) => ({
        id: f.id,
        name: f.name,
        isOwner: f.ownerId === user.id,
        role: getUserFamilyRole(f, user.id),
        membersCount: (f.members || []).length,
        createdAt: f.createdAt,
      })),
      profiles: profiles.map((p) => ({
        id: p.id,
        name: p.name,
        birthDate: p.birthDate,
        gender: p.gender,
        measurements: p.measurements ? JSON.parse(p.measurements) : [],
        milestones: p.milestones ? JSON.parse(p.milestones) : [],
      })),
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="babycharts-data-export-${new Date().toISOString().slice(0, 10)}.json"`
    );
    return res.json(exportData);
  } catch (err) {
    console.error('[Auth] Export data error:', err);
    return res.status(500).json({ error: 'Fehler beim Exportieren Ihrer Daten.' });
  }
});

/**
 * POST /api/auth/reauth
 * Re-authenticates user with password and optional TOTP for critical actions (Issue #333).
 * Returns short-lived ticket valid for 5 minutes.
 */
router.post('/reauth', requireAuth, async (req, res) => {
  try {
    const { password, code } = req.body || {};
    // lgtm[js/user-controlled-bypass] - Intentional: password is required input for re-authentication
    if (!password) {
      return res.status(400).json({ error: 'Passwort erforderlich zur Re-Authentifizierung.' });
    }

    const user = userRepository.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
    }

    const { default: bcrypt } = await import('bcryptjs');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Ungültiges Passwort.' });
    }

    // If 2FA enabled, enforce TOTP code verification
    if (user.twoFactorSecret) {
      // lgtm[js/user-controlled-bypass] - Intentional: 2FA code is required when 2FA is enabled
      if (!code) {
        return res.status(400).json({
          requires2FA: true,
          error: '2FA-Code erforderlich zur Bestätigung kritischer Aktionen.',
        });
      }
      const plainSecret = decryptTwoFactorSecret(user.twoFactorSecret);
      const isTotpValid = speakeasy.totp.verify({
        secret: plainSecret,
        encoding: 'base32',
        token: String(code).trim(),
        window: 1,
      });
      if (!isTotpValid) {
        return res.status(401).json({ error: 'Ungültiger 2FA-Code.' });
      }
    }

    // Issue 5-minute re-auth ticket
    const reauthToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        scope: 'recent_reauth',
      },
      JWT_SECRET,
      { expiresIn: '5m' }
    );

    return res.json({
      ok: true,
      reauthToken,
      expiresInSeconds: 300,
      message: 'Re-Authentifizierung erfolgreich.',
    });
  } catch (err) {
    console.error('[Auth] Reauth error:', err);
    return res.status(500).json({ error: 'Fehler bei der Re-Authentifizierung.' });
  }
});

export default router;
