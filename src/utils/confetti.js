/**
 * src/utils/confetti.js
 * Accessible confetti trigger that strictly respects the user's prefers-reduced-motion setting (Issue #244).
 */

import confetti from 'canvas-confetti';

/**
 * Fires celebration confetti only if the user has NOT requested reduced motion.
 *
 * @param {import('canvas-confetti').Options} options - Standard canvas-confetti options
 */
export function fireConfetti(options = {}) {
  if (typeof window === 'undefined') return;

  // Respect system prefers-reduced-motion setting
  const prefersReduced =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReduced) {
    return;
  }

  try {
    confetti({
      disableForReducedMotion: true,
      ...options,
    });
  } catch {
    // Non-critical visual effect failure should never break UI logic
  }
}
