import { useEffect, useRef } from 'react';

/**
 * Custom React hook to close a modal/menu on:
 * 1. ESC key press
 * 2. Click outside the modal container (backdrop click)
 * 3. Focus trap within modal elements (BC-152)
 *
 * @param {boolean} isOpen
 * @param {() => void} onClose
 * @returns {{ dialogRef: React.RefObject<any> }}
 */
export function useModalDismissal(isOpen, onClose) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    let isReady = false;
    const previouslyFocusedElement = document.activeElement;

    const timer = setTimeout(() => {
      isReady = true;
      if (dialogRef.current) {
        // Focus first interactive element or modal container
        const focusableElements = dialogRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        }
      }
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }

      // Focus trap handler (BC-152, BC-150)
      if (e.key === 'Tab' && dialogRef.current) {
        const focusableElements = Array.from(
          dialogRef.current.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    const handleClickOutside = (e) => {
      if (!isReady) return;
      // If the clicked element is no longer connected to the DOM, ignore
      if (e.target && !e.target.isConnected) return;
      // Only dismiss if the click happened outside dialogRef
      if (dialogRef.current && !dialogRef.current.contains(e.target)) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClickOutside);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClickOutside);
      if (previouslyFocusedElement && previouslyFocusedElement.focus) {
        previouslyFocusedElement.focus();
      }
    };
  }, [isOpen, onClose]);

  return { dialogRef };
}
