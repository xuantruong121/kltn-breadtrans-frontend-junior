/**
 * The landing's entrance motion (spec 6.6): each element rises 24px and fades
 * in once, the next one 75ms after the one before. Only transform and opacity
 * move. With reduced motion the element renders in its final state and never
 * animates.
 *
 * Usage inside a section:
 *   const reduced = Boolean(useReducedMotion());
 *   <motion.h2 {...revealProps(reduced, 0)}>…</motion.h2>
 *   <motion.p {...revealProps(reduced, 1)}>…</motion.p>
 *
 * `data-reveal` marks the element for the guards in landing.css and
 * LandingPage: useReducedMotion() is null on the server, so the server HTML
 * carries the hidden start state even for a reduced-motion visitor, and React
 * does not patch that style on hydration. Under prefers-reduced-motion, and
 * without JavaScript, the guards pin every marked element to its final state.
 */

/** Ease-out (expo-like): quick start, soft landing. */
export const REVEAL_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const REVEAL_DURATION = 0.6;
export const REVEAL_RISE_PX = 24;
export const REVEAL_STEP_MS = 75;

export type RevealProps = {
  initial: false | { opacity: number; y: number };
  whileInView?: { opacity: number; y: number };
  viewport?: { once: true; amount: number };
  transition?: { duration: number; delay: number; ease: [number, number, number, number] };
  "data-reveal": true;
};

export function revealProps(reduced: boolean, delayIndex = 0): RevealProps {
  if (reduced) return { initial: false, "data-reveal": true };
  return {
    initial: { opacity: 0, y: REVEAL_RISE_PX },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.2 },
    transition: {
      duration: REVEAL_DURATION,
      // Whole milliseconds, so index 2 is exactly 0.15.
      delay: Math.round(Math.max(0, delayIndex) * REVEAL_STEP_MS) / 1000,
      ease: REVEAL_EASE,
    },
    "data-reveal": true,
  };
}
