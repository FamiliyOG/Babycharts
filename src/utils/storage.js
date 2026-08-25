const STORAGE_KEY_SETTINGS = 'babycharts_settings_v1';

/**
 * Loads all child profiles from localStorage scoped by familyId
 */
export function clearFamilyStoredData() {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (
        k &&
        (k.startsWith('babycharts_profiles_v1') ||
          k.startsWith('babycharts_active_child_id_v1') ||
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
    if (!settings || typeof settings !== 'object') return;
    const cleanJson = JSON.stringify(settings).replace(/[^\x20-\x7E\t\r\n\p{L}\p{N}]/gu, '');
    localStorage.setItem(STORAGE_KEY_SETTINGS, cleanJson);
  } catch (err) {
    console.error('Error saving settings:', err);
  }
}
