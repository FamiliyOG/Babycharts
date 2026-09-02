/**
 * server/services/healthCheckService.js
 * Automated backup and database integrity diagnostics (Issue #253).
 */

import fs from 'node:fs';
import path from 'node:path';
import { sqlite } from '../utils/db.js';

const BACKUP_DIR = path.resolve(process.env.DATA_DIR || './data', 'backups');

/**
 * Runs integrity checks on the SQLite database and backup files.
 * @returns {object} Health report
 */
export function checkDatabaseAndBackupHealth() {
  const issues = [];
  let dbHealthy = true;

  // 1. SQLite Integrity Check
  try {
    const integrityResult = sqlite.pragma('integrity_check', { simple: true });
    if (integrityResult !== 'ok') {
      dbHealthy = false;
      issues.push(`SQLite Integrity Check Fehler: ${integrityResult}`);
    }
  } catch (err) {
    dbHealthy = false;
    issues.push(`SQLite Integrity Check Ausnahme: ${err.message}`);
  }

  // 2. Foreign Key Check
  try {
    const fkErrors = sqlite.pragma('foreign_key_check');
    if (Array.isArray(fkErrors) && fkErrors.length > 0) {
      dbHealthy = false;
      issues.push(`Gefundene Fremdschlüsselverletzungen: ${fkErrors.length}`);
    }
  } catch (err) {
    issues.push(`Foreign Key Check Fehler: ${err.message}`);
  }

  // 3. Schema & Row Counts
  let stats = {
    users: 0,
    families: 0,
    profiles: 0,
    measurements: 0,
    auditLogs: 0,
    backupCount: 0,
    latestBackup: null,
  };

  try {
    stats.users = sqlite.prepare('SELECT COUNT(*) as c FROM users').get()?.c || 0;
    stats.families = sqlite.prepare('SELECT COUNT(*) as c FROM families').get()?.c || 0;
    stats.profiles =
      sqlite.prepare('SELECT COUNT(*) as c FROM profiles WHERE deletedAt IS NULL').get()?.c || 0;
    stats.measurements = sqlite.prepare('SELECT COUNT(*) as c FROM measurements').get()?.c || 0;
    stats.auditLogs = sqlite.prepare('SELECT COUNT(*) as c FROM family_audit_logs').get()?.c || 0;
  } catch (err) {
    issues.push(`Fehler beim Zählen der Datenbanktabellen: ${err.message}`);
  }

  // 4. Backup Directory Inspection
  try {
    if (fs.existsSync(BACKUP_DIR)) {
      const files = fs
        .readdirSync(BACKUP_DIR)
        .filter((f) => f.endsWith('.json') || f.endsWith('.sqlite'));
      stats.backupCount = files.length;
      if (files.length > 0) {
        files.sort((a, b) => {
          const statA = fs.statSync(path.join(BACKUP_DIR, a));
          const statB = fs.statSync(path.join(BACKUP_DIR, b));
          return statB.mtimeMs - statA.mtimeMs;
        });
        const latestStat = fs.statSync(path.join(BACKUP_DIR, files[0]));
        stats.latestBackup = {
          filename: files[0],
          sizeBytes: latestStat.size,
          createdAt: latestStat.mtime.toISOString(),
        };
      }
    }
  } catch (err) {
    issues.push(`Fehler beim Prüfen des Backup-Verzeichnisses: ${err.message}`);
  }

  let status = 'healthy';
  if (!dbHealthy) {
    status = 'error';
  } else if (issues.length > 0) {
    status = 'warning';
  }

  return {
    status,
    healthy: issues.length === 0,
    timestamp: new Date().toISOString(),
    stats,
    issues,
  };
}
