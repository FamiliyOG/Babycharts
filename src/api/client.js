/**
 * src/api/client.js
 * Centralized, typed API Client for BabyCharts (BC-126).
 * Handles authentication headers, request sanitization, response parsing, and standard error handling.
 */

export class ApiError extends Error {
  constructor(message, status = 500, code = 'API_ERROR', details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function getAuthToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('babycharts_token');
}

export function setAuthToken(token) {
  if (typeof window === 'undefined') return;
  if (!token) {
    localStorage.removeItem('babycharts_token');
    return;
  }
  const cleanToken = String(token).replace(/[^a-zA-Z0-9._-]/g, '');
  localStorage.setItem('babycharts_token', cleanToken);
}

export function clearAuthToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('babycharts_token');
}

/**
 * Validates endpoint against allowed relative paths to prevent CSRF / SSRF (SonarQube jssecurity:S8476).
 */
function validateAndResolveEndpoint(endpoint) {
  if (typeof endpoint !== 'string' || !endpoint.trim()) {
    throw new TypeError('Ungültiger API-Endpunkt.');
  }

  // Strictly sanitize input path
  const sanitized = endpoint
    .replace(/^([a-zA-Z][a-zA-Z\d+.-]*:|\/\/)/g, '')
    .replaceAll('..', '')
    .replace(/^\/?(api\/)?/, '');

  if (!sanitized || /^(\/|\.\.)/.test(sanitized)) {
    throw new Error('Ungültiger oder unsicherer API-Pfad.');
  }

  return `/api/${sanitized}`;
}

function buildApiUrl(endpoint, params) {
  const basePath = validateAndResolveEndpoint(endpoint);

  if (params && typeof params === 'object') {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(encodeURIComponent(key), String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      return `${basePath}?${queryString}`;
    }
  }

  return basePath;
}

async function parseResponseBody(response) {
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return response.json().catch(() => null);
  }

  const text = await response.text().catch(() => '');
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Universal request wrapper for internal API endpoints.
 *
 * @param {string} endpoint - Relative path (e.g. '/profiles' or '/auth/me')
 * @param {RequestInit & { params?: Record<string, string|number|boolean> }} options
 * @returns {Promise<{ ok: boolean, data?: any, error?: string, status?: number, code?: string }>}
 */
export async function apiClient(endpoint, options = {}) {
  try {
    const safeUrl = buildApiUrl(endpoint, options.params);
    const token = getAuthToken();

    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const fetchOptions = {
      credentials: 'same-origin',
      ...options,
      headers,
    };

    const response = await fetch(safeUrl, fetchOptions);

    if (response.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('babycharts:unauthorized'));
    }

    const responseData = await parseResponseBody(response);

    if (!response.ok) {
      const errorMessage =
        (typeof responseData === 'object' && responseData?.error) ||
        `Request failed with status ${response.status}`;
      const errorCode = responseData?.code || `HTTP_${response.status}`;
      return {
        ok: false,
        status: response.status,
        error: errorMessage,
        code: errorCode,
        details: responseData?.details || null,
      };
    }

    return {
      ok: true,
      status: response.status,
      data: responseData,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err.message || 'Netzwerkfehler.',
      code: 'NETWORK_ERROR',
    };
  }
}
