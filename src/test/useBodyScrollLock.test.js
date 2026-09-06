import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useBodyScrollLock,
  lockBodyScroll,
  unlockBodyScroll,
  resetBodyScrollLock,
} from '../utils/useBodyScrollLock.js';

describe('useBodyScrollLock', () => {
  beforeEach(() => {
    resetBodyScrollLock();
  });

  it('locks scroll when isOpen is true and unlocks on unmount', () => {
    const { unmount } = renderHook(({ isOpen }) => useBodyScrollLock(isOpen), {
      initialProps: { isOpen: true },
    });

    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.classList.contains('modal-open')).toBe(true);
    expect(document.documentElement.style.overflow).toBe('hidden');
    expect(document.documentElement.classList.contains('modal-open')).toBe(true);

    unmount();

    expect(document.body.style.overflow).toBe('');
    expect(document.body.classList.contains('modal-open')).toBe(false);
    expect(document.documentElement.style.overflow).toBe('');
    expect(document.documentElement.classList.contains('modal-open')).toBe(false);
  });

  it('handles multiple concurrent modal locks with reference counting', () => {
    const hook1 = renderHook(() => useBodyScrollLock(true));
    const hook2 = renderHook(() => useBodyScrollLock(true));

    expect(document.body.style.overflow).toBe('hidden');
    expect(document.documentElement.style.overflow).toBe('hidden');

    hook1.unmount();
    // hook2 is still active, body must remain locked
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.documentElement.style.overflow).toBe('hidden');
    expect(document.body.classList.contains('modal-open')).toBe(true);

    hook2.unmount();
    // both unmounted, body must be unlocked
    expect(document.body.style.overflow).toBe('');
    expect(document.documentElement.style.overflow).toBe('');
    expect(document.body.classList.contains('modal-open')).toBe(false);
  });

  it('does not lock scroll when isOpen is false', () => {
    renderHook(() => useBodyScrollLock(false));

    expect(document.body.style.overflow).toBe('');
    expect(document.documentElement.style.overflow).toBe('');
    expect(document.body.classList.contains('modal-open')).toBe(false);
  });

  it('directly allows manual lock and unlock calls safely', () => {
    lockBodyScroll();
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.documentElement.style.overflow).toBe('hidden');

    unlockBodyScroll();
    expect(document.body.style.overflow).toBe('');
    expect(document.documentElement.style.overflow).toBe('');

    // Extra unlock should not throw or cause invalid negative count
    unlockBodyScroll();
    expect(document.body.style.overflow).toBe('');
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('prevents wheel event scrolling on non-scrollable backdrop/background', () => {
    lockBodyScroll();

    const backdropEl = document.createElement('div');
    document.body.appendChild(backdropEl);

    const wheelEvent = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 50 });
    backdropEl.dispatchEvent(wheelEvent);

    expect(wheelEvent.defaultPrevented).toBe(true);

    unlockBodyScroll();

    const wheelEventAfter = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 50,
    });
    backdropEl.dispatchEvent(wheelEventAfter);

    expect(wheelEventAfter.defaultPrevented).toBe(false);

    document.body.removeChild(backdropEl);
  });
});
