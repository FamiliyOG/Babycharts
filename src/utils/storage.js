const STORAGE_KEY_PROFILES = 'babycharts_profiles_v1';
const STORAGE_KEY_ACTIVE_CHILD = 'babycharts_active_child_id_v1';
const STORAGE_KEY_SETTINGS = 'babycharts_settings_v1';

/**
 * Loads all child profiles from localStorage scoped by familyId
 */
export function getStoredProfiles(familyId = 'default') {
  try {
    const key = familyId ? `${STORAGE_KEY_PROFILES}_${familyId}` : STORAGE_KEY_PROFILES;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading profiles from localStorage:', err);
    return null;
  }
}

export function saveStoredProfiles(profiles, familyId = 'default') {
  try {
    const key = familyId ? `${STORAGE_KEY_PROFILES}_${familyId}` : STORAGE_KEY_PROFILES;
    localStorage.setItem(key, JSON.stringify(profiles));
  } catch (err) {
    console.error('Error saving profiles to localStorage:', err);
  }
}

export function getActiveChildId(familyId = 'default') {
  try {
    const key = familyId ? `${STORAGE_KEY_ACTIVE_CHILD}_${familyId}` : STORAGE_KEY_ACTIVE_CHILD;
    return localStorage.getItem(key) || null;
  } catch {
    return null;
  }
}

export function saveActiveChildId(childId, familyId = 'default') {
  try {
    const key = familyId ? `${STORAGE_KEY_ACTIVE_CHILD}_${familyId}` : STORAGE_KEY_ACTIVE_CHILD;
    if (childId) {
      localStorage.setItem(key, childId);
    } else {
      localStorage.removeItem(key);
    }
  } catch (err) {
    console.error('Error setting active child:', err);
  }
}

export function clearFamilyStoredData() {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (
        k &&
        (k.startsWith(STORAGE_KEY_PROFILES) ||
          k.startsWith(STORAGE_KEY_ACTIVE_CHILD) ||
          k.startsWith('babycharts_cached_'))
      ) {
        keysToRemove.push(k);
      }
    }
    for (const k of keysToRemove) {
      localStorage.removeItem(k);
    }
  } catch (err) {
    console.error('Error clearing stored family data:', err);
  }
}

export function getAppSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveAppSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error('Error saving settings:', err);
  }
}
