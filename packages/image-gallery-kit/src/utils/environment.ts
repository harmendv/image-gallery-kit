export const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

export function prefersReducedMotion() {
  return isBrowser && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}
