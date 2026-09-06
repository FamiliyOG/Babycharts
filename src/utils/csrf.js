/**
 * src/utils/csrf.js
 * Reads CSRF token from document.cookie for inclusion in mutating API requests (Issue #258).
 */

export function getCsrfToken() {
  if (typeof document === 'undefined' || !document.cookie) {
    return null;
  }
  const match = /(?:^|;\s*)babycharts_csrf=([^;]+)/.exec(document.cookie);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}
