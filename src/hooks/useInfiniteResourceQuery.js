import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * src/hooks/useInfiniteResourceQuery.js
 *
 * Client-side infinite pagination hook using opaque keyset cursor contracts (BC-297).
 * Accumulates items on `fetchNextPage`, supports pull-to-refresh / reset,
 * and maintains loading / error state without UI glitches.
 *
 * @template T
 * @param {object} options
 * @param {(cursor: string|null) => Promise<{ items: T[], nextCursor: string|null, hasMore: boolean }>} options.queryFn
 * @param {boolean} [options.enabled=true]
 * @param {string|number} [options.dependencyKey] - Key change resets the pagination
 * @returns {{
 *   items: T[],
 *   isLoading: boolean,
 *   isFetchingNextPage: boolean,
 *   hasNextPage: boolean,
 *   fetchNextPage: () => Promise<void>,
 *   refetch: () => Promise<void>,
 *   error: Error|null
 * }}
 */
export function useInfiniteResourceQuery({ queryFn, enabled = true, dependencyKey = '' }) {
  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [error, setError] = useState(null);

  const queryFnRef = useRef(queryFn);
  useEffect(() => {
    queryFnRef.current = queryFn;
  }, [queryFn]);

  const loadInitial = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await queryFnRef.current(null);
      setItems(res?.items || []);
      setNextCursor(res?.nextCursor || null);
      setHasMore(Boolean(res?.hasMore));
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    loadInitial();
  }, [loadInitial, dependencyKey]);

  const fetchNextPage = useCallback(async () => {
    if (!hasMore || !nextCursor || isFetchingNextPage) return;
    setIsFetchingNextPage(true);
    try {
      const res = await queryFnRef.current(nextCursor);
      setItems((prev) => [...prev, ...(res?.items || [])]);
      setNextCursor(res?.nextCursor || null);
      setHasMore(Boolean(res?.hasMore));
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsFetchingNextPage(false);
    }
  }, [hasMore, nextCursor, isFetchingNextPage]);

  return {
    items,
    isLoading,
    isFetchingNextPage,
    hasNextPage: hasMore,
    fetchNextPage,
    refetch: loadInitial,
    error,
  };
}
