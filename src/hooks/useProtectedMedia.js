import { useState, useEffect } from 'react';
import { sanitizeMediaUrl } from '../utils/api.js';

/**
 * src/hooks/useProtectedMedia.js
 *
 * Safe client-side loader for protected, authenticated media blobs.
 * Prevents memory leaks by automatically revoking object URLs on unmount or URL change (BC-296).
 *
 * @param {string|null} rawUrl - Data URL, media ID, or API URL
 * @param {string} [size] - Optional thumbnail variant: 'sm' | 'md' | 'lg'
 * @returns {{ src: string|null, isLoading: boolean, error: Error|null }}
 */
export function useProtectedMedia(rawUrl, size = null) {
  const [src, setSrc] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!rawUrl || typeof rawUrl !== 'string') {
      // oxlint-disable-next-line react/set-state-in-effect
      setSrc(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const sanitized = sanitizeMediaUrl(rawUrl);
    if (!sanitized) {
      setSrc(null);
      setIsLoading(false);
      return;
    }

    // Direct base64 data URLs don't need blob fetching or cleanup
    if (sanitized.startsWith('data:')) {
      setSrc(sanitized);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    let objectUrl = null;
    setIsLoading(true);
    setError(null);

    const targetUrl = size ? `${sanitized}?size=${encodeURIComponent(size)}` : sanitized;

    fetch(targetUrl, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Media fetch failed with status ${res.status}`);
        }
        return res.blob();
      })
      .then((blob) => {
        if (!isMounted) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('[useProtectedMedia] Failed to load media blob:', err.message);
        setError(err);
        setIsLoading(false);
        // Fallback to direct sanitized url so browser can attempt normal load if permitted
        setSrc(sanitized);
      });

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [rawUrl, size]);

  return { src, isLoading, error };
}
