/**
 * The scale the 4-step preview is drawn at: the study room's width (560px)
 * fitted into the rail. Pure, for the Node test runner.
 *
 * The rail scrolls on its own. When the scaled content grew taller than the
 * rail a scrollbar appeared, the rail got 15px narrower, the card shrank, the
 * content fit again, the scrollbar left, the rail widened and the card grew
 * back: a loop that showed as the whole column flickering (owner 2026-11-28,
 * reproduced at a window height of 913px). The rail now reserves the
 * scrollbar's room (scrollbar-gutter: stable), and the scale only moves when
 * the width changed enough to matter, so a few pixels can never restart it.
 */
export const STUDY_WIDTH = 560;

/** A change of the fitted scale smaller than this is ignored. */
export const SCALE_STEP = 0.02;

export function nextScale(previous: number, width: number, studyWidth = STUDY_WIDTH): number {
  if (!Number.isFinite(width) || width <= 0) return previous;
  const target = Math.min(1, width / studyWidth);
  return Math.abs(target - previous) > SCALE_STEP ? target : previous;
}
