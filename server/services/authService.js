/**
 * server/services/authService.js
 * Business logic layer for User Authentication, 2FA, Registration, Password Management & Sessions.
 */

import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { userRepository, familyRepository } from '../repositories/index.js';
import { getDataEncryptionKey } from '../security/keys.js';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../middleware/auth.js';
import { sendPasswordResetEmail } from '../utils/mailer.js';
import { createSession } from './sessionService.js';
import { logSecurityEvent, sqlite } from '../utils/db.js';

const COMMON_WEAK_PASSWORDS = new Set([
  'password123',
  '1234567890',
  '123456789012',
  'babycharts123',
  'admin123456',
  'passwort1234',
  'qwertz123456',
]);

export function get2FAEncryptionKey() {
  return getDataEncryptionKey();
}

export function encryptTwoFactorSecret(plainSecret) {
  if (!plainSecret) return null;
  const key = get2FAEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainSecret, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptTwoFactorSecret(encryptedSecret) {
  if (!encryptedSecret) return null;
  if (!encryptedSecret.includes(':')) {
    return encryptedSecret; // Legacy fallback
  }
  try {
    const [ivHex, tagHex, dataHex] = encryptedSecret.split(':');
    const key = get2FAEncryptionKey();
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

export function generateRecoveryCodes(count = 8) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4)}`);
  }
  return codes;
}

export function hashRecoveryCode(code, userId) {
  if (!code || typeof code !== 'string') return '';
  const normalized = code.trim().toUpperCase();
  const salt = getDataEncryptionKey();
  return crypto.createHmac('sha256', salt).update(`${userId}:${normalized}`).digest('hex');
}

export function validatePasswordPolicy(password) {
  if (typeof password !== 'string') {
    return { valid: false, error: 'Passwort muss eine Zeichenkette sein.' };
  }
  const trimmed = password.trim();
  if (trimmed.length < 10) {
    return {
      valid: false,
      error: 'Passwort muss mindestens 10 Zeichen lang sein (eine Passphrase wird empfohlen).',
    };
  }
  if (password.length > 128) {
    return {
      valid: false,
      error: 'Passwort darf maximal 128 Zeichen lang sein.',
    };
  }
  if (COMMON_WEAK_PASSWORDS.has(trimmed.toLowerCase())) {
    return {
      valid: false,
      error: 'Dieses Passwort ist zu einfach und leicht zu erraten.',
    };
  }
  return { valid: true };
}

export function createToken(user, sessionId = null) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name || user.username,
      tokenVersion: user.tokenVersion || 0,
      sessionId: sessionId || undefined,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
    }
  );
}

export function formatUserPayload(user) {
  const isDev = Boolean(
    user.isDev ||
    user.role === 'superadmin' ||
    (process.env.DEV_EMAIL && user.email === process.env.DEV_EMAIL.toLowerCase())
  );

  return {
    id: user.id,
    name: user.name || user.username,
    email: user.email,
    avatar: user.avatar || null,
    language: user.language || 'de',
    twoFactorEnabled: Boolean(user.twoFactorEnabled || user.twoFactorSecret),
    isDev,
    role: user.role || (isDev ? 'superadmin' : 'user'),
  };
}

export function getOrGenerateSetupToken(_db = {}) {
  const envToken = process.env.INITIAL_ADMIN_TOKEN;
  if (typeof envToken === 'string' && envToken.trim()) {
    return envToken.trim();
  }

  const row = sqlite.prepare("SELECT value FROM settings WHERE key = 'setup_token'").get();
  if (row?.value) {
    try {
      return JSON.parse(row.value);
    } catch {
      return row.value;
    }
  }

  const generatedToken = crypto.randomBytes(16).toString('hex');
  sqlite
    .prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    .run('setup_token', JSON.stringify(generatedToken));
  return generatedToken;
}

export function isFirstRunSetupRequired() {
  const count = userRepository.count();
  return count === 0;
}

function validateFirstUserSetup({ setupToken, isTestEnv }) {
  const requiredSetupToken = getOrGenerateSetupToken();
  const providedToken = typeof setupToken === 'string' ? setupToken.trim() : '';
  const allowTestBypass = isTestEnv && !process.env.INITIAL_ADMIN_TOKEN && !providedToken;
  if (!allowTestBypass && (!providedToken || providedToken !== requiredSetupToken)) {
    return {
      valid: false,
      status: 403,
      error: 'Für die Ersteinrichtung des Administrators ist ein gültiger Setup-Code erforderlich.',
    };
  }
  return { valid: true };
}

function validatePublicRegistrationPolicy() {
  const row = sqlite
    .prepare("SELECT value FROM settings WHERE key = 'allow_public_registration'")
    .get();
  let allowPublic = true;
  if (row?.value) {
    try {
      allowPublic = JSON.parse(row.value);
    } catch {
      allowPublic = row.value !== 'false';
    }
  }
  if (allowPublic === false) {
    return {
      valid: false,
      status: 403,
      error:
        'Die öffentliche Registrierung ist deaktiviert. Bitte verwenden Sie einen Einladungscode.',
    };
  }
  return { valid: true };
}

function validateRegistrationPreconditions({ isFirstUser, setupToken, inviteCode, isTestEnv }) {
  if (isFirstUser) {
    return validateFirstUserSetup({ setupToken, isTestEnv });
  }

  if (!inviteCode && !isTestEnv) {
    return validatePublicRegistrationPolicy();
  }

  return { valid: true };
}

function handleRegistrationFamily({
  inviteCode,
  rawEmail,
  newUser,
  requestedFamilyName,
  cleanUsername,
}) {
  let targetFamily = null;
  if (inviteCode) {
    const normalizedCode = inviteCode.trim().toUpperCase();
    const invite = familyRepository.getInviteByCode(normalizedCode);
    if (invite) {
      if (invite.email && invite.email.toLowerCase() !== rawEmail.toLowerCase()) {
        return {
          error: 'Dieser Einladungscode ist für eine andere E-Mail-Adresse bestimmt.',
          status: 403,
        };
      }
      targetFamily = familyRepository.findById(invite.familyId);
      if (targetFamily) {
        familyRepository.addMember(targetFamily.id, newUser.id, invite.role || 'editor');
        familyRepository.deleteInvite(invite.code);
        familyRepository.recordUsedInvite({
          id: `used-${Date.now()}`,
          code: normalizedCode,
          familyId: targetFamily.id,
          usedBy: newUser.id,
        });
      }
    }
  }

  if (!targetFamily) {
    const newFamilyId = `fam-${Date.now()}`;
    const cleanFamilyName = requestedFamilyName?.trim() || `Familie ${cleanUsername}`;

    targetFamily = familyRepository.create(
      { id: newFamilyId, name: cleanFamilyName },
      newUser.id,
      'owner'
    );
  }

  return { targetFamily };
}

function consumeRecoveryCode(user, candidates, ip, userAgent) {
  for (const candidate of candidates) {
    const hashedAttempt = hashRecoveryCode(candidate, user.id);
    const codeIndex = user.recoveryCodes.findIndex((c) => c === hashedAttempt || c === candidate);
    if (codeIndex !== -1) {
      const updatedCodes = [...user.recoveryCodes];
      updatedCodes.splice(codeIndex, 1);
      userRepository.updateTwoFactor(user.id, {
        secret: user.twoFactorSecret,
        recoveryCodes: updatedCodes,
      });
      logSecurityEvent({
        event: '2FA_RECOVERY_CODE_USED',
        userId: user.id,
        email: user.email,
        ip,
        userAgent,
        status: 'success',
        details: { remainingCodes: updatedCodes.length },
      });
      return true;
    }
  }
  return false;
}

function verifyUserTwoFactor({ user, code, recoveryCode, ip, userAgent }) {
  const decryptedSecret = decryptTwoFactorSecret(user.twoFactorSecret);
  const providedTotp = typeof code === 'string' ? code.trim() : null;
  const providedRecovery =
    typeof recoveryCode === 'string' ? recoveryCode.trim().toUpperCase() : null;

  if (!providedTotp && !providedRecovery) {
    return {
      status: 200,
      requires2FA: true,
      message: 'Zwei-Faktor-Authentifizierung erforderlich.',
    };
  }

  let is2faValid = false;
  // lgtm[js/user-controlled-bypass] - Intentional: TOTP token must come from the user to be verified
  if (providedTotp && decryptedSecret) {
    is2faValid = speakeasy.totp.verify({
      secret: decryptedSecret,
      encoding: 'base32',
      token: providedTotp,
      window: 2,
    });
  }

  // Check recovery codes — try both dedicated recoveryCode and totpCode fields
  // (backwards compatible: older clients may send recovery codes via totpCode)
  if (!is2faValid && Array.isArray(user.recoveryCodes)) {
    const candidates = [
      providedRecovery,
      providedTotp ? providedTotp.trim().toUpperCase() : null,
    ].filter(Boolean);
    is2faValid = consumeRecoveryCode(user, candidates, ip, userAgent);
  }

  if (!is2faValid) {
    logSecurityEvent({
      event: '2FA_VERIFICATION_FAILURE',
      userId: user.id,
      email: user.email,
      ip,
      userAgent,
      status: 'failure',
    });
    return {
      status: 401,
      error: 'Ungültiger 2FA-Code oder Wiederherstellungscode.',
    };
  }

  return { valid: true };
}

export const authService = {
  // Expose helpers
  encryptTwoFactorSecret,
  decryptTwoFactorSecret,
  generateRecoveryCodes,
  hashRecoveryCode,
  validatePasswordPolicy,
  createToken,
  formatUserPayload,
  getOrGenerateSetupToken,
  isFirstRunSetupRequired,

  async register({
    username,
    name,
    email,
    password,
    requestedFamilyName,
    familyName,
    inviteCode,
    setupToken,
    ip,
    userAgent,
  }) {
    const rawEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const rawPassword = typeof password === 'string' ? password : '';
    const cleanUsername =
      typeof (name || username) === 'string' && (name || username).trim()
        ? (name || username).trim()
        : rawEmail.split('@')[0];

    const policyCheck = validatePasswordPolicy(rawPassword);
    if (!policyCheck.valid) {
      return { success: false, status: 400, error: policyCheck.error };
    }

    const isFirstUser = userRepository.count() === 0;
    const isTestEnv = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);

    const precondition = validateRegistrationPreconditions({
      isFirstUser,
      setupToken,
      inviteCode,
      isTestEnv,
    });
    if (!precondition.valid) {
      return { success: false, status: precondition.status, error: precondition.error };
    }

    // Check email uniqueness
    const existing = userRepository.findByEmail(rawEmail);
    if (existing) {
      return {
        success: false,
        status: 400,
        error: 'Diese E-Mail-Adresse ist bereits registriert.',
      };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(rawPassword, 12);
    const userId = `usr-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const isDev = isFirstUser || rawEmail === process.env.DEV_EMAIL?.toLowerCase();
    const role = isFirstUser || isDev ? 'superadmin' : 'user';

    const newUser = userRepository.create({
      id: userId,
      name: cleanUsername,
      username: cleanUsername,
      email: rawEmail,
      password: hashedPassword,
      role,
      isDev,
    });

    if (isFirstUser) {
      sqlite.prepare("DELETE FROM settings WHERE key = 'setup_token'").run();
      logSecurityEvent({
        event: 'INITIAL_ADMIN_SETUP_COMPLETED',
        userId: newUser.id,
        email: newUser.email,
        ip,
        userAgent,
        status: 'success',
        details: { adminEmail: newUser.email },
      });
    }

    const familyResult = handleRegistrationFamily({
      inviteCode,
      rawEmail,
      newUser,
      requestedFamilyName: requestedFamilyName || familyName,
      cleanUsername,
    });
    if (familyResult.error) {
      return {
        success: false,
        status: familyResult.status || 400,
        error: familyResult.error,
      };
    }

    // Session & Token — re-fetch user so sessions array is fresh
    const freshUser = userRepository.findById(newUser.id);
    const sessionId = createSession(freshUser, userAgent, ip);
    const token = createToken(newUser, sessionId);

    logSecurityEvent({
      event: 'REGISTER_SUCCESS',
      userId: newUser.id,
      email: newUser.email,
      ip,
      userAgent,
      status: 'success',
    });

    return {
      success: true,
      token,
      user: formatUserPayload(newUser),
      family: familyResult.targetFamily,
    };
  },

  async login({ email, password, code, recoveryCode, ip, userAgent }) {
    const rawEmail = typeof email === 'string' ? email.trim() : '';
    const rawPassword = typeof password === 'string' ? password : '';

    const user = userRepository.findByEmail(rawEmail);
    if (!user) {
      logSecurityEvent({
        event: 'LOGIN_FAILURE',
        email: rawEmail,
        ip,
        userAgent,
        status: 'failure',
        details: { reason: 'User not found' },
      });
      return { success: false, status: 401, error: 'E-Mail oder Passwort ist nicht korrekt.' };
    }

    const isValidPassword = await bcrypt.compare(rawPassword, user.password);
    if (!isValidPassword) {
      logSecurityEvent({
        event: 'LOGIN_FAILURE',
        userId: user.id,
        email: user.email,
        ip,
        userAgent,
        status: 'failure',
        details: { reason: 'Invalid password' },
      });
      return { success: false, status: 401, error: 'E-Mail oder Passwort ist nicht korrekt.' };
    }

    // Check 2FA
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      const twoFactorResult = verifyUserTwoFactor({
        user,
        code,
        recoveryCode,
        ip,
        userAgent,
      });
      if (!twoFactorResult.valid) {
        return {
          success: false,
          status: twoFactorResult.status,
          ...(twoFactorResult.requires2FA
            ? { requires2FA: true, message: twoFactorResult.message }
            : { error: twoFactorResult.error }),
        };
      }
    }

    // Login successful: create session & token
    const sessionId = createSession(user, userAgent, ip);
    const token = createToken(user, sessionId);

    logSecurityEvent({
      event: 'LOGIN_SUCCESS',
      userId: user.id,
      email: user.email,
      ip,
      userAgent,
      status: 'success',
    });

    return {
      success: true,
      token,
      user: formatUserPayload(user),
    };
  },

  async changePassword({
    userId,
    currentPassword,
    newPassword,
    logoutAllDevices = true,
    ip,
    userAgent,
  }) {
    const user = userRepository.findById(userId);
    if (!user) {
      return { success: false, status: 404, error: 'Benutzer nicht gefunden.' };
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return { success: false, status: 400, error: 'Das aktuelle Passwort ist nicht korrekt.' };
    }

    const policy = validatePasswordPolicy(newPassword);
    if (!policy.valid) {
      return { success: false, status: 400, error: policy.error };
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    userRepository.updatePassword(userId, hashed, logoutAllDevices);

    logSecurityEvent({
      event: 'PASSWORD_CHANGED',
      userId: user.id,
      email: user.email,
      ip,
      userAgent,
      status: 'success',
    });

    // Return fresh user for a new token
    const updatedUser = userRepository.findById(userId);
    const newToken = createToken(updatedUser);

    return {
      success: true,
      token: newToken,
      user: formatUserPayload(updatedUser),
      message: logoutAllDevices
        ? 'Passwort erfolgreich geändert. Alle anderen Geräte wurden abgemeldet.'
        : 'Passwort erfolgreich geändert.',
    };
  },

  async requestPasswordReset({ email, ip, userAgent }) {
    const rawEmail = typeof email === 'string' ? email.trim() : '';
    const user = userRepository.findByEmail(rawEmail);

    // Generic success response to avoid leaking account existence
    const genericMsg =
      'Wenn ein Konto mit dieser E-Mail-Adresse existiert, wurde ein Reset-Code bereitgestellt.';

    if (!user) {
      return { success: true, message: genericMsg };
    }

    const plainToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(plainToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    userRepository.setResetPasswordToken(user.id, hashedToken, expiresAt);

    sendPasswordResetEmail(user.email, plainToken, user.name).catch((err) =>
      console.error('[Auth] Error sending reset email:', err)
    );

    logSecurityEvent({
      event: 'PASSWORD_RESET_REQUESTED',
      userId: user.id,
      email: user.email,
      ip,
      userAgent,
      status: 'success',
    });

    return {
      success: true,
      message: genericMsg,
      // Returned directly so self-hosted setups can display/copy the token if email is not configured
      resetToken: plainToken,
      expiresAt,
    };
  },

  async resetPassword({ token, newPassword, ip, userAgent }) {
    if (!token || typeof token !== 'string') {
      return { success: false, status: 400, error: 'Reset-Token ungültig oder bereits verwendet.' };
    }

    const policy = validatePasswordPolicy(newPassword);
    if (!policy.valid) {
      return { success: false, status: 400, error: policy.error };
    }

    const hashedToken = crypto.createHash('sha256').update(token.trim()).digest('hex');
    const user = userRepository.findByResetToken(hashedToken);

    if (!user?.resetPasswordExpires && !user?.passwordResetExpires) {
      return { success: false, status: 400, error: 'Reset-Token ungültig oder bereits verwendet.' };
    }

    const expiresAt = user.resetPasswordExpires || user.passwordResetExpires;
    if (new Date(expiresAt) < new Date()) {
      userRepository.clearResetPasswordToken(user.id);
      return {
        success: false,
        status: 400,
        error: 'Der Reset-Token ist abgelaufen. Bitte fordern Sie einen neuen an.',
      };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    userRepository.updatePassword(user.id, hashedPassword, true);
    userRepository.clearResetPasswordToken(user.id);
    userRepository.updateSessions(user.id, []);

    logSecurityEvent({
      event: 'PASSWORD_RESET_COMPLETED',
      userId: user.id,
      email: user.email,
      ip,
      userAgent,
      status: 'success',
    });

    return { success: true, message: 'Passwort erfolgreich zurückgesetzt.' };
  },

  async setupTwoFactor(userId) {
    const user = userRepository.findById(userId);
    if (!user) return { success: false, status: 404, error: 'Benutzer nicht gefunden.' };

    const issuer = 'BabyCharts';
    const accountLabel = user.name || user.email;
    const secret = speakeasy.generateSecret({
      name: `${issuer} (${accountLabel})`,
      issuer,
      length: 20,
    });

    const otpAuthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountLabel)}?secret=${secret.base32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
    const qrCodeUrl = await QRCode.toDataURL(otpAuthUrl);

    const tempExpires = Date.now() + 15 * 60 * 1000; // 15 min expiry

    // Save temporary secret (not yet enabled until verified)
    userRepository.update(userId, {
      tempTwoFactorSecret: secret.base32,
      tempTwoFactorExpires: tempExpires,
    });

    logSecurityEvent({
      event: '2FA_SETUP_INITIATED',
      userId,
      email: user.email,
      status: 'success',
    });

    return {
      success: true,
      secret: secret.base32,
      qrCode: qrCodeUrl,
      expiresAt: new Date(tempExpires).toISOString(),
    };
  },

  async verifyTwoFactor({ userId, token }) {
    const user = userRepository.findById(userId);
    if (!user?.tempTwoFactorSecret) {
      return { success: false, status: 400, error: 'Keine 2FA-Einrichtung aktiv.' };
    }

    // Check if temporary 2FA setup secret has expired
    if (user.tempTwoFactorExpires && Date.now() > user.tempTwoFactorExpires) {
      userRepository.update(userId, {
        tempTwoFactorSecret: null,
        tempTwoFactorExpires: null,
      });
      logSecurityEvent({
        event: '2FA_VERIFY_EXPIRED',
        userId,
        email: user.email,
        status: 'failed',
      });
      return {
        success: false,
        status: 400,
        error: 'Die 2FA-Einrichtung ist abgelaufen (Gültigkeit 15 Min). Bitte erneut starten.',
      };
    }

    const verified = speakeasy.totp.verify({
      secret: user.tempTwoFactorSecret,
      encoding: 'base32',
      token: String(token).trim(),
      window: 2,
    });

    if (!verified) {
      logSecurityEvent({ event: '2FA_VERIFY_FAILED', userId, email: user.email, status: 'failed' });
      return { success: false, status: 400, error: 'Ungültiger Code. Bitte prüfen Sie Ihre App.' };
    }

    // Encrypt secret permanently and generate recovery codes
    const encryptedSecret = encryptTwoFactorSecret(user.tempTwoFactorSecret);
    const rawRecoveryCodes = generateRecoveryCodes(8);
    const hashedRecoveryCodes = rawRecoveryCodes.map((c) => hashRecoveryCode(c, userId));

    userRepository.updateTwoFactor(userId, {
      secret: encryptedSecret,
      recoveryCodes: hashedRecoveryCodes,
    });
    userRepository.update(userId, {
      tempTwoFactorSecret: null,
      tempTwoFactorExpires: null,
    });

    logSecurityEvent({ event: '2FA_ENABLED', userId, email: user.email, status: 'success' });

    return {
      success: true,
      message: 'Zwei-Faktor-Authentifizierung erfolgreich aktiviert!',
      recoveryCodes: rawRecoveryCodes,
    };
  },

  async disableTwoFactor({ userId, password }) {
    const user = userRepository.findById(userId);
    if (!user) return { success: false, status: 404, error: 'Benutzer nicht gefunden.' };

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return { success: false, status: 400, error: 'Das Passwort ist nicht korrekt.' };
    }

    userRepository.updateTwoFactor(userId, {
      secret: null,
      recoveryCodes: [],
    });

    logSecurityEvent({ event: '2FA_DISABLED', userId, email: user.email, status: 'success' });

    return { success: true, message: 'Zwei-Faktor-Authentifizierung wurde deaktiviert.' };
  },

  updateProfile({ userId, name, avatar, language }) {
    const user = userRepository.findById(userId);
    if (!user) return { success: false, status: 404, error: 'Benutzer nicht gefunden.' };

    const updates = {};

    if (name !== undefined) {
      const cleanName = typeof name === 'string' ? name.trim() : '';
      if (!cleanName) {
        return { success: false, status: 400, error: 'Name darf nicht leer sein.' };
      }
      updates.name = cleanName;
    }

    if (avatar !== undefined) {
      updates.avatar = avatar; // base64 data URI or null
    }

    if (typeof language === 'string' && ['de', 'en', 'th'].includes(language.toLowerCase())) {
      updates.language = language.toLowerCase();
    }

    const updated = userRepository.update(userId, updates);
    return { success: true, user: formatUserPayload(updated) };
  },

  deleteAccount({ userId }) {
    const user = userRepository.findById(userId);
    if (!user) return { success: false, status: 404, error: 'Benutzer nicht gefunden.' };

    // Invariant: Do not allow deletion if user is the sole remaining superadmin
    if (user.role === 'superadmin') {
      const superadminCount = userRepository.countByRole('superadmin');
      if (superadminCount <= 1) {
        return {
          success: false,
          status: 400,
          error:
            'Das Konto kann nicht gelöscht werden, da Sie der einzige verbleibende Administrator sind.',
        };
      }
    }

    userRepository.delete(userId);
    return { success: true, message: 'Konto erfolgreich gelöscht.' };
  },
};
