/**
 * server/repositories/familyRepository.js
 * Encapsulated SQLite data access layer for Families, Members, Invites, Grants & Emergency Access.
 * Matches exact SQLite schema and constraints.
 */

import crypto from 'node:crypto';
import { sqlite } from '../utils/db.js';

export const familyRepository = {
  findById(id) {
    if (!id) return null;
    const family = sqlite.prepare('SELECT * FROM families WHERE id = ?').get(id);
    if (!family) return null;

    const members = sqlite
      .prepare(
        `
        SELECT fm.userId, fm.role, fm.joinedAt, u.name, u.email
        FROM family_members fm
        LEFT JOIN users u ON u.id = fm.userId
        WHERE fm.familyId = ?
        ORDER BY fm.joinedAt ASC
      `
      )
      .all(id);

    return { ...family, members };
  },

  findAll() {
    const families = sqlite.prepare('SELECT * FROM families ORDER BY createdAt ASC').all();
    const memberStmt = sqlite.prepare(`
      SELECT fm.userId, fm.role, fm.joinedAt, u.name, u.email
      FROM family_members fm
      LEFT JOIN users u ON u.id = fm.userId
      WHERE fm.familyId = ?
      ORDER BY fm.joinedAt ASC
    `);

    return families.map((f) => ({
      ...f,
      members: memberStmt.all(f.id),
    }));
  },

  findByUserId(userId) {
    if (!userId) return [];
    const rows = sqlite
      .prepare(
        `
        SELECT f.*, fm.role as userRole, fm.joinedAt
        FROM families f
        INNER JOIN family_members fm ON fm.familyId = f.id
        WHERE fm.userId = ?
        ORDER BY f.createdAt ASC
      `
      )
      .all(userId);

    const memberStmt = sqlite.prepare(`
      SELECT fm.userId, fm.role, fm.joinedAt, u.name, u.email
      FROM family_members fm
      LEFT JOIN users u ON u.id = fm.userId
      WHERE fm.familyId = ?
      ORDER BY fm.joinedAt ASC
    `);

    return rows.map((r) => ({
      ...r,
      members: memberStmt.all(r.id),
    }));
  },

  getMember(familyId, userId) {
    if (!familyId || !userId) return null;
    return sqlite
      .prepare('SELECT * FROM family_members WHERE familyId = ? AND userId = ?')
      .get(familyId, userId);
  },

  getMembers(familyId) {
    if (!familyId) return [];
    return sqlite
      .prepare(
        `
        SELECT fm.userId, fm.role, fm.joinedAt, u.name, u.email
        FROM family_members fm
        LEFT JOIN users u ON u.id = fm.userId
        WHERE fm.familyId = ?
        ORDER BY fm.joinedAt ASC
      `
      )
      .all(familyId);
  },

  create(family, creatorUserId, creatorRole = 'owner') {
    const now = new Date().toISOString();
    const insertFamily = sqlite.prepare(`
      INSERT INTO families (id, name, avatar, ownerId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertMember = sqlite.prepare(`
      INSERT INTO family_members (familyId, userId, role, joinedAt)
      VALUES (?, ?, ?, ?)
    `);

    const transaction = sqlite.transaction(() => {
      insertFamily.run(
        family.id,
        family.name,
        family.avatar || null,
        creatorUserId || null,
        family.createdAt || now,
        family.updatedAt || now
      );
      if (creatorUserId) {
        insertMember.run(family.id, creatorUserId, creatorRole, now);
      }
    });

    transaction();
    return this.findById(family.id);
  },

  update(id, updates) {
    const now = new Date().toISOString();
    if (updates.avatar !== undefined) {
      sqlite
        .prepare('UPDATE families SET name = ?, avatar = ?, updatedAt = ? WHERE id = ?')
        .run(updates.name, updates.avatar, now, id);
    } else {
      sqlite
        .prepare('UPDATE families SET name = ?, updatedAt = ? WHERE id = ?')
        .run(updates.name, now, id);
    }
    return this.findById(id);
  },

  delete(id) {
    return sqlite.prepare('DELETE FROM families WHERE id = ?').run(id);
  },

  addMember(familyId, userId, role = 'editor') {
    const now = new Date().toISOString();
    sqlite
      .prepare(
        `
        INSERT OR REPLACE INTO family_members (familyId, userId, role, joinedAt)
        VALUES (?, ?, ?, ?)
      `
      )
      .run(familyId, userId, role, now);
    return this.getMember(familyId, userId);
  },

  updateMemberRole(familyId, userId, role) {
    sqlite
      .prepare('UPDATE family_members SET role = ? WHERE familyId = ? AND userId = ?')
      .run(role, familyId, userId);
    return this.getMember(familyId, userId);
  },

  removeMember(familyId, userId) {
    return sqlite
      .prepare('DELETE FROM family_members WHERE familyId = ? AND userId = ?')
      .run(familyId, userId);
  },

  transferOwnership(familyId, currentOwnerId, newOwnerId, currentOwnerNewRole = 'parent') {
    const now = new Date().toISOString();
    const transaction = sqlite.transaction(() => {
      sqlite
        .prepare('UPDATE family_members SET role = ? WHERE familyId = ? AND userId = ?')
        .run(currentOwnerNewRole, familyId, currentOwnerId);
      sqlite
        .prepare('UPDATE family_members SET role = ? WHERE familyId = ? AND userId = ?')
        .run('owner', familyId, newOwnerId);
      sqlite
        .prepare('UPDATE families SET ownerId = ?, updatedAt = ? WHERE id = ?')
        .run(newOwnerId, now, familyId);
    });
    transaction();
    return this.findById(familyId);
  },

  // Invites (code is PK)
  getInvites(familyId) {
    if (!familyId) return [];
    return sqlite
      .prepare('SELECT * FROM invites WHERE familyId = ? ORDER BY createdAt DESC')
      .all(familyId);
  },

  getInviteByCode(code) {
    if (!code) return null;
    return sqlite.prepare('SELECT * FROM invites WHERE code = ?').get(code) || null;
  },

  createInvite(invite) {
    const now = new Date().toISOString();
    sqlite
      .prepare(
        `
        INSERT INTO invites (code, familyId, role, createdBy, createdAt, expiresAt, maxUses, usesCount, invitedEmail)
        VALUES (@code, @familyId, @role, @createdBy, @createdAt, @expiresAt, @maxUses, @usesCount, @invitedEmail)
      `
      )
      .run({
        code: invite.code,
        familyId: invite.familyId,
        role: invite.role || 'editor',
        createdBy: invite.createdBy || null,
        createdAt: invite.createdAt || now,
        expiresAt: invite.expiresAt || null,
        maxUses: invite.maxUses || 1,
        usesCount: invite.usesCount || 0,
        invitedEmail: invite.invitedEmail || invite.email || null,
      });
    return this.getInviteByCode(invite.code);
  },

  deleteInvite(code) {
    return sqlite.prepare('DELETE FROM invites WHERE code = ?').run(code);
  },

  recordUsedInvite(used) {
    const now = new Date().toISOString();
    return sqlite
      .prepare(
        `
        INSERT OR REPLACE INTO used_invites (code, familyId, usedBy, usedAt)
        VALUES (?, ?, ?, ?)
      `
      )
      .run(used.code, used.familyId, used.usedBy, used.usedAt || now);
  },

  getUsedInvites(familyId) {
    if (!familyId) return [];
    return sqlite
      .prepare('SELECT * FROM used_invites WHERE familyId = ? ORDER BY usedAt DESC')
      .all(familyId);
  },

  // Visitor Grants
  getVisitorGrants(familyId, visitorUserId) {
    if (!familyId || !visitorUserId) return [];
    return sqlite
      .prepare('SELECT * FROM visitor_grants WHERE familyId = ? AND visitorUserId = ?')
      .all(familyId, visitorUserId);
  },

  setVisitorGrants(familyId, visitorUserId, grants = []) {
    const deleteStmt = sqlite.prepare(
      'DELETE FROM visitor_grants WHERE familyId = ? AND visitorUserId = ?'
    );
    const insertStmt = sqlite.prepare(`
      INSERT INTO visitor_grants (id, familyId, visitorUserId, profileId, category, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();
    const transaction = sqlite.transaction(() => {
      deleteStmt.run(familyId, visitorUserId);
      for (const g of grants) {
        if (!g.profileId || !g.category) continue;
        const id = g.id || `vg_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
        const createdAt = g.createdAt || now;
        insertStmt.run(id, familyId, visitorUserId, g.profileId, g.category, createdAt);
      }
    });

    transaction();
    return this.getVisitorGrants(familyId, visitorUserId);
  },

  // Emergency Access
  getActiveEmergencyAccess(familyId, userId) {
    const now = new Date().toISOString();
    return (
      sqlite
        .prepare(
          `
          SELECT * FROM emergency_access
          WHERE familyId = ? AND userId = ? AND revokedAt IS NULL AND expiresAt > ?
          ORDER BY grantedAt DESC LIMIT 1
        `
        )
        .get(familyId, userId, now) || null
    );
  },

  grantEmergencyAccess(familyId, userId, reason, durationMs = 60 * 60 * 1000) {
    const id = `emg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const grantedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + durationMs).toISOString();

    sqlite
      .prepare(
        `
        INSERT INTO emergency_access (id, familyId, userId, reason, grantedAt, expiresAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `
      )
      .run(id, familyId, userId, reason, grantedAt, expiresAt);

    return { id, familyId, userId, reason, grantedAt, expiresAt };
  },

  revokeEmergencyAccess(familyId, userId) {
    const now = new Date().toISOString();
    sqlite
      .prepare(
        `
        UPDATE emergency_access SET revokedAt = ?
        WHERE familyId = ? AND userId = ? AND revokedAt IS NULL
      `
      )
      .run(now, familyId, userId);
  },
};
