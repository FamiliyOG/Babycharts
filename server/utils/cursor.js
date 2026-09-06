/**
 * server/utils/cursor.js
 *
 * Secure, opaque, tampering-resistant cursor encoding and decoding for Keyset Pagination (BC-297).
 * Cursors are serialized as Base64-encoded JSON with scope binding to prevent
 * cross-family, cross-profile or cross-filter reuse.
 */

/**
 * Creates an opaque base64-encoded cursor token.
 *
 * @param {object} payload
 * @param {string|number} payload.id - Stable tie-breaker ID
 * @param {string|number} payload.sortValue - Primary sort value (e.g. ISO timestamp or date)
 * @param {string} [payload.scope] - Context string (e.g. `family:fam-123` or `profile:prof-456`)
 * @returns {string} base64-encoded cursor string
 */
export function encodeCursor({ id, sortValue, scope = '' }) {
  if (id === undefined || id === null || sortValue === undefined || sortValue === null) {
    throw new Error('encodeCursor requires id and sortValue');
  }

  const raw = JSON.stringify({
    i: String(id),
    s: String(sortValue),
    c: String(scope || ''),
    t: Date.now(),
  });

  return Buffer.from(raw, 'utf8').toString('base64url');
}

/**
 * Decodes and validates an opaque cursor token.
 *
 * @param {string} cursorStr - Base64url cursor string
 * @param {string} [expectedScope] - Optional expected scope to prevent token hijacking
 * @returns {{ id: string, sortValue: string, scope: string, timestamp: number }} Decoded cursor
 */
export function decodeCursor(cursorStr, expectedScope = null) {
  if (!cursorStr || typeof cursorStr !== 'string') {
    throw new Error('Ungültiger Cursor: Parameter fehlt oder ist kein String.');
  }

  let parsed;
  try {
    const jsonStr = Buffer.from(cursorStr, 'base64url').toString('utf8');
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error('Ungültiger Cursor: Format konnte nicht dekodiert werden.');
  }

  if (!parsed || typeof parsed !== 'object' || !parsed.i || parsed.s === undefined) {
    throw new Error('Ungültiger Cursor: Erforderliche Felder fehlen.');
  }

  if (expectedScope && parsed.c !== expectedScope) {
    throw new Error('Ungültiger Cursor: Cursor gehört nicht zum aktuellen Abfrage-Kontext.');
  }

  return {
    id: parsed.i,
    sortValue: parsed.s,
    scope: parsed.c,
    timestamp: parsed.t,
  };
}

/**
 * Standard pagination helper to slice a dataset and build cursor metadata.
 *
 * @template T
 * @param {T[]} items - Fetched items (queried with limit + 1)
 * @param {number} limit - Requested limit
 * @param {(item: T) => { id: string|number, sortValue: string|number }} extractKeys
 * @param {string} [scope]
 * @returns {{ items: T[], nextCursor: string|null, hasMore: boolean, limit: number }}
 */
export function buildPaginatedResponse(items, limit, extractKeys, scope = '') {
  const hasMore = items.length > limit;
  const paginatedItems = hasMore ? items.slice(0, limit) : items;

  let nextCursor = null;
  if (hasMore && paginatedItems.length > 0) {
    const lastItem = paginatedItems.at(-1);
    const { id, sortValue } = extractKeys(lastItem);
    nextCursor = encodeCursor({ id, sortValue, scope });
  }

  return {
    items: paginatedItems,
    nextCursor,
    hasMore,
    limit,
  };
}
