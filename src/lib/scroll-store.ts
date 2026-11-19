/**
 * Mutable, render-free scroll + pointer store shared between the smooth
 * scroller (Lenis), the fixed WebGL scene and DOM effects.
 * Values are written every frame — never put this in React state.
 */
export const scrollStore = {
  /** 0 → 1 across the whole document */
  progress: 0,
  /** smoothed scroll velocity (px / frame, signed) */
  velocity: 0,
  /** raw scrollY */
  scrollY: 0,
  /** pointer in normalized device coords (-1 → 1) */
  pointerX: 0,
  pointerY: 0,
};

type LenisLike = {
  scrollTo: (target: string | number | HTMLElement, opts?: Record<string, unknown>) => void;
};

/** Smoothly scroll to an element id using Lenis when available. */
export function scrollToId(id: string, reduced = false) {
  const el = typeof document !== "undefined" ? document.getElementById(id) : null;
  if (!el) return;
  const lenis = (window as unknown as { __lenis?: LenisLike }).__lenis;
  if (lenis && !reduced) {
    lenis.scrollTo(el, { offset: -10, duration: 1.6 });
  } else {
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  }
}
