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
        details,
        JSON.stringify(metadata),
        timestamp
      );
  } catch (err) {
    console.error('[AuditLog] Error writing family audit log:', err.message);
  }
}

/**
 * Retrieves audit logs for a specific family.
 */
export function getFamilyAuditLogs(familyId, limit = 50) {
  if (!familyId) return [];
  try {
    const rows = sqlite
      .prepare('SELECT * FROM family_audit_logs WHERE familyId = ? ORDER BY timestamp DESC LIMIT ?')
      .all(familyId, limit);

    return rows.map((r) => {
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
  } catch (err) {
    console.error('[AuditLog] Error reading family audit logs:', err.message);
    return [];
  }
}
