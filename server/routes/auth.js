/**
 * server/routes/auth.js
 * User Registration, Login and Profile endpoints
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { readDb, writeDb } from '../utils/db.js';
import { requireAuth, JWT_SECRET, getUserFamilyRole } from '../middleware/auth.js';

const router = express.Router();

function createToken(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, {
    expiresIn: '30d',
  });
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
router.post('/register', async (req, res) => {
  try {
    const rawEmail = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    const rawPassword = typeof req.body?.password === 'string' ? req.body.password : '';
    const rawName = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const { familyName, inviteCode } = req.body || {};

    if (!rawEmail || !rawPassword || !rawName) {
      return res.status(400).json({ error: 'Name, E-Mail und Passwort sind erforderlich.' });
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
 * POST /api/auth/login
 * Authenticates user and returns JWT + user families
 */
router.post('/login', async (req, res) => {
  try {
    const rawEmail = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    const rawPassword = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!rawEmail || !rawPassword) {
      return res.status(400).json({ error: 'E-Mail und Passwort sind erforderlich.' });
    }

    const normalizedEmail = rawEmail.toLowerCase();
    const db = readDb();
    const user = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);

    if (!user) {
      return res.status(401).json({ error: 'E-Mail oder Passwort ist nicht korrekt.' });
    }

    const isMatch = await bcrypt.compare(rawPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'E-Mail oder Passwort ist nicht korrekt.' });
    }

    // Check if user has 2FA enabled
    if (user.twoFactorSecret) {
      const rawTotp =
        typeof req.body?.totpCode === 'string' ? req.body.totpCode.replace(/\s+/g, '').trim() : '';
      if (!rawTotp) {
        return res.status(200).json({
          requires2FA: true,
          message: 'Bitte geben Sie Ihren 6-stelligen Authenticator-Code ein.',
        });
      }

      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: rawTotp,
        window: 2,
      });

      if (!verified) {
        console.warn(
          `\x1b[33m[2FA LOGIN ${new Date().toISOString()}]\x1b[0m 2FA login verification failed for user: ${user.email}`
        );
        return res.status(400).json({ error: 'Ungültiger 2FA-Code. Bitte erneut versuchen.' });
      }
    }

    // Find all families user is member of
    const userFamilies = db.families.filter(
      (f) => f.ownerId === user.id || f.members?.some((m) => m.userId === user.id)
    );

    let activeFamily = userFamilies[0] || null;

    // Fallback: if no family exists yet, create one for this user
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
    }

    const token = createToken(user);
    const userRole = getUserFamilyRole(activeFamily, user.id);

    return res.json({
      token,
      user: formatUserPayload(user),
      family: {
        id: activeFamily.id,
        name: activeFamily.name,
        avatar: activeFamily.avatar || null,
        role: userRole,
        isOwner: activeFamily.ownerId === user.id,
      },
      families: userFamilies.map((f) => ({
        id: f.id,
        name: f.name,
        avatar: f.avatar || null,
        role: getUserFamilyRole(f, user.id),
        isOwner: f.ownerId === user.id,
      })),
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
    family: activeFamily
      ? {
          id: activeFamily.id,
          name: activeFamily.name,
          avatar: activeFamily.avatar || null,
          role: getUserFamilyRole(activeFamily, user.id),
          isOwner: activeFamily.ownerId === user.id,
        }
      : null,
    families: userFamilies.map((f) => ({
      id: f.id,
      name: f.name,
      avatar: f.avatar || null,
      role: getUserFamilyRole(f, user.id),
      isOwner: f.ownerId === user.id,
    })),
  });
});

/**
 * PUT /api/auth/me
 * Updates current user profile (name, avatar)
 */
router.put('/me', requireAuth, (req, res) => {
  const rawName = typeof req.body?.name === 'string' ? req.body.name.trim() : null;
  const { avatar } = req.body || {};
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

    const secret = speakeasy.generateSecret({
      name: `BabyCharts (${user.email})`,
      issuer: 'BabyCharts',
      length: 20,
    });

    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Save temporary secret to user pending verification
    user.tempTwoFactorSecret = secret.base32;
    writeDb(db);

    console.log(
      `\x1b[36m[2FA SETUP ${new Date().toISOString()}]\x1b[0m 2FA initialization started for user: ${user.email}`
    );

    return res.json({
      secret: secret.base32,
      qrCode: qrCodeDataUrl,
    });
  } catch (err) {
    console.error(
      `\x1b[31m[2FA SETUP ERROR ${new Date().toISOString()}]\x1b[0m Error generating 2FA secret:`,
      err
    );
    return res.status(500).json({ error: 'Fehler beim Generieren des 2FA-Codes.' });
  }
});

/**
 * POST /api/auth/2fa/verify
 * Verifies code and confirms permanent 2FA activation
 */
router.post('/2fa/verify', requireAuth, (req, res) => {
  try {
    const rawTotp =
      typeof req.body?.totpCode === 'string' ? req.body.totpCode.replace(/\s+/g, '').trim() : '';
    if (!rawTotp) {
      return res.status(400).json({ error: 'Code ist erforderlich.' });
    }

    const db = readDb();
    const user = db.users.find((u) => u.id === req.user.id);
    if (!user?.tempTwoFactorSecret) {
      console.warn(
        `\x1b[33m[2FA VERIFY ${new Date().toISOString()}]\x1b[0m Verification attempt failed: No pending 2FA setup found for user ${req.user.email}`
      );
      return res.status(400).json({ error: 'Keine 2FA-Einrichtung aktiv.' });
    }

    // Verify token with a wider time drift window (window: 2 allows ±60s clock drift between phone and server)
    const verified = speakeasy.totp.verify({
      secret: user.tempTwoFactorSecret,
      encoding: 'base32',
      token: rawTotp,
      window: 2,
    });

    if (!verified) {
      console.warn(
        `\x1b[33m[2FA VERIFY ${new Date().toISOString()}]\x1b[0m Invalid TOTP code entered for user ${user.email} (token length: ${rawTotp.length})`
      );
      return res.status(400).json({ error: 'Ungültiger Code. Bitte prüfen Sie Ihre App.' });
    }

    user.twoFactorSecret = user.tempTwoFactorSecret;
    delete user.tempTwoFactorSecret;
    writeDb(db);

    console.log(
      `\x1b[32m[2FA SUCCESS ${new Date().toISOString()}]\x1b[0m 2FA successfully activated for user: ${user.email}`
    );

    return res.json({
      message: 'Zwei-Faktor-Authentifizierung erfolgreich aktiviert!',
      user: formatUserPayload(user),
    });
  } catch (err) {
    console.error(
      `\x1b[31m[2FA VERIFY ERROR ${new Date().toISOString()}]\x1b[0m Verification exception:`,
      err
    );
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

export default router;
