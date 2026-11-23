"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const list = window.matchMedia(QUERY);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

/** Whether the visitor asks for reduced motion right now; for effects and event handlers. */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia(QUERY).matches;
}

/**
 * The landing's reduced-motion flag for rendering. Framer's useReducedMotion()
 * is null on the server but true on the first client render of a
 * reduced-motion visitor, so the hydrated inline styles differ from the server
 * HTML and React logs a hydration mismatch. This hook is false on the server
 * and while hydrating, then renders again with the real value. Until then the
 * guard in landing.css pins every `data-reveal` element to its final state.
 *
 * An effect that runs in the hydration commit sees `false` here; read
 * prefersReducedMotion() there instead.
 */
export function useLandingReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => false);
}
