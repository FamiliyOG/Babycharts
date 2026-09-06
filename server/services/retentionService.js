/**
 * server/services/retentionService.js
 * Configurable data retention and cleanup service (Issue #318).
 * Manages automated purging of aged audit logs and final deletion of expired soft-deleted profiles.
 */

import { sqlite, readDb } from '../utils/db.js';
import { resolveEffectiveSettings } from '../config/settingsRegistry.js';

/**
 * Purges expired audit logs and soft-deleted profiles according to effective retention policies.
 *
 * @param {Object} [options]
 * @param {number} [options.auditLogRetentionDays] Override days for audit logs
 * @param {number} [options.softDeleteRetentionDays] Override days for soft-deleted profiles
 * @returns {Object} Cleanup summary report
 */
export function runRetentionCleanup(options = {}) {
  const db = readDb();
  const effective = resolveEffectiveSettings(db.settings || {});

  const auditRetentionDays =
    options.auditLogRetentionDays ?? effective.audit_log_retention_days?.value ?? 365;
  const softDeleteRetentionDays =
    options.softDeleteRetentionDays ?? effective.soft_delete_retention_days?.value ?? 30;

  const now = new Date();
  const auditCutoff = new Date(now.getTime() - auditRetentionDays * 86400000).toISOString();
  const softDeleteCutoff = new Date(
    now.getTime() - softDeleteRetentionDays * 86400000
  ).toISOString();

  let purgedAuditLogs = 0;
  let purgedProfiles = 0;

  const cleanupTransaction = sqlite.transaction(() => {
    // 1. Purge expired audit logs
    const auditRes = sqlite.prepare('DELETE FROM audit_logs WHERE timestamp < ?').run(auditCutoff);
    purgedAuditLogs = auditRes.changes;

    // 2. Find soft-deleted profiles older than cutoff
    const expiredProfiles = sqlite
      .prepare('SELECT id FROM profiles WHERE deletedAt IS NOT NULL AND deletedAt < ?')
      .all(softDeleteCutoff);

    if (expiredProfiles.length > 0) {
      const expiredIds = expiredProfiles.map((p) => p.id);
      for (const id of expiredIds) {
        sqlite.prepare('DELETE FROM measurements WHERE profileId = ?').run(id);
        sqlite.prepare('DELETE FROM health_logs WHERE profileId = ?').run(id);
        sqlite.prepare('DELETE FROM profiles WHERE id = ?').run(id);
      }
      purgedProfiles = expiredProfiles.length;
    }
  });

  cleanupTransaction();

  return {
    success: true,
    timestamp: now.toISOString(),
    policies: {
      auditLogRetentionDays: auditRetentionDays,
      softDeleteRetentionDays: softDeleteRetentionDays,
      auditCutoff,
      softDeleteCutoff,
    },
    purged: {
      auditLogs: purgedAuditLogs,
      profiles: purgedProfiles,
    },
  };
}
