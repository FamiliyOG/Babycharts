/**
 * server/routes/auth.js
 * User Registration, Login and Profile endpoints
 */

import crypto from 'node:crypto';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import rateLimit from 'express-rate-limit';
import { readDb, writeDb, logSecurityEvent } from '../utils/db.js';
import { requireAuth, JWT_SECRET, JWT_EXPIRES_IN, getUserFamilyRole } from '../middleware/auth.js';
import { sendPasswordResetEmail } from '../utils/mailer.js';

const router = express.Router();

/**
 * Encrypts a 2FA TOTP secret using AES-256-GCM (Issue BC-032)
 */
export function encryptTwoFactorSecret(plainSecret) {
  if (!plainSecret) return null;
  const key = crypto.createHash('sha256').update(JWT_SECRET).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainSecret, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts an AES-256-GCM encrypted 2FA TOTP secret (or returns plaintext if legacy)
 */
export function decryptTwoFactorSecret(encryptedSecret) {
  if (!encryptedSecret) return null;
  if (!encryptedSecret.includes(':')) {
    return encryptedSecret; // Legacy fallback
  }
  try {
    const [ivHex, tagHex, dataHex] = encryptedSecret.split(':');
    const key = crypto.createHash('sha256').update(JWT_SECRET).digest();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch (err) {
    console.error('[Auth] Decrypt 2FA secret error:', err.message);
    return null;
  }
}

/**
 * Generates 8 random 8-character alphanumeric 2FA recovery codes (Issue BC-031)
 */
export function generateRecoveryCodes(count = 8) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4)}`);
  }
  return codes;
}

// ── Rate Limiters to prevent Brute-Force & Credential Stuffing ───────────────
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max 10 failed/successful attempts per IP in 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: 'Zu viele Anmeldeversuche. Bitte warten Sie 15 Minuten.' },
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // max 5 account creations per IP per hour
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    error: 'Zu viele Registrierungen von dieser IP. Bitte versuchen Sie es später erneut.',
  },
});

export const twoFactorLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // max 10 2FA verify attempts per 10 mins
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: 'Zu viele 2FA-Versuche. Bitte warten Sie einige Minuten.' },
});

export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // max 5 password reset requests per IP per hour
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: 'Zu viele Passwort-Anfragen. Bitte warten Sie eine Stunde.' },
});

/**
 * Validates password strength:
 * - Minimum 8 characters
 * - At least 1 lowercase letter
 * - At least 1 uppercase letter
 * - At least 1 digit
 */
export function validatePasswordPolicy(password) {
  if (typeof password !== 'string') {
    return { valid: false, error: 'Passwort muss eine Zeichenkette sein.' };
  }
  if (password.length < 8) {
    return { valid: false, error: 'Passwort muss mindestens 8 Zeichen lang sein.' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Passwort muss mindestens einen Kleinbuchstaben enthalten.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Passwort muss mindestens einen Großbuchstaben enthalten.' };
  }
  if (!/\d/.test(password)) {
    return { valid: false, error: 'Passwort muss mindestens eine Zahl enthalten.' };
  }
  return { valid: true };
}

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      tokenVersion: user.tokenVersion || 0,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
    }
  );
}

function formatUserPayload(user) {
  const isDev = Boolean(
    user.isDev ||
    user.role === 'superadmin' ||
    (process.env.DEV_EMAIL && user.email?.toLowerCase() === process.env.DEV_EMAIL.toLowerCase())
  );
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar || null,
    language: user.language || 'de',
    twoFactorEnabled: Boolean(user.twoFactorSecret),
    isDev,
    role: user.role || (isDev ? 'superadmin' : 'user'),
  };
}

function handleInviteJoin(db, inviteCode, userId) {
  if (typeof inviteCode !== 'string' || !inviteCode.trim()) return null;
  const normalizedCode = inviteCode.trim().toUpperCase();
  const invite = db.invites.find((inv) => inv.code === normalizedCode);
  if (!invite) return null;

  const targetFamily = db.families.find((f) => f.id === invite.familyId);
  if (!targetFamily) return null;

  targetFamily.members = targetFamily.members || [];
  if (!targetFamily.members.some((m) => m.userId === userId)) {
    targetFamily.members.push({
      userId,
      role: invite.role || 'editor',
      joinedAt: new Date().toISOString(),
    });
  }

  db.invites = db.invites.filter((inv) => inv.code !== normalizedCode);
  db.usedInvites = db.usedInvites || [];
  db.usedInvites.push({
    code: normalizedCode,
    familyId: targetFamily.id,
    usedBy: userId,
    usedAt: new Date().toISOString(),
  });

  return targetFamily;
}

function createInitialFamily(db, userId, userName, requestedFamilyName) {
  const newFamilyId = `fam-${Date.now()}`;
  const cleanUserName = typeof userName === 'string' ? userName.trim() : 'Familie';
  const cleanFamilyName =
    typeof requestedFamilyName === 'string' && requestedFamilyName.trim()
      ? requestedFamilyName.trim()
      : `Familie ${cleanUserName}`;

  const newFamily = {
    id: newFamilyId,
    name: cleanFamilyName,
    ownerId: userId,
    members: [{ userId, role: 'admin', joinedAt: new Date().toISOString() }],
    createdAt: new Date().toISOString(),
  };

  db.families.push(newFamily);

  db.profiles = db.profiles.map((p) => {
    if (!p.familyId || p.familyId === 'fam-default') {
      return { ...p, familyId: newFamilyId };
    }
    return p;
  });

  return newFamily;
}

/**
 * POST /api/auth/register
 * Registers a new user and automatically creates their first family (e.g. "Familie <Name>")
 */
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const rawEmail = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    const rawPassword = typeof req.body?.password === 'string' ? req.body.password : '';
    const rawName = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const { familyName, inviteCode } = req.body || {};

    if (!rawEmail || !rawPassword || !rawName) {
      return res.status(400).json({ error: 'Name, E-Mail und Passwort sind erforderlich.' });
    }

    const policyCheck = validatePasswordPolicy(rawPassword);
    if (!policyCheck.valid) {
      return res.status(400).json({ error: policyCheck.error });
    }

    const normalizedEmail = rawEmail.toLowerCase();
    const db = readDb();

    if (db.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      return res.status(400).json({ error: 'Diese E-Mail-Adresse ist bereits registriert.' });
    }

    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    const userId = `user-${Date.now()}`;

    const isFirstUser = db.users.length === 0;
    const isDev =
      isFirstUser ||
      (process.env.DEV_EMAIL && normalizedEmail === process.env.DEV_EMAIL.toLowerCase());

    const newUser = {
      id: userId,
      name: rawName,
      email: normalizedEmail,
      password: hashedPassword,
      isDev: isDev,
      role: isDev ? 'superadmin' : 'user',
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);

    const activeFamily =
      handleInviteJoin(db, inviteCode, userId) ||
      createInitialFamily(db, userId, rawName, familyName);

    writeDb(db);

    const token = createToken(newUser);
    const userRole = getUserFamilyRole(activeFamily, userId);

    return res.status(201).json({
      token,
      user: formatUserPayload(newUser),
      family: {
        id: activeFamily.id,
        name: activeFamily.name,
        role: userRole,
        isOwner: activeFamily.ownerId === userId,
      },
    });
  } catch (err) {
    console.error('[Auth] Register error:', err);
    return res.status(500).json({ error: 'Fehler bei der Registrierung.' });
  }
});

/**
 * Helper to verify 2FA TOTP or recovery codes for login
 */
function verifyUserTwoFactor(user, rawTotp, db) {
  const decryptedSecret = decryptTwoFactorSecret(user.twoFactorSecret);
  let verified = false;

  if (decryptedSecret) {
    verified = speakeasy.totp.verify({
      secret: decryptedSecret,
      encoding: 'base32',
      token: rawTotp,
      window: 2,
    });
  }

  // Check recovery codes fallback (Issue BC-031)
  if (!verified && user.recoveryCodes?.length > 0) {
    const normalizedInput = rawTotp.toUpperCase();
    const codeIndex = user.recoveryCodes.findIndex((c) => c.toUpperCase() === normalizedInput);
    if (codeIndex !== -1) {
      verified = true;
      user.recoveryCodes.splice(codeIndex, 1);
      writeDb(db);
      const cleanEmail = String(user.email).replace(/[^a-zA-Z0-9_@.-]/g, '_');
      console.log(
        `[2FA RECOVERY ${new Date().toISOString()}] Recovery code consumed for user: ${cleanEmail} (${user.recoveryCodes.length} remaining)`
      );
    }
  }

  return verified;
}

/**
 * Helper to ensure a user has an active family upon login
 */
function getOrCreateActiveFamily(user, db) {
  const userFamilies = db.families.filter(
    (f) => f.ownerId === user.id || f.members?.some((m) => m.userId === user.id)
  );

  let activeFamily = userFamilies[0] || null;

  if (!activeFamily) {
    const newFamily = {
      id: `fam-${Date.now()}`,
      name: `Familie ${user.name}`,
      ownerId: user.id,
      members: [{ userId: user.id, role: 'admin', joinedAt: new Date().toISOString() }],
      createdAt: new Date().toISOString(),
    };
    db.families.push(newFamily);
    writeDb(db);
    activeFamily = newFamily;
    userFamilies.push(newFamily);
  }

  return { activeFamily, userFamilies };
}

/**
 * Helper to format family summary for user payload
 */
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

/**
 * POST /api/auth/login
 * Authenticates user and returns JWT + user families
 */
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const rawEmail = req.body?.email;
    const rawPassword = req.body?.password;

    if (typeof rawEmail !== 'string' || typeof rawPassword !== 'string') {
      return res.status(400).json({ error: 'E-Mail und Passwort sind erforderlich.' });
    }

    const email = rawEmail.trim().toLowerCase();
    const password = rawPassword;

    if (email.length === 0 || password.length === 0) {
      return res.status(400).json({ error: 'E-Mail und Passwort sind erforderlich.' });
    }

    const db = readDb();
    const user = db.users.find((u) => u.email.toLowerCase() === email);

    if (!user) {
      return res.status(401).json({ error: 'E-Mail oder Passwort ist nicht korrekt.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'E-Mail oder Passwort ist nicht korrekt.' });
    }

    // If 2FA is active for this account, verify 2FA code before issuing token
    if (user.twoFactorSecret) {
      const totpInput =
        typeof req.body?.totpCode === 'string' ? req.body.totpCode.replace(/\s+/g, '').trim() : '';
      if (totpInput.length === 0) {
        return res.status(200).json({
          requires2FA: true,
          message: 'Bitte geben Sie Ihren 6-stelligen Authenticator-Code oder Recovery-Code ein.',
        });
      }

      const is2faValid = verifyUserTwoFactor(user, totpInput, db);
      if (!is2faValid) {
        const cleanEmail = String(user.email).replace(/[^a-zA-Z0-9_@.-]/g, '_');
        console.warn(
          `[2FA LOGIN ${new Date().toISOString()}] 2FA login verification failed for user: ${cleanEmail}`
        );
        return res
          .status(400)
          .json({ error: 'Ungültiger 2FA-Code oder Recovery-Code. Bitte erneut versuchen.' });
      }
    }

    const { activeFamily, userFamilies } = getOrCreateActiveFamily(user, db);
    const token = createToken(user);

    return res.json({
      token,
      user: formatUserPayload(user),
      family: formatFamilySummary(activeFamily, user.id),
      families: userFamilies.map((f) => formatFamilySummary(f, user.id)),
    });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    return res.status(500).json({ error: 'Fehler bei der Anmeldung.' });
  }
});

/**
 * GET /api/auth/me
 * Returns current user information and active family
 */
router.get('/me', requireAuth, (req, res) => {
  const db = readDb();
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
  }

  const userFamilies = db.families.filter(
    (f) => f.ownerId === user.id || f.members?.some((m) => m.userId === user.id)
  );

  const familyIdQuery = req.query.familyId;
  const activeFamily = userFamilies.find((f) => f.id === familyIdQuery) || userFamilies[0] || null;

  return res.json({
    user: formatUserPayload(user),
    family: formatFamilySummary(activeFamily, user.id),
    families: userFamilies.map((f) => formatFamilySummary(f, user.id)),
  });
});

/**
 * PUT /api/auth/me
 * Updates current user profile (name, avatar, language - BC-054)
 */
router.put('/me', requireAuth, (req, res) => {
  const rawName = typeof req.body?.name === 'string' ? req.body.name.trim() : null;
  const { avatar, language } = req.body || {};
  const db = readDb();
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
  }

  if (req.body?.name !== undefined) {
    if (!rawName) {
      return res.status(400).json({ error: 'Name darf nicht leer sein.' });
    }
    user.name = rawName;
  }

  if (avatar !== undefined) {
    user.avatar = avatar; // base64 data URI or null
  }

  if (typeof language === 'string' && ['de', 'en', 'th'].includes(language.toLowerCase())) {
    user.language = language.toLowerCase();
  }

  user.updatedAt = new Date().toISOString();
  writeDb(db);

  return res.json({
    message: 'Profil erfolgreich aktualisiert.',
    user: formatUserPayload(user),
  });
});

/**
 * POST /api/auth/2fa/setup
 * Generates temporary TOTP secret and QR code for user
 */
router.post('/2fa/setup', requireAuth, async (req, res) => {
  try {
    const db = readDb();
    const user = db.users.find((u) => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
    }

    const issuer = 'BabyCharts';
    const accountLabel = user.name || user.email;
    const secret = speakeasy.generateSecret({
      name: `${issuer} (${accountLabel})`,
      issuer,
      length: 20,
    });

    // Formatted strictly as: otpauth://totp/BabyCharts:Sebastian%20Haupt?secret=...&issuer=BabyCharts
    const otpAuthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountLabel)}?secret=${secret.base32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);

    // Save temporary secret to user with a 15-minute expiration (Issue BC-033)
    user.tempTwoFactorSecret = secret.base32;
    user.tempTwoFactorExpires = Date.now() + 15 * 60 * 1000; // 15 min expiration
    writeDb(db);

    logSecurityEvent({
      event: '2FA_SETUP_INITIATED',
      userId: user.id,
      email: user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success',
    });

    return res.json({
      secret: secret.base32,
      qrCode: qrCodeDataUrl,
      expiresAt: new Date(user.tempTwoFactorExpires).toISOString(),
    });
  } catch (err) {
    console.error(
      '[2FA SETUP ERROR %s] Error generating 2FA secret:',
      new Date().toISOString(),
      err
    );
    return res.status(500).json({ error: 'Fehler beim Generieren des 2FA-Codes.' });
  }
});

/**
 * POST /api/auth/2fa/verify
 * Verifies code and confirms permanent 2FA activation
 */
router.post('/2fa/verify', requireAuth, twoFactorLimiter, (req, res) => {
  try {
    const rawCode = req.body?.totpCode;
    if (typeof rawCode !== 'string' || rawCode.trim().length === 0) {
      return res.status(400).json({ error: 'Code ist erforderlich.' });
    }
    const totpCode = rawCode.replace(/\s+/g, '').trim();

    const db = readDb();
    const user = db.users.find((u) => u.id === req.user.id);
    if (!user?.tempTwoFactorSecret) {
      return res.status(400).json({ error: 'Keine 2FA-Einrichtung aktiv.' });
    }

    // Check if temporary 2FA setup secret has expired (Issue BC-033)
    if (user.tempTwoFactorExpires && Date.now() > user.tempTwoFactorExpires) {
      delete user.tempTwoFactorSecret;
      delete user.tempTwoFactorExpires;
      writeDb(db);

      logSecurityEvent({
        event: '2FA_VERIFY_EXPIRED',
        userId: user.id,
        email: user.email,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        status: 'failed',
      });

      return res.status(400).json({
        error: 'Die 2FA-Einrichtung ist abgelaufen (Gültigkeit 15 Min). Bitte erneut starten.',
      });
    }

    // Verify token with a wider time drift window (window: 2 allows ±60s clock drift between phone and server)
    const verified = speakeasy.totp.verify({
      secret: user.tempTwoFactorSecret,
      encoding: 'base32',
      token: totpCode,
      window: 2,
    });

    if (!verified) {
      logSecurityEvent({
        event: '2FA_VERIFY_FAILED',
        userId: user.id,
        email: user.email,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        status: 'failed',
      });
      return res.status(400).json({ error: 'Ungültiger Code. Bitte prüfen Sie Ihre App.' });
    }

    // Encrypt secret with AES-256-GCM before saving permanently to database (Issue BC-032)
    user.twoFactorSecret = encryptTwoFactorSecret(user.tempTwoFactorSecret);
    delete user.tempTwoFactorSecret;
    delete user.tempTwoFactorExpires;

    // Generate 8 2FA recovery codes (Issue BC-031)
    const recoveryCodes = generateRecoveryCodes(8);
    user.recoveryCodes = recoveryCodes;

    writeDb(db);

    logSecurityEvent({
      event: '2FA_ENABLED',
      userId: user.id,
      email: user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success',
    });

    return res.json({
      message: 'Zwei-Faktor-Authentifizierung erfolgreich aktiviert!',
      user: formatUserPayload(user),
      recoveryCodes, // Provided to user to save/print
    });
  } catch (err) {
    console.error('[2FA VERIFY ERROR %s] Verification exception:', new Date().toISOString(), err);
    return res.status(500).json({ error: 'Fehler bei der 2FA-Verifikation.' });
  }
});

/**
 * POST /api/auth/2fa/disable
 * Disables 2FA after password confirmation
 */
router.post('/2fa/disable', requireAuth, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Passwort erforderlich zur Deaktivierung.' });
    }

    const db = readDb();
    const user = db.users.find((u) => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Falsches Passwort.' });
    }

    delete user.twoFactorSecret;
    delete user.tempTwoFactorSecret;
    delete user.recoveryCodes;
    writeDb(db);

    return res.json({
      message: 'Zwei-Faktor-Authentifizierung deaktiviert.',
      user: formatUserPayload(user),
    });
  } catch (err) {
    console.error('[Auth] 2FA Disable error:', err);
    return res.status(500).json({ error: 'Fehler beim Deaktivieren von 2FA.' });
  }
});

/**
 * POST /api/auth/forgot-password
 * Initiates password reset flow by creating a secure 1-hour reset token.
 * Stores only a SHA-256 hash in the database so that database leaks cannot reveal valid reset tokens.
 */
router.post('/forgot-password', passwordResetLimiter, async (req, res) => {
  try {
    const rawEmail = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    if (!rawEmail) {
      return res.status(400).json({ error: 'E-Mail-Adresse ist erforderlich.' });
    }

    const normalizedEmail = rawEmail.toLowerCase();
    const db = readDb();
    const user = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);

    // Generic response prevents account enumeration attacks
    if (!user) {
      return res.json({
        message:
          'Wenn ein Konto mit dieser E-Mail-Adresse existiert, wurde ein Reset-Code bereitgestellt.',
      });
    }

    // Cryptographically secure random token (32 bytes = 64 hex chars)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresInMs = 60 * 60 * 1000; // 1 hour expiration
    const expiresAt = Date.now() + expiresInMs;

    user.passwordResetTokenHash = tokenHash;
    user.passwordResetExpires = expiresAt;
    delete user.passwordResetToken; // Clean up any old plaintext field
    writeDb(db);

    console.log(
      `\x1b[36m[PASSWORD RESET ${new Date().toISOString()}]\x1b[0m Secure reset token generated for user: ${user.email} (expires in 1h)`
    );

    // Send email via SMTP in background (fire-and-forget / non-blocking)
    sendPasswordResetEmail(user.email, rawToken, user.name).catch((err) =>
      console.error('[Auth] Error sending reset email:', err)
    );

    return res.json({
      message:
        'Wenn ein Konto mit dieser E-Mail-Adresse existiert, wurde ein Reset-Code bereitgestellt.',
      resetToken: rawToken, // Returned directly for client/self-hosted notification
      expiresAt: new Date(expiresAt).toISOString(),
    });
  } catch (err) {
    console.error('[Auth] Forgot password error:', err);
    return res.status(500).json({ error: 'Fehler beim Zurücksetzen des Passworts.' });
  }
});

/**
 * POST /api/auth/reset-password
 * Resets password using a valid raw reset token.
 * Verifies SHA-256 hash match, checks expiration timestamp, and enforces password policy.
 */
router.post('/reset-password', passwordResetLimiter, async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};
    if (!token || typeof token !== 'string' || !newPassword) {
      return res.status(400).json({ error: 'Token und neues Passwort sind erforderlich.' });
    }

    const policyCheck = validatePasswordPolicy(newPassword);
    if (!policyCheck.valid) {
      return res.status(400).json({ error: policyCheck.error });
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
    const db = readDb();
    const user = db.users.find((u) => u.passwordResetTokenHash === tokenHash);

    if (!user) {
      return res.status(400).json({ error: 'Reset-Token ungültig oder bereits verwendet.' });
    }

    // Check expiration timestamp (Issue BC-023)
    if (!user.passwordResetExpires || Date.now() > user.passwordResetExpires) {
      delete user.passwordResetTokenHash;
      delete user.passwordResetExpires;
      writeDb(db);
      return res
        .status(400)
        .json({ error: 'Der Reset-Token ist abgelaufen. Bitte fordern Sie einen neuen an.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate all prior sessions (Issue BC-028)
    delete user.passwordResetTokenHash;
    delete user.passwordResetExpires;
    delete user.passwordResetToken;
    writeDb(db);

    console.log(
      `\x1b[32m[PASSWORD RESET SUCCESS ${new Date().toISOString()}]\x1b[0m Password successfully reset for user: ${user.email} (all previous sessions revoked)`
    );

    return res.json({ message: 'Passwort erfolgreich geändert. Sie können sich nun anmelden.' });
  } catch (err) {
    console.error('[Auth] Reset password error:', err);
    return res.status(500).json({ error: 'Fehler beim Ändern des Passworts.' });
  }
});

/**
 * POST /api/auth/change-password
 * Allows authenticated user to update their password.
 * Optionally logs out all other devices / sessions by bumping tokenVersion (Issue BC-029).
 */
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword, logoutAllDevices = true } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Aktuelles und neues Passwort sind erforderlich.' });
    }

    const policyCheck = validatePasswordPolicy(newPassword);
    if (!policyCheck.valid) {
      return res.status(400).json({ error: policyCheck.error });
    }

    const db = readDb();
    const user = db.users.find((u) => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Benutzerkonto nicht gefunden.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Das aktuelle Passwort ist nicht korrekt.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    if (logoutAllDevices) {
      user.tokenVersion = (user.tokenVersion || 0) + 1;
    }

    writeDb(db);

    // Generate fresh token for the current session
    const newToken = createToken(user);

    return res.json({
      message: logoutAllDevices
        ? 'Passwort erfolgreich geändert. Alle anderen Geräte wurden abgemeldet.'
        : 'Passwort erfolgreich geändert.',
      token: newToken,
      user: formatUserPayload(user),
    });
  } catch (err) {
    console.error('[Auth] Change password error:', err);
    return res.status(500).json({ error: 'Fehler beim Ändern des Passworts.' });
  }
});

/**
 * PUT /api/auth/profile
 * Alias for PUT /api/auth/me (BC-054)
 */
router.put('/profile', requireAuth, (req, res, next) => {
  req.url = '/me';
  router.handle(req, res, next);
});

export default router;
