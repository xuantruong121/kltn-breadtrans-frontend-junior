/**
 * Whether the Arena music bar starts folded when the learner has not chosen:
 * on a phone held upright (narrow), and on a phone held sideways (short), where
 * the open bar covered the game cards (mobile check 2026-11-26).
 */
export function dockStartsFolded(width: number, height: number): boolean {
  return width < 640 || height < 520;
}
