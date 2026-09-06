/**
 * server/services/auditService.js
 * Family-isolated audit logging for security, compliance, and multi-user accountability (Issue #248).
 */

import crypto from 'node:crypto';
import { sqlite } from '../utils/db.js';

export const AUDIT_ACTIONS = {
  // Profiles
  PROFILE_CREATE: 'PROFILE_CREATE',
  PROFILE_UPDATE: 'PROFILE_UPDATE',
  PROFILE_DELETE: 'PROFILE_DELETE',

  // Measurements
  MEASUREMENT_CREATE: 'MEASUREMENT_CREATE',
  MEASUREMENT_UPDATE: 'MEASUREMENT_UPDATE',
  MEASUREMENT_DELETE: 'MEASUREMENT_DELETE',

  // Health, Teeth & Milestones
  HEALTH_ENTRY_ADD: 'HEALTH_ENTRY_ADD',
  TOOTH_RECORD: 'TOOTH_RECORD',
  MILESTONE_RECORD: 'MILESTONE_RECORD',
  VACCINE_RECORD: 'VACCINE_RECORD',

  // Family & Members
  MEMBER_INVITE: 'MEMBER_INVITE',
  MEMBER_JOIN: 'MEMBER_JOIN',
  MEMBER_REMOVE: 'MEMBER_REMOVE',
  ROLE_CHANGE: 'ROLE_CHANGE',
  FAMILY_UPDATE: 'FAMILY_UPDATE',
  FAMILY_BACKUP_EXPORT: 'FAMILY_BACKUP_EXPORT',
  FAMILY_BACKUP_IMPORT: 'FAMILY_BACKUP_IMPORT',
};

/**
 * Logs a family audit event into the database.
 */
export function logFamilyAudit({
  familyId,
  userId,
  userName,
  action,
  details = '',
  metadata = {},
}) {
  if (!familyId) return;

  try {
    const id = `audit-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const timestamp = new Date().toISOString();
    const serializedDetails =
      typeof details === 'object' && details !== null
        ? JSON.stringify(details)
        : String(details ?? '');

    sqlite
      .prepare(
        `
        INSERT INTO family_audit_logs (id, familyId, userId, userName, action, details, metadata, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        id,
        familyId,
        userId || 'system',
        userName || 'System',
        action,
        serializedDetails,
        JSON.stringify(metadata || {}),
        timestamp
      );
  } catch (err) {
    console.error('[AuditLog] Error writing family audit log:', err.message);
  }
}

/**
 * Retrieves audit logs for a specific family with Keyset-Pagination (Issue #248, BC-297).
 */
export function getFamilyAuditLogs(familyId, limit = 50, cursor = null) {
  if (!familyId) return { items: [], nextCursor: null, hasMore: false };
  try {
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);

    let query = 'SELECT * FROM family_audit_logs WHERE familyId = ?';
    const params = [familyId];

    if (cursor) {
      // Keyset comparison: WHERE (timestamp, id) < (cursor.sortValue, cursor.id)
      query += ' AND (timestamp < ? OR (timestamp = ? AND id < ?))';
      params.push(cursor.sortValue, cursor.sortValue, cursor.id);
    }

    query += ' ORDER BY timestamp DESC, id DESC LIMIT ?';
    params.push(safeLimit + 1);

    const rows = sqlite.prepare(query).all(...params);

    const hasMore = rows.length > safeLimit;
    const items = hasMore ? rows.slice(0, safeLimit) : rows;

    const mapped = items.map((r) => {
      let parsedMeta = {};
      if (r.metadata) {
        try {
          parsedMeta = JSON.parse(r.metadata);
        } catch {
          parsedMeta = {};
        }
      }
      return {
        ...r,
        metadata: parsedMeta,
      };
    });

    return {
      items: mapped,
      hasMore,
    };
  } catch (err) {
    console.error('[AuditLog] Error reading family audit logs:', err.message);
    return { items: [], hasMore: false };
  }
}
