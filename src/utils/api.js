import { apiClient, ApiError, setAuthToken, clearAuthToken } from '../api/client.js';

const BASE = '/api';

async function safeFetch(url, options = {}) {
  const result = await apiClient(url, options);
  return result;
}

// ── Auth Endpoints ──────────────────────────────────────────────────────────

function handleAuthTokenResponse(res) {
  if (res.ok && res.data?.token && typeof res.data.token === 'string') {
    setAuthToken(res.data.token);
  }
  return res;
}

export async function loginUser(email, password, totpCode = '') {
  const res = await safeFetch(`${BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password, totpCode }),
  });
  return handleAuthTokenResponse(res);
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

export async function forgotPassword(email) {
  return safeFetch(`${BASE}/auth/forgot-password`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token, newPassword) {
  return safeFetch(`${BASE}/auth/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  });
}

// ── Instance Settings Endpoints ─────────────────────────────────────────────

export async function getAppSettings() {
  return safeFetch(`${BASE}/settings`, {
    method: 'GET',
  });
}

export async function updateAppSettings(settings) {
  return safeFetch(`${BASE}/settings`, {
    method: 'POST',
    body: JSON.stringify(settings),
  });
}

export async function changePassword(currentPassword, newPassword, logoutAllDevices = true) {
  const res = await safeFetch(`${BASE}/auth/change-password`, {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword, logoutAllDevices }),
  });
  return handleAuthTokenResponse(res);
}

export async function deleteAccount(password) {
  const res = await safeFetch(`${BASE}/auth/account`, {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  });
  if (res.ok) {
    clearAuthToken();
  }
  return res;
}

export async function exportMyData() {
  return safeFetch(`${BASE}/auth/export-my-data`);
}

export async function registerUser({ name, email, password, familyName, inviteCode }) {
  const res = await safeFetch(`${BASE}/auth/register`, {
    method: 'POST',
    body: JSON.stringify({ name, email, password, familyName, inviteCode }),
  });
  return handleAuthTokenResponse(res);
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

export async function logoutUser() {
  try {
    await safeFetch(`${BASE}/auth/logout`, { method: 'POST' });
  } catch {
    // Ignore network error on logout
  }
  clearAuthToken();
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

export async function createFamilyInvite(
  familyId,
  role = 'editor',
  expiresInHours = 48,
  maxUses = 1
) {
  return safeFetch(`${BASE}/families/${familyId}/invites`, {
    method: 'POST',
    body: JSON.stringify({ role, expiresInHours, maxUses }),
  });
}

export async function transferFamilyOwnership(familyId, newOwnerId) {
  return safeFetch(`${BASE}/families/${familyId}/transfer-ownership`, {
    method: 'POST',
    body: JSON.stringify({ newOwnerId }),
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

export async function updateFamilyMemberRole(familyId, userId, role) {
  return safeFetch(`${BASE}/families/${familyId}/members/${userId}`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });
}

export async function removeFamilyMember(familyId, userId) {
  return safeFetch(`${BASE}/families/${familyId}/members/${userId}`, {
    method: 'DELETE',
  });
}

export async function leaveFamily(familyId) {
  return safeFetch(`${BASE}/families/${familyId}/leave`, {
    method: 'POST',
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
  if (!res.ok) {
    throw new ApiError(
      res.error || 'Profil konnte nicht erstellt werden.',
      res.status,
      res.code,
      res.details
    );
  }
  return res.data;
}

export async function updateProfile(id, profile) {
  const res = await safeFetch(`${BASE}/profiles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(profile),
  });
  if (!res.ok) {
    throw new ApiError(
      res.error || 'Profil konnte nicht aktualisiert werden.',
      res.status,
      res.code,
      res.details
    );
  }
  return res.data;
}

export async function deleteProfile(id) {
  const res = await safeFetch(`${BASE}/profiles/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    throw new ApiError(
      res.error || 'Profil konnte nicht gelöscht werden.',
      res.status,
      res.code,
      res.details
    );
  }
  return res.ok;
}

export async function importProfiles(profiles, familyId = null) {
  const res = await safeFetch(`${BASE}/profiles/import`, {
    method: 'POST',
    body: JSON.stringify({ profiles, familyId }),
  });
  if (!res.ok) {
    throw new ApiError(
      res.error || 'Profile konnten nicht importiert werden.',
      res.status,
      res.code,
      res.details
    );
  }
  return res.data;
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

export async function uploadEncryptedMedia(dataUrl, familyId = null, filename = '') {
  const res = await safeFetch(`${BASE}/media/upload`, {
    method: 'POST',
    body: JSON.stringify({ dataUrl, familyId, filename }),
  });
  return res.ok && res.data?.url ? res.data.url : null;
}

export function sanitizeMediaUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // Safe raster image base64 data URLs
  if (/^data:image\/(?:png|jpeg|jpg|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(trimmed)) {
    return trimmed;
  }

  // Safe raw media ID
  if (/^med-[a-zA-Z0-9-]+$/.test(trimmed)) {
    return `/api/media/${encodeURIComponent(trimmed)}`;
  }

  // Safe root-relative API media paths
  if (/^\/api\/media\/med-[a-zA-Z0-9-]+$/.test(trimmed)) {
    return trimmed;
  }

  // Safe root-relative media paths without leading slash
  if (/^api\/media\/med-[a-zA-Z0-9-]+$/.test(trimmed)) {
    return `/${trimmed}`;
  }

  // Safe HTTPS URLs
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.href;
    }
  } catch {
    return '';
  }

  return '';
}

export function getAuthorizedMediaUrl(url) {
  const safeUrl = sanitizeMediaUrl(url);
  if (!safeUrl) return '';
  if (safeUrl.startsWith('data:')) return safeUrl;

  if (!safeUrl.startsWith('/api/media/')) return safeUrl;

  const token = localStorage.getItem('babycharts_token');
  if (!token) return safeUrl;

  const separator = safeUrl.includes('?') ? '&' : '?';
  return `${safeUrl}${separator}token=${encodeURIComponent(token)}`;
}

// ── Active Sessions & Audit Log (Issue #248, #249) ───────────────────────────
export async function fetchSessions() {
  const res = await safeFetch(`${BASE}/auth/sessions`);
  return res.ok ? res.data?.sessions || [] : [];
}

export async function revokeSessionApi(sessionId) {
  const res = await safeFetch(`${BASE}/auth/sessions/${sessionId}`, {
    method: 'DELETE',
  });
  return res.ok;
}

export async function revokeAllOtherSessionsApi() {
  const res = await safeFetch(`${BASE}/auth/sessions`, {
    method: 'DELETE',
  });
  return res.ok;
}

export async function fetchFamilyAuditLogs(familyId) {
  if (!familyId) return [];
  const res = await safeFetch(`${BASE}/families/${familyId}/audit-log`);
  return res.ok ? res.data?.logs || [] : [];
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
