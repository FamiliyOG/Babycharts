/**
 * src/api/client.js
 * Centralized, typed API Client for BabyCharts (BC-126).
 * Handles authentication headers, request sanitization, response parsing, and standard error handling.
 */

const BASE_URL = '/api';

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
 * Universal request wrapper for internal API endpoints.
 *
 * @param {string} endpoint - Relative path (e.g. '/profiles' or '/auth/me')
 * @param {RequestInit & { params?: Record<string, string|number|boolean> }} options
 * @returns {Promise<{ ok: boolean, data?: any, error?: string, status?: number, code?: string }>}
 */
export async function apiClient(endpoint, options = {}) {
  try {
    let url = endpoint.startsWith('/api')
      ? endpoint
      : `${BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    // Append query params if provided
    if (options.params) {
      const searchParams = new URLSearchParams();
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
      }
    }

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

    const response = await fetch(url, fetchOptions);

    if (response.status === 401) {
      // Trigger event or let caller decide on session expiration
      window.dispatchEvent(new CustomEvent('babycharts:unauthorized'));
    }

    let responseData = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json().catch(() => null);
    } else {
      const text = await response.text().catch(() => '');
      try {
        responseData = JSON.parse(text);
      } catch {
        responseData = text;
      }
    }

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
