/**
 * server/scheduler.js
 * Per-child cron-based PDF report scheduler using node-cron.
 *
 * Each child profile has a `schedule` field:
 *   {
 *     enabled: boolean,
 *     frequency: 'daily' | 'weekly' | 'monthly' | 'every_n_days',
 *     intervalDays: number,   // only for 'every_n_days'
 *     lastExportAt: string|null  // ISO timestamp
 *   }
 *
 * Schedule mapping:
 *   daily       → cron "0 0 * * *"    (midnight every day)
 *   weekly      → cron "0 0 * * 1"    (midnight every Monday)
 *   monthly     → cron "0 0 1 * *"    (midnight on 1st of month)
 *   every_n_days→ cron "0 0 * * *"    (daily check, skips if not enough days have passed)
 */

import cron from 'node-cron';
import { readDb, writeDb } from './utils/db.js';
import { generatePdfForChild } from './pdfGenerator.js';

/** Map of childId → ScheduledTask */
const activeTasks = new Map();

let appUrl = 'http://localhost:3001';

export function setAppUrl(url) {
  appUrl = url;
}

/**
 * Cancel all running cron jobs and reschedule based on current db.json profiles.
 * Called on startup and whenever profiles are modified.
 */
export function rescheduleAll() {
  // Cancel existing tasks
  for (const [id, task] of activeTasks.entries()) {
    task.stop();
    activeTasks.delete(id);
    console.log(`[Scheduler] Cancelled job for child: ${id}`);
  }

  const db = readDb();
  for (const profile of db.profiles) {
    const sched = profile.schedule;
    if (!sched?.enabled) continue;

    const cronExpr = getCronExpression(sched);
    if (!cronExpr) continue;

    const task = cron.schedule(cronExpr, async () => {
      // For 'every_n_days', check if enough days have passed
      if (sched.frequency === 'every_n_days') {
        if (!shouldRunEveryNDays(profile)) {
          console.log(`[Scheduler] Skipping "${profile.name}" – interval not reached yet.`);
          return;
        }
      }

      console.log(`[Scheduler] ⏰ Running scheduled PDF export for "${profile.name}"…`);

      // Reload profile (measurements may have changed since cron was set up)
      const freshDb = readDb();
      const freshProfile = freshDb.profiles.find((p) => p.id === profile.id);
      if (!freshProfile) return;

      const outputPath = await generatePdfForChild(freshProfile, appUrl);

      if (outputPath) {
        // Update lastExportAt in db
        const dbAfter = readDb();
        const idx = dbAfter.profiles.findIndex((p) => p.id === profile.id);
        if (idx !== -1) {
          dbAfter.profiles[idx].schedule.lastExportAt = new Date().toISOString();
          writeDb(dbAfter);
        }
        console.log(`[Scheduler] ✅ PDF saved: ${outputPath}`);
      } else {
        console.error(`[Scheduler] ❌ PDF generation failed for "${profile.name}"`);
      }
    });

    activeTasks.set(profile.id, task);
    console.log(`[Scheduler] ✅ Scheduled "${profile.name}" → ${sched.frequency} (${cronExpr})`);
  }
}

/** Convert a schedule object to a cron expression */
function getCronExpression(sched) {
  switch (sched.frequency) {
    case 'daily':
      return '0 0 * * *';
    case 'weekly':
      return '0 0 * * 1'; // every Monday midnight
    case 'monthly':
      return '0 0 1 * *'; // 1st of month midnight
    case 'every_n_days':
      return '0 0 * * *'; // run daily, gate by interval check
    default:
      return null;
  }
}

/** Returns true if enough days have passed since the last export */
function shouldRunEveryNDays(profile) {
  const sched = profile.schedule;
  const intervalDays = Number(sched.intervalDays) || 1;
  if (!sched.lastExportAt) return true; // never exported → run now

  const last = new Date(sched.lastExportAt);
  const now = new Date();
  const daysPassed = (now - last) / (1000 * 60 * 60 * 24);
  return daysPassed >= intervalDays;
}
