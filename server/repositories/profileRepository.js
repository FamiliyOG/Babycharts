/**
 * server/repositories/profileRepository.js
 * Encapsulated SQLite data access layer for Profiles, Measurements & Health Logs.
 * Handles JSON fields, soft-deletes and cascaded relational mappings.
 */

import { sqlite } from '../utils/db.js';

function mapProfileRow(p) {
  if (!p) return null;

  const measurements = sqlite
    .prepare(
      'SELECT * FROM measurements WHERE profileId = ? AND deletedAt IS NULL ORDER BY date ASC'
    )
    .all(p.id);

  const healthLogs = sqlite
    .prepare(
      'SELECT * FROM health_logs WHERE profileId = ? AND deletedAt IS NULL ORDER BY dateTime ASC'
    )
    .all(p.id)
    .map((h) => ({
      ...h,
      symptoms: h.symptoms ? JSON.parse(h.symptoms) : [],
    }));

  return {
    ...p,
    version: p.version || 1,
    deletedAt: p.deletedAt || null,
    schedule: p.schedule
      ? JSON.parse(p.schedule)
      : { enabled: false, frequency: 'daily', intervalDays: 7, lastExportAt: null },
    vaccinations: p.vaccinations ? JSON.parse(p.vaccinations) : {},
    teeth: p.teeth ? JSON.parse(p.teeth) : {},
    milestones: p.milestones ? JSON.parse(p.milestones) : {},
    customMilestones: p.customMilestones ? JSON.parse(p.customMilestones) : [],
    measurements,
    healthLog: healthLogs,
    healthLogs,
  };
}

const toNullableNumber = (val) => (val !== undefined && val !== null ? Number(val) : null);

function buildProfileEntity(profile, now) {
  return {
    id: profile.id,
    familyId: profile.familyId,
    name: profile.name,
    birthdate: profile.birthdate,
    gender: profile.gender || 'boy',
    avatar: profile.avatar || null,
    notes: profile.notes || '',
    schedule: profile.schedule ? JSON.stringify(profile.schedule) : null,
    vaccinations: profile.vaccinations ? JSON.stringify(profile.vaccinations) : '{}',
    teeth: profile.teeth ? JSON.stringify(profile.teeth) : '{}',
    milestones: profile.milestones ? JSON.stringify(profile.milestones) : '{}',
    customMilestones: profile.customMilestones ? JSON.stringify(profile.customMilestones) : '[]',
    version: profile.version || 1,
    deletedAt: profile.deletedAt || null,
    createdAt: profile.createdAt || now,
    updatedAt: profile.updatedAt || now,
  };
}

function insertMeasurements(profileId, measurements, now) {
  if (!Array.isArray(measurements) || measurements.length === 0) return;
  const insM = sqlite.prepare(`
    INSERT OR REPLACE INTO measurements (id, profileId, date, weight, length, headCircumference, checkup, notes, createdAt)
    VALUES (@id, @profileId, @date, @weight, @length, @headCircumference, @checkup, @notes, @createdAt)
  `);
  for (const m of measurements) {
    insM.run({
      id: m.id || `${profileId}-m-${m.date}`,
      profileId,
      date: m.date,
      weight: toNullableNumber(m.weight),
      length: toNullableNumber(m.length),
      headCircumference: toNullableNumber(m.headCircumference),
      checkup: m.checkup || null,
      notes: m.notes || null,
      createdAt: m.createdAt || now,
    });
  }
}

function insertHealthLogs(profileId, healthLogs, now) {
  if (!Array.isArray(healthLogs) || healthLogs.length === 0) return;
  const insH = sqlite.prepare(`
    INSERT OR REPLACE INTO health_logs (id, profileId, dateTime, temperature, medication, symptoms, notes, createdAt)
    VALUES (@id, @profileId, @dateTime, @temperature, @medication, @symptoms, @notes, @createdAt)
  `);
  for (const h of healthLogs) {
    insH.run({
      id: h.id || `${profileId}-h-${h.dateTime}`,
      profileId,
      dateTime: h.dateTime,
      temperature: toNullableNumber(h.temperature),
      medication: h.medication || null,
      symptoms: Array.isArray(h.symptoms) ? JSON.stringify(h.symptoms) : '[]',
      notes: h.notes || null,
      createdAt: h.createdAt || now,
    });
  }
}

