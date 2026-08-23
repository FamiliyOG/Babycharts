/**
 * src/utils/api.js
 * API client for BabyCharts supporting JWT auth, families, and profiles.
 */

const BASE = '/api';

function getAuthHeader() {
  const token = localStorage.getItem('babycharts_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function safeFetch(url, options = {}) {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...options.headers,
    };

    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      // Optional: notify or let caller handle unauthorized
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      return { ok: false, status: res.status, error: errorData?.error || 'Request failed' };
    }

    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ── Auth Endpoints ──────────────────────────────────────────────────────────

export async function loginUser(email, password, totpCode = '') {
  const res = await safeFetch(`${BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password, totpCode }),
  });
  if (res.ok && res.data?.token) {
    localStorage.setItem('babycharts_token', res.data.token);
  }
  return res;
}

export async function setup2FA() {
  return safeFetch(`${BASE}/auth/2fa/setup`, {
    method: 'POST',
  });
}

export async function verify2FA(totpCode) {
  return safeFetch(`${BASE}/auth/2fa/verify`, {
    method: 'POST',
    body: JSON.stringify({ totpCode }),
  });
}

export async function disable2FA(password) {
  return safeFetch(`${BASE}/auth/2fa/disable`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export async function registerUser({ name, email, password, familyName, inviteCode }) {
  const res = await safeFetch(`${BASE}/auth/register`, {
    method: 'POST',
    body: JSON.stringify({ name, email, password, familyName, inviteCode }),
  });
  if (res.ok && res.data?.token) {
    localStorage.setItem('babycharts_token', res.data.token);
  }
  return res;
}

export async function getMe(familyId = null) {
  const url = familyId ? `${BASE}/auth/me?familyId=${familyId}` : `${BASE}/auth/me`;
  return safeFetch(url);
}

export async function updateMe(updates) {
  return safeFetch(`${BASE}/auth/me`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export function logoutUser() {
  localStorage.removeItem('babycharts_token');
}

// ── Families Endpoints ──────────────────────────────────────────────────────

export async function fetchFamilyDetails(familyId) {
  return safeFetch(`${BASE}/families/${familyId}`);
}

export async function createFamily(name) {
  return safeFetch(`${BASE}/families`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function updateFamily(familyId, updates) {
  const payload = typeof updates === 'string' ? { name: updates } : updates;
  return safeFetch(`${BASE}/families/${familyId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function createFamilyInvite(familyId, role = 'editor') {
  return safeFetch(`${BASE}/families/${familyId}/invites`, {
    method: 'POST',
    body: JSON.stringify({ role }),
  });
}

export async function joinFamilyWithCode(code) {
  return safeFetch(`${BASE}/families/join`, {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function deleteFamilyInvite(familyId, code) {
  return safeFetch(`${BASE}/families/${familyId}/invites/${encodeURIComponent(code)}`, {
    method: 'DELETE',
  });
}

export async function removeFamilyMember(familyId, userId) {
  return safeFetch(`${BASE}/families/${familyId}/members/${userId}`, {
    method: 'DELETE',
  });
}

export async function deleteFamily(familyId) {
  return safeFetch(`${BASE}/families/${familyId}`, {
    method: 'DELETE',
  });
}

// ── Profiles ─────────────────────────────────────────────────────────────────

export async function fetchProfiles(familyId = null) {
  const url = familyId ? `${BASE}/profiles?familyId=${familyId}` : `${BASE}/profiles`;
  const res = await safeFetch(url);
  return res.ok ? res.data : [];
}

export async function fetchProfile(id) {
  const res = await safeFetch(`${BASE}/profiles/${id}`);
  return res.ok ? res.data : null;
}

export async function createProfile(profile) {
  const res = await safeFetch(`${BASE}/profiles`, {
    method: 'POST',
    body: JSON.stringify(profile),
  });
  return res.ok ? res.data : null;
}

export async function updateProfile(id, profile) {
  const res = await safeFetch(`${BASE}/profiles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(profile),
  });
  return res.ok ? res.data : null;
}

export async function deleteProfile(id) {
  const res = await safeFetch(`${BASE}/profiles/${id}`, { method: 'DELETE' });
  return res.ok;
}

export async function importProfiles(profiles, familyId = null) {
  const res = await safeFetch(`${BASE}/profiles/import`, {
    method: 'POST',
    body: JSON.stringify({ profiles, familyId }),
  });
  return res.ok ? res.data : null;
}

// ── Settings & Exports ───────────────────────────────────────────────────────

export async function fetchSettings() {
  const res = await safeFetch(`${BASE}/settings`);
  return res.ok ? res.data : null;
}

export async function saveSettings(settings) {
  const res = await safeFetch(`${BASE}/settings`, {
    method: 'POST',
    body: JSON.stringify(settings),
  });
  return res.ok ? res.data : null;
}

export async function fetchExportList() {
  const res = await safeFetch(`${BASE}/exports`);
  return res.ok ? res.data : [];
}

export function getExportDownloadUrl(filename) {
  return `${BASE}/exports/download?file=${encodeURIComponent(filename)}`;
}

export async function deleteExportFile(filename) {
  const res = await safeFetch(`${BASE}/exports/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
  });
  return res.ok;
}

// ── Forward Frontend Errors to Server Console ────────────────────────────────
export function logClientError(message, error = null, context = null) {
  try {
    fetch(`${BASE}/client-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: typeof message === 'string' ? message : message?.message || 'Unknown Error',
        stack: error?.stack || (message instanceof Error ? message.stack : null),
        context,
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {});
  } catch {
    // ignore
  }
}
