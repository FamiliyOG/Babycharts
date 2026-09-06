/**
 * src/domain/models.js
 * Canonical Domain Models for BabyCharts (Issue #287).
 * Standardizes entity schemas, validation, and default structures across UI, API, and storage.
 */

/**
 * Normalizes gender value to canonical enum ('boy' | 'girl')
 * @param {unknown} val
 * @returns {'boy' | 'girl'}
 */
export function normalizeGender(val) {
  if (val === 'boy' || val === 'girl') return val;
  if (typeof val === 'string') {
    const lower = val.toLowerCase().trim();
    if (lower === 'm' || lower === 'male' || lower === 'junge' || lower === 'boy') return 'boy';
    if (lower === 'f' || lower === 'female' || lower === 'mädchen' || lower === 'girl')
      return 'girl';
  }
  return 'boy'; // Safe default
}

/**
 * Validates and normalizes date string to YYYY-MM-DD format
 * @param {unknown} val
 * @returns {string|null}
 */
export function normalizeDate(val) {
  if (!val) return null;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  }
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    return val.toISOString().split('T')[0];
  }
  return null;
}

function generateRandomSuffix() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().slice(0, 8);
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const arr = new Uint8Array(4);
    crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return `${Date.now().toString(36)}`;
}

/**
 * Normalizes a biometric measurement entity.
 * @param {object} raw
 * @returns {object} Canonical Measurement
 */
export function createCanonicalMeasurement(raw = {}) {
  const date = normalizeDate(raw.date) || new Date().toISOString().split('T')[0];
  const weight =
    typeof raw.weight === 'number' && raw.weight > 0 ? Number(raw.weight.toFixed(3)) : null;
  const length =
    typeof raw.length === 'number' && raw.length > 0 ? Number(raw.length.toFixed(1)) : null;
  const headCircumference =
    typeof raw.headCircumference === 'number' && raw.headCircumference > 0
      ? Number(raw.headCircumference.toFixed(1))
      : null;

  let notes = '';
  if (typeof raw.notes === 'string') {
    notes = raw.notes.trim();
  } else if (typeof raw.note === 'string') {
    notes = raw.note.trim();
  }

  return {
    id: raw.id || `meas-${Date.now()}-${generateRandomSuffix()}`,
    profileId: raw.profileId || raw.childId || null,
    date,
    weight,
    length,
    headCircumference,
    checkup: raw.checkup || null,
    notes,
    createdAt: raw.createdAt || new Date().toISOString(),
    deletedAt: raw.deletedAt || null,
  };
}

/**
 * Normalizes a Milestone entity.
 * @param {string} key
 * @param {object} raw
 * @returns {object} Canonical Milestone
 */
export function createCanonicalMilestone(key, raw = {}) {
  const date = normalizeDate(raw.date || raw.completedDate || raw.achievedAt);

  let photo = null;
  if (typeof raw.photo === 'string') {
    photo = raw.photo;
  } else if (typeof raw.image === 'string') {
    photo = raw.image;
  }

  return {
    id: raw.id || key,
    key,
    completed: Boolean(raw.completed ?? Boolean(date)),
    date,
    title: raw.title || raw.name || key,
    category: raw.category || 'general',
    notes: typeof raw.notes === 'string' ? raw.notes.trim() : '',
    photo,
    updatedAt: raw.updatedAt || (date ? `${date}T12:00:00.000Z` : new Date().toISOString()),
  };
}

/**
 * Normalizes a Tooth eruption entity.
 * @param {string} key
 * @param {object} raw
 * @returns {object} Canonical Tooth
 */
export function createCanonicalTooth(key, raw = {}) {
  const date = normalizeDate(raw.date || raw.eruptedDate);
  return {
    id: raw.id || key,
    key,
    erupted: Boolean(raw.erupted ?? Boolean(date)),
    date,
    name: raw.name || key,
    position: raw.position || null,
    notes: typeof raw.notes === 'string' ? raw.notes.trim() : '',
    updatedAt: raw.updatedAt || (date ? `${date}T12:00:00.000Z` : new Date().toISOString()),
  };
}

/**
 * Normalizes a Vaccination entity.
 * @param {string} key
 * @param {object} raw
 * @returns {object} Canonical Vaccination
 */
export function createCanonicalVaccination(key, raw = {}) {
  const date = normalizeDate(raw.date || raw.administeredDate);
  return {
    id: raw.id || key,
    key,
    completed: Boolean(raw.completed ?? raw.received ?? Boolean(date)),
    date,
    name: raw.name || key,
    doctor: typeof raw.doctor === 'string' ? raw.doctor.trim() : '',
    batch: typeof raw.batch === 'string' ? raw.batch.trim() : '',
    notes: typeof raw.notes === 'string' ? raw.notes.trim() : '',
    updatedAt: raw.updatedAt || (date ? `${date}T12:00:00.000Z` : new Date().toISOString()),
  };
}

/**
 * Normalizes a U-Checkup entity.
 * @param {string} key
 * @param {object} raw
 * @returns {object} Canonical UCheckup
 */
export function createCanonicalUCheckup(key, raw = {}) {
  const date = normalizeDate(raw.date || raw.completedDate);

  let doctorNotes = '';
  if (typeof raw.doctorNotes === 'string') {
    doctorNotes = raw.doctorNotes.trim();
  } else if (typeof raw.notes === 'string') {
    doctorNotes = raw.notes.trim();
  }

  return {
    id: raw.id || key,
    key,
    completed: Boolean(raw.completed ?? Boolean(date)),
    date,
    name: raw.name || key,
    doctorNotes,
    updatedAt: raw.updatedAt || (date ? `${date}T12:00:00.000Z` : new Date().toISOString()),
  };
}

/**
 * Normalizes a Health Log entity.
 * @param {object} raw
 * @returns {object} Canonical HealthLog
 */
export function createCanonicalHealthLog(raw = {}) {
  return {
    id: raw.id || `hl-${Date.now()}-${generateRandomSuffix()}`,
    profileId: raw.profileId || raw.childId || null,
    dateTime: raw.dateTime || raw.date || new Date().toISOString(),
    temperature: typeof raw.temperature === 'number' ? Number(raw.temperature.toFixed(1)) : null,
    medication: typeof raw.medication === 'string' ? raw.medication.trim() : '',
    symptoms: typeof raw.symptoms === 'string' ? raw.symptoms.trim() : '',
    notes: typeof raw.notes === 'string' ? raw.notes.trim() : '',
    createdAt: raw.createdAt || new Date().toISOString(),
    deletedAt: raw.deletedAt || null,
  };
}