export const profileRepository = {
  findById(id, includeDeleted = false) {
    if (!id) return null;
    const sql = includeDeleted
      ? 'SELECT * FROM profiles WHERE id = ?'
      : 'SELECT * FROM profiles WHERE id = ? AND deletedAt IS NULL';
    const row = sqlite.prepare(sql).get(id);
    return mapProfileRow(row);
  },

  findByFamilyId(familyId, includeDeleted = false) {
    if (!familyId) return [];
    const sql = includeDeleted
      ? 'SELECT * FROM profiles WHERE familyId = ? ORDER BY birthdate ASC'
      : 'SELECT * FROM profiles WHERE familyId = ? AND deletedAt IS NULL ORDER BY birthdate ASC';
    const rows = sqlite.prepare(sql).all(familyId);
    return rows.map(mapProfileRow);
  },

  findAll(options = {}) {
    const { familyId, includeDeleted = false } = options;
    let sql = 'SELECT * FROM profiles WHERE 1=1';
    const params = [];

    if (!includeDeleted) {
      sql += ' AND deletedAt IS NULL';
    }
    if (familyId) {
      sql += ' AND familyId = ?';
      params.push(familyId);
    }
    sql += ' ORDER BY birthdate ASC';

    const rows = sqlite.prepare(sql).all(...params);
    return rows.map(mapProfileRow);
  },

  create(profile) {
    const now = new Date().toISOString();
    const insertProfile = sqlite.prepare(`
      INSERT INTO profiles (
        id, familyId, name, birthdate, gender, avatar, notes,
        schedule, vaccinations, teeth, milestones, customMilestones,
        version, deletedAt, createdAt, updatedAt
      ) VALUES (
        @id, @familyId, @name, @birthdate, @gender, @avatar, @notes,
        @schedule, @vaccinations, @teeth, @milestones, @customMilestones,
        @version, @deletedAt, @createdAt, @updatedAt
      )
    `);

    insertProfile.run(buildProfileEntity(profile, now));
    insertMeasurements(profile.id, profile.measurements, now);
    insertHealthLogs(profile.id, profile.healthLog, now);

    return this.findById(profile.id);
  },

  update(id, updates) {
    const current = this.findById(id, true);
    if (!current) return null;

    const merged = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    sqlite
      .prepare(
        `
        UPDATE profiles SET
          name = @name,
          birthdate = @birthdate,
          gender = @gender,
          avatar = @avatar,
          notes = @notes,
          schedule = @schedule,
          vaccinations = @vaccinations,
          teeth = @teeth,
          milestones = @milestones,
          customMilestones = @customMilestones,
          version = version + 1,
          updatedAt = @updatedAt
        WHERE id = @id
      `
      )
      .run({
        id,
        name: merged.name,
        birthdate: merged.birthdate,
        gender: merged.gender,
        avatar: merged.avatar,
        notes: merged.notes,
        schedule: merged.schedule ? JSON.stringify(merged.schedule) : null,
        vaccinations: merged.vaccinations ? JSON.stringify(merged.vaccinations) : '{}',
        teeth: merged.teeth ? JSON.stringify(merged.teeth) : '{}',
        milestones: merged.milestones ? JSON.stringify(merged.milestones) : '{}',
        customMilestones: merged.customMilestones ? JSON.stringify(merged.customMilestones) : '[]',
        updatedAt: merged.updatedAt,
      });

    return this.findById(id);
  },

  softDelete(id) {
    const timestamp = new Date().toISOString();
    const transaction = sqlite.transaction(() => {
      sqlite.prepare('UPDATE profiles SET deletedAt = ? WHERE id = ?').run(timestamp, id);
      sqlite
        .prepare('UPDATE measurements SET deletedAt = ? WHERE profileId = ?')
        .run(timestamp, id);
      sqlite.prepare('UPDATE health_logs SET deletedAt = ? WHERE profileId = ?').run(timestamp, id);
    });
    transaction();
    return true;
  },

  restore(id) {
    const transaction = sqlite.transaction(() => {
      sqlite.prepare('UPDATE profiles SET deletedAt = NULL WHERE id = ?').run(id);
      sqlite.prepare('UPDATE measurements SET deletedAt = NULL WHERE profileId = ?').run(id);
      sqlite.prepare('UPDATE health_logs SET deletedAt = NULL WHERE profileId = ?').run(id);
    });
    transaction();
    return true;
  },

  delete(id) {
    return sqlite.prepare('DELETE FROM profiles WHERE id = ?').run(id);
  },
};
