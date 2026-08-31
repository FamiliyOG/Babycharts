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
 * Validates and resolves API endpoint path safely against injection attacks (SonarQube jssecurity:S8476).
 * Only allows clean alphanumeric path segments with dashes, underscores, and forward slashes.
 */
function validateAndResolveEndpoint(endpoint) {
  if (typeof endpoint !== 'string' || !endpoint.trim()) {
    throw new TypeError('Ungültiger API-Endpunkt.');
  }

  // Strip origin, protocol, leading slashes or 'api/' prefix
  let clean = endpoint
    .replace(/^[a-zA-Z][a-zA-Z\d+.-]*:\/\/[^/]+/g, '')
    .replace(/^(\/\/|\/)/g, '')
    .replace(/^api\//, '');

  // Strip query string if embedded in endpoint string (will be reconstructed safely)
  const queryIndex = clean.indexOf('?');
  let embeddedQuery = '';
  if (queryIndex !== -1) {
    embeddedQuery = clean.slice(queryIndex + 1);
    clean = clean.slice(0, queryIndex);
  }

  // Validate each path segment against strict regex whitelist [a-zA-Z0-9_-]
  const segments = clean
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    throw new Error('Ungültiger oder unsicherer API-Pfad.');
  }

  const safeSegments = [];
  for (const segment of segments) {
    if (segment === '.' || segment === '..') {
      throw new Error('Pfadtraversierung ist nicht erlaubt.');
    }
    // Allow only safe URL path characters
    const safeSegment = encodeURIComponent(decodeURIComponent(segment));
    safeSegments.push(safeSegment);
  }

  return {
    pathname: `/api/${safeSegments.join('/')}`,
    embeddedQuery,
  };
}

function buildApiUrl(endpoint, params) {
  const { pathname, embeddedQuery } = validateAndResolveEndpoint(endpoint);
  const searchParams = new URLSearchParams(embeddedQuery);

  if (params && typeof params === 'object') {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
  }

  const queryString = searchParams.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
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
