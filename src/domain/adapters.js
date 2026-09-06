/**
 * src/domain/adapters.js
 * Domain Boundary Adapters for BabyCharts (Issue #287).
 * Provides seamless bidirectional conversion between storage/API dictionaries,
 * legacy array representations, and canonical domain lists.
 */

import {
  createCanonicalMilestone,
  createCanonicalTooth,
  createCanonicalVaccination,
  createCanonicalUCheckup,
  createCanonicalMeasurement,
  createCanonicalHealthLog,
} from './models.js';

/**
 * Universal helper that safely normalizes an object dictionary or array into an array of entries.
 * @param {unknown} val
 * @returns {Array<{ key: string, data: any }>}
 */
export function toEntryList(val) {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map((item, idx) => {
      const key = item?.key || item?.id || `item-${idx}`;
      return { key, data: item };
    });
  }
  if (typeof val === 'object') {
    return Object.entries(val).map(([key, data]) => ({
      key,
      data: typeof data === 'object' && data !== null ? data : { value: data, date: data },
    }));
  }
  return [];
}

/**
 * Converts profile milestones (dictionary or array) into a canonical, sorted list.
 * @param {unknown} rawMilestones
 * @returns {Array<ReturnType<typeof createCanonicalMilestone>>}
 */
export function toCanonicalMilestonesList(rawMilestones) {
  const entries = toEntryList(rawMilestones);
  const list = entries.map(({ key, data }) => createCanonicalMilestone(key, data));

  return list.sort((a, b) => {
    if (a.date && b.date) return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (a.date) return -1;
    if (b.date) return 1;
    return a.title.localeCompare(b.title);
  });
}

/**
 * Converts profile teeth (dictionary or array) into a canonical list.
 * @param {unknown} rawTeeth
 * @returns {Array<ReturnType<typeof createCanonicalTooth>>}
 */
export function toCanonicalTeethList(rawTeeth) {
  const entries = toEntryList(rawTeeth);
  const list = entries.map(({ key, data }) => createCanonicalTooth(key, data));

  return list.sort((a, b) => {
    if (a.date && b.date) return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (a.date) return -1;
    if (b.date) return 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Converts profile vaccinations (dictionary or array) into a canonical list.
 * @param {unknown} rawVaccinations
 * @returns {Array<ReturnType<typeof createCanonicalVaccination>>}
 */
export function toCanonicalVaccinationsList(rawVaccinations) {
  const entries = toEntryList(rawVaccinations);
  const list = entries.map(({ key, data }) => createCanonicalVaccination(key, data));

  return list.sort((a, b) => {
    if (a.date && b.date) return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (a.date) return -1;
    if (b.date) return 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Converts profile U-Checkups (dictionary or array) into a canonical list.
 * @param {unknown} rawUCheckups
 * @returns {Array<ReturnType<typeof createCanonicalUCheckup>>}
 */
export function toCanonicalUCheckupsList(rawUCheckups) {
  const entries = toEntryList(rawUCheckups);
  const list = entries.map(({ key, data }) => createCanonicalUCheckup(key, data));

  return list.sort((a, b) => {
    if (a.date && b.date) return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (a.date) return -1;
    if (b.date) return 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Normalizes an array of measurements to canonical format.
 * @param {unknown} rawList
 * @returns {Array<ReturnType<typeof createCanonicalMeasurement>>}
 */
export function toCanonicalMeasurementsList(rawList) {
  if (!Array.isArray(rawList)) return [];
  return rawList
    .filter(Boolean)
    .map(createCanonicalMeasurement)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Normalizes an array of health logs to canonical format.
 * @param {unknown} rawList
 * @returns {Array<ReturnType<typeof createCanonicalHealthLog>>}
 */
export function toCanonicalHealthLogsList(rawList) {
  if (!Array.isArray(rawList)) return [];
  return rawList
    .filter(Boolean)
    .map(createCanonicalHealthLog)
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
}

/**
 * Converts a canonical list back to standard SQLite/JSON dictionary format.
 * Preserves existing key-based storage compatibility for SQLite and backup files.
 * @template T
 * @param {Array<T>} canonicalList
 * @returns {Record<string, Omit<T, 'id' | 'key'>>}
 */
export function toDictionaryFormat(canonicalList) {
  if (!Array.isArray(canonicalList)) return {};
  const dict = {};

  for (const item of canonicalList) {
    if (!item) continue;
    const key = item.key || item.id;
    if (!key) continue;

    const rest = { ...item };
    delete rest.id;
    delete rest.key;
    dict[key] = rest;
  }

  return dict;
}
