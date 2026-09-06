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
      name: user.username || user.name,
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
    name: user.username || user.name,
    email: user.email,
    avatar: user.avatar || null,
    language: user.language || 'de',
    twoFactorEnabled: Boolean(user.twoFactorEnabled || user.twoFactorSecret),
    isDev,
    role: user.role || (isDev ? 'superadmin' : 'user'),
  };
}

export function getOrGenerateSetupToken(db = {}) {
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
  if (db?.settings) {
    db.settings.setup_token = generatedToken;
  }
  return generatedToken;
}

export function isFirstRunSetupRequired(_db = {}) {
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
        familyRepository.deleteInvite(invite.id);
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
  if (providedTotp && decryptedSecret) {
    is2faValid = speakeasy.totp.verify({
      secret: decryptedSecret,
      encoding: 'base32',
      token: providedTotp,
      window: 2,
    });
  }

  // Check recovery codes
  if (!is2faValid && providedRecovery && Array.isArray(user.recoveryCodes)) {
    const hashedAttempt = hashRecoveryCode(providedRecovery, user.id);
    const codeIndex = user.recoveryCodes.findIndex(
      (c) => c === hashedAttempt || c === providedRecovery
    );
    if (codeIndex !== -1) {
      is2faValid = true;
      const updatedCodes = [...user.recoveryCodes];
      updatedCodes.splice(codeIndex, 1);
      userRepository.updateTwoFactor(user.id, {
        secret: user.twoFactorSecret,
        enabled: user.twoFactorEnabled,
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
    }
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
    email,
    password,
    requestedFamilyName,
    inviteCode,
    setupToken,
    ip,
    userAgent,
  }) {
    const rawEmail = typeof email === 'string' ? email.trim() : '';
    const rawPassword = typeof password === 'string' ? password : '';
    const cleanUsername =
      typeof username === 'string' && username.trim() ? username.trim() : rawEmail.split('@')[0];

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
        error: 'Ein Benutzer mit dieser E-Mail existiert bereits.',
      };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(rawPassword, 12);
    const userId = `usr-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const isDev = isFirstUser || rawEmail.toLowerCase() === process.env.DEV_EMAIL?.toLowerCase();
    const role = isFirstUser || isDev ? 'superadmin' : 'user';

    const newUser = userRepository.create({
      id: userId,
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
      requestedFamilyName,
      cleanUsername,
    });
    if (familyResult.error) {
      return {
        success: false,
        status: familyResult.status || 400,
        error: familyResult.error,
      };
    }

    // Session & Token
    const session = createSession(newUser.id, userAgent, ip);
    const token = createToken(newUser, session.id);

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
      return { success: false, status: 401, error: 'Ungültige E-Mail-Adresse oder Passwort.' };
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
      return { success: false, status: 401, error: 'Ungültige E-Mail-Adresse oder Passwort.' };
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
    const session = createSession(user.id, userAgent, ip);
    const token = createToken(user, session.id);

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

  async changePassword({ userId, currentPassword, newPassword, ip, userAgent }) {
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
    userRepository.updatePassword(userId, hashed, true);

    logSecurityEvent({
      event: 'PASSWORD_CHANGED',
      userId: user.id,
      email: user.email,
      ip,
      userAgent,
      status: 'success',
    });

    return { success: true };
  },

  async requestPasswordReset({ email, ip, userAgent }) {
    const rawEmail = typeof email === 'string' ? email.trim() : '';
    const user = userRepository.findByEmail(rawEmail);

    // Generic success response to avoid leaking account existence
    if (!user) {
      return {
        success: true,
        message:
          'Falls ein Konto mit dieser E-Mail existiert, wurde ein Link zum Zurücksetzen gesendet.',
      };
    }

    const plainToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(plainToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    userRepository.setResetPasswordToken(user.id, hashedToken, expiresAt);

    await sendPasswordResetEmail(user.email, plainToken);

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
      message:
        'Falls ein Konto mit dieser E-Mail existiert, wurde ein Link zum Zurücksetzen gesendet.',
    };
  },

  async resetPassword({ token, newPassword, ip, userAgent }) {
    if (!token || typeof token !== 'string') {
      return { success: false, status: 400, error: 'Ungültiger oder abgelaufener Reset-Token.' };
    }

    const policy = validatePasswordPolicy(newPassword);
    if (!policy.valid) {
      return { success: false, status: 400, error: policy.error };
    }

    const hashedToken = crypto.createHash('sha256').update(token.trim()).digest('hex');
    const user = userRepository.findByResetToken(hashedToken);

    if (!user?.resetPasswordExpires) {
      return { success: false, status: 400, error: 'Ungültiger oder abgelaufener Reset-Token.' };
    }

    if (new Date(user.resetPasswordExpires) < new Date()) {
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

    const secret = speakeasy.generateSecret({
      name: `BabyCharts (${user.email})`,
      issuer: 'BabyCharts',
      length: 20,
    });

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
    const plainRecoveryCodes = generateRecoveryCodes(8);
    const hashedRecoveryCodes = plainRecoveryCodes.map((c) => hashRecoveryCode(c, userId));

    const encryptedSecret = encryptTwoFactorSecret(secret.base32);

    // Save secret & recovery codes (not yet enabled until verified)
    userRepository.updateTwoFactor(userId, {
      secret: encryptedSecret,
      enabled: false,
      recoveryCodes: hashedRecoveryCodes,
    });

    return {
      success: true,
      secret: secret.base32,
      qrCode: qrCodeUrl,
      recoveryCodes: plainRecoveryCodes,
    };
  },

  async verifyTwoFactor({ userId, token }) {
    const user = userRepository.findById(userId);
    if (!user?.twoFactorSecret) {
      return { success: false, status: 400, error: '2FA ist nicht eingerichtet.' };
    }

    const plainSecret = decryptTwoFactorSecret(user.twoFactorSecret);
    const verified = speakeasy.totp.verify({
      secret: plainSecret,
      encoding: 'base32',
      token: token.trim(),
      window: 2,
    });

    if (!verified) {
      return { success: false, status: 400, error: 'Ungültiger 2FA-Code.' };
    }

    userRepository.updateTwoFactor(userId, {
      secret: user.twoFactorSecret,
      enabled: true,
      recoveryCodes: user.recoveryCodes,
    });

    return { success: true, message: 'Zwei-Faktor-Authentifizierung erfolgreich aktiviert.' };
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
      enabled: false,
      recoveryCodes: [],
    });

    return { success: true, message: 'Zwei-Faktor-Authentifizierung wurde deaktiviert.' };
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
