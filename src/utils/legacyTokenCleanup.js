/**
 * src/utils/legacyTokenCleanup.js
 * Automatically migrates existing users from legacy localStorage JWT storage (Issue #256).
 * Removes any remnant 'babycharts_token' from browser storage to ensure all future requests
 * authenticate exclusively via secure HttpOnly session cookies.
 */

export function cleanupLegacyTokens() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    const legacyToken = window.localStorage.getItem('babycharts_token');
    if (legacyToken) {
      window.localStorage.removeItem('babycharts_token');
      return true;
    }
  } catch (err) {
    // Non-blocking storage access error (e.g. strict private browsing mode)
    console.debug('[Auth] Legacy token cleanup skipped:', err);
  }

  return false;
}
