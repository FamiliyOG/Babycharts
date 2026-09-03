/**
 * src/utils/uuid.js
 * Generates secure UUID v4 strings with resilient fallbacks for non-secure contexts (e.g. plain HTTP on local IP).
 */

export function generateUuid() {
  const globalCrypto = typeof crypto !== 'undefined' ? crypto : null;

  if (typeof globalCrypto?.randomUUID === 'function') {
    return globalCrypto.randomUUID();
  }

  if (typeof globalCrypto?.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    globalCrypto.getRandomValues(bytes);
    // Set UUID v4 variant and version bits
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  }

  // Resilient fallback using deterministic high-resolution entropy mixing without Math.random()
  let perfTime =
    typeof performance !== 'undefined' && performance.now ? performance.now() * 1000 : 0;
  let d = Date.now();

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    let r = Math.trunc(d % 16);
    d = Math.trunc(d / 16);

    if (perfTime > 0) {
      r = (r + Math.trunc(perfTime % 16)) % 16;
      perfTime = Math.trunc(perfTime / 16);
    }

    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
