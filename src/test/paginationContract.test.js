import { describe, it, expect } from 'vitest';
import { encodeCursor, decodeCursor, buildPaginatedResponse } from '../../server/utils/cursor.js';

describe('Cursor-based Pagination Contract (BC-297)', () => {
  it('encodes and decodes valid cursor with id and sortValue', () => {
    const original = { id: 'item-42', sortValue: '2026-09-06T12:00:00Z', scope: 'family:fam-1' };
    const encoded = encodeCursor(original);

    expect(typeof encoded).toBe('string');
    expect(encoded).not.toContain('{'); // Must be opaque base64url

    const decoded = decodeCursor(encoded, 'family:fam-1');
    expect(decoded.id).toBe(original.id);
    expect(decoded.sortValue).toBe(original.sortValue);
    expect(decoded.scope).toBe(original.scope);
    expect(typeof decoded.timestamp).toBe('number');
  });

  it('rejects cursor when missing required fields', () => {
    expect(() => encodeCursor({ id: null, sortValue: 'abc' })).toThrow();
    expect(() => encodeCursor({ id: '123', sortValue: null })).toThrow();
  });

  it('detects and rejects malformed cursor string', () => {
    expect(() => decodeCursor('not-valid-base64-json!')).toThrow(/Ungültiger Cursor/);
    expect(() => decodeCursor('')).toThrow(/Ungültiger Cursor/);
  });

  it('enforces scope binding to prevent cross-context token reuse', () => {
    const cursor = encodeCursor({ id: '10', sortValue: '2026-01-01', scope: 'family:fam-A' });

    // Expecting fam-B must reject cursor from fam-A
    expect(() => decodeCursor(cursor, 'family:fam-B')).toThrow(
      /Cursor gehört nicht zum aktuellen Abfrage-Kontext/
    );

    // Matching scope succeeds
    const decoded = decodeCursor(cursor, 'family:fam-A');
    expect(decoded.id).toBe('10');
  });

  it('buildPaginatedResponse correctly slices items and generates nextCursor', () => {
    const rawItems = [
      { id: '1', date: '2026-09-03' },
      { id: '2', date: '2026-09-02' },
      { id: '3', date: '2026-09-01' },
    ];

    const result = buildPaginatedResponse(
      rawItems,
      2,
      (item) => ({ id: item.id, sortValue: item.date }),
      'profile:p1'
    );

    expect(result.items.length).toBe(2);
    expect(result.hasMore).toBe(true);
    expect(typeof result.nextCursor).toBe('string');

    const decoded = decodeCursor(result.nextCursor, 'profile:p1');
    expect(decoded.id).toBe('2');
    expect(decoded.sortValue).toBe('2026-09-02');
  });

  it('buildPaginatedResponse returns hasMore: false and nextCursor: null when no items remain', () => {
    const rawItems = [{ id: '1', date: '2026-09-01' }];

    const result = buildPaginatedResponse(
      rawItems,
      5,
      (item) => ({ id: item.id, sortValue: item.date }),
      'profile:p1'
    );

    expect(result.items.length).toBe(1);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });
});
