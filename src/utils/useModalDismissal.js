import { useEffect, useRef } from 'react';

/**
 * Custom React hook to close a modal/menu on:
 * 1. ESC key press
 * 2. Click outside the modal container (backdrop click)
 *
 * @param {boolean} isOpen
 * @param {() => void} onClose
 * @returns {{ dialogRef: React.RefObject<any> }}
 */
export function useModalDismissal(isOpen, onClose) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    const handleClickOutside = (e) => {
      // Only dismiss if the click happened directly on the backdrop container outside dialogRef
      if (dialogRef.current && !dialogRef.current.contains(e.target)) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Use standard 'click' event instead of global capture pointerdown to prevent unwanted dismissals during app-switch/blur
    document.addEventListener('click', handleClickOutside);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen, onClose]);

  return { dialogRef };
}
