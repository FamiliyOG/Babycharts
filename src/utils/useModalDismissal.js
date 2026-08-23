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

    const handlePointerDown = (e) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target)) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Use capture phase on pointerdown for immediate outside-click dismissal
    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen, onClose]);

  return { dialogRef };
}
