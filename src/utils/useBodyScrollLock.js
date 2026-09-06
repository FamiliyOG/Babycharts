import { useEffect } from 'react';

let lockCount = 0;
let originalBodyOverflow = '';
let originalHtmlOverflow = '';
let originalBodyOverscroll = '';
let originalHtmlOverscroll = '';

/**
 * Checks if an element or any of its ancestors inside the modal is currently scrollable.
 */
function findScrollableParent(el) {
  let current = el;
  while (current && current !== document.body && current !== document.documentElement) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll') {
      if (current.scrollHeight > current.clientHeight) {
        return current;
      }
      if (current.scrollHeight === 0 && current.clientHeight === 0) {
        return current;
      }
    }
    current = current.parentElement;
  }
  return null;
}

/**
 * Global wheel handler when any modal is open:
 * If the user scrolls outside a scrollable modal container (e.g. on backdrop or background),
 * block the wheel event completely so the background cannot scroll.
 */
function handleLockedWheel(e) {
  const scrollableParent = findScrollableParent(e.target);

  if (!scrollableParent) {
    // Mouse is not over any scrollable modal container -> prevent scroll
    e.preventDefault();
    return;
  }

  // Prevent scroll-chaining to background when hitting scroll boundaries inside modal
  const { scrollTop, scrollHeight, clientHeight } = scrollableParent;
  const isScrollingUp = e.deltaY < 0;
  const isScrollingDown = e.deltaY > 0;

  if (
    (isScrollingUp && scrollTop <= 0) ||
    (isScrollingDown && scrollTop + clientHeight >= scrollHeight - 1)
  ) {
    e.preventDefault();
  }
}

/**
 * Global touchmove handler when any modal is open.
 */
function handleLockedTouchMove(e) {
  const scrollableParent = findScrollableParent(e.target);
  if (!scrollableParent) {
    e.preventDefault();
  }
}

/**
 * Increment lock counter and apply overflow: hidden to both html and body
 */
export function lockBodyScroll() {
  if (typeof document === 'undefined') return;

  lockCount++;
  if (lockCount === 1) {
    originalBodyOverflow = document.body.style.overflow;
    originalHtmlOverflow = document.documentElement.style.overflow;
    originalBodyOverscroll = document.body.style.overscrollBehavior;
    originalHtmlOverscroll = document.documentElement.style.overscrollBehavior;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overscrollBehavior = 'none';

    document.body.classList.add('modal-open');
    document.documentElement.classList.add('modal-open');

    window.addEventListener('wheel', handleLockedWheel, { passive: false });
    window.addEventListener('touchmove', handleLockedTouchMove, { passive: false });
  }
}

/**
 * Decrement lock counter and restore overflow on body and html when all modals closed
 */
export function unlockBodyScroll() {
  if (typeof document === 'undefined') return;

  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = originalBodyOverflow || '';
    document.documentElement.style.overflow = originalHtmlOverflow || '';
    document.body.style.overscrollBehavior = originalBodyOverscroll || '';
    document.documentElement.style.overscrollBehavior = originalHtmlOverscroll || '';

    document.body.classList.remove('modal-open');
    document.documentElement.classList.remove('modal-open');

    window.removeEventListener('wheel', handleLockedWheel);
    window.removeEventListener('touchmove', handleLockedTouchMove);
  }
}

/**
 * Helper to reset lock count (useful for testing or state resets)
 */
export function resetBodyScrollLock() {
  lockCount = 0;
  if (typeof document !== 'undefined') {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    document.body.style.overscrollBehavior = '';
    document.documentElement.style.overscrollBehavior = '';
    document.body.classList.remove('modal-open');
    document.documentElement.classList.remove('modal-open');

    window.removeEventListener('wheel', handleLockedWheel);
    window.removeEventListener('touchmove', handleLockedTouchMove);
  }
}

/**
 * React hook to lock body scrolling when a modal or dialog is open
 * @param {boolean} isOpen
 */
export function useBodyScrollLock(isOpen) {
  useEffect(() => {
    if (!isOpen) return;

    lockBodyScroll();

    return () => {
      unlockBodyScroll();
    };
  }, [isOpen]);
}
