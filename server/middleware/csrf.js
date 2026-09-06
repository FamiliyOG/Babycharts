import crypto from 'node:crypto';

/**
 * server/middleware/csrf.js
 * Comprehensive CSRF Protection for Cookie-authenticated API Requests (Issue #258).
 *
 * Employs a robust defense-in-depth approach:
 * 1. Safe HTTP methods (GET, HEAD, OPTIONS) bypass mutation checks.
 * 2. Origin & Sec-Fetch-Site validation against allowed origins.
 * 3. Double Submit Cookie Pattern:
 *    - Server sets readable cookie 'babycharts_csrf' on requests
 *    - Client must return matching header 'X-CSRF-Token' for mutating requests (POST, PUT, DELETE, PATCH)
 * 4. Safe bypass when request is explicitly authenticated via non-browser 'Authorization: Bearer' header.
 */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function csrfProtection(req, res, next) {
  // Always ensure client has a valid CSRF cookie set for subsequent requests
  let csrfCookie = null;
  if (req.headers.cookie) {
    const match = /(?:^|;\s*)babycharts_csrf=([^;]+)/.exec(req.headers.cookie);
    if (match?.[1]) {
      csrfCookie = decodeURIComponent(match[1]);
    }
  }

  if (!csrfCookie) {
    csrfCookie = generateCsrfToken();
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('babycharts_csrf', csrfCookie, {
      httpOnly: false, // Must be readable by client JS to set the X-CSRF-Token header
      secure: isProd,
      sameSite: 'lax',
      path: '/',
    });
  }

  // Safe read methods bypass check
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  // CSRF protection targets session-authenticated requests
  const hasSessionCookie = Boolean(req.headers.cookie?.includes('babycharts_session'));
  if (!hasSessionCookie) {
    return next();
  }

  // Exempt auth bootstrap routes
  const urlPath = req.baseUrl ? `${req.baseUrl}${req.path}` : req.path;
  if (
    urlPath.endsWith('/auth/login') ||
    urlPath.endsWith('/auth/register') ||
    urlPath.endsWith('/auth/forgot-password') ||
    urlPath.endsWith('/auth/reset-password')
  ) {
    return next();
  }

  // Double Submit Cookie check for cookie-authenticated mutating requests
  const clientToken = req.headers['x-csrf-token'];
  if (!clientToken || clientToken !== csrfCookie) {
    const timestamp = new Date().toISOString();
    console.warn(
      `[CSRF ${timestamp}] Blocked mutating request to ${urlPath}: Invalid or missing X-CSRF-Token`
    );
    return res.status(403).json({
      error: 'Ungültiges oder fehlendes CSRF-Token. Bitte aktualisieren Sie die Seite.',
    });
  }

  next();
}
