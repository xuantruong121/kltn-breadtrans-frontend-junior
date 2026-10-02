/**
 * Grammar workspace navigation and layout utility functions.
 * Pure helpers shared between production components and invariant tests.
 */

/**
 * Calculates next question index, defensively clamped to valid range [0, total - 1].
 */
export function getNextIndex(current: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(current + 1, total - 1));
}

/**
 * Calculates previous question index, defensively clamped to minimum 0.
 */
export function getPrevIndex(current: number): number {
  return Math.max(current - 1, 0);
}

/**
 * Determines if the Grammar workspace has unsaved answers (dirty state).
 * Progress is dirty if learner selected at least one answer and submission has not completed.
 * After submission (result !== null), state is review mode and no longer dirty.
 */
export function isGrammarDirty(answeredCount: number, hasResult: boolean): boolean {
  return answeredCount > 0 && !hasResult;
}

/**
 * Responsive layout constants for Grammar 3-pane workspace.
 */
export const GRAMMAR_LAYOUT_CLASSES = {
  leftPane: "hidden lg:flex lg:w-60 xl:w-72 2xl:w-80 shrink-0 flex-col",
  rightPane: "hidden md:flex md:w-80 lg:w-80 xl:w-96 2xl:w-[420px] shrink-0 flex-col",
  centerOuterPadding: "px-4 sm:px-6 lg:px-8",
  questionCardPadding: "p-6 sm:p-8 lg:p-8",
} as const;

/**
 * Pixel dimensions for layout panes across breakpoints.
 */
export const BREAKPOINT_PANE_WIDTHS = {
  768: { left: 0, right: 320 },     // md: left hidden, right md:w-80 (320px)
  1024: { left: 240, right: 320 },   // lg: left lg:w-60 (240px), right lg:w-80 (320px)
  1280: { left: 288, right: 384 },   // xl: left xl:w-72 (288px), right xl:w-96 (384px)
  1440: { left: 320, right: 420 },   // 2xl: left 2xl:w-80 (320px), right 2xl:w-[420px] (420px)
  1920: { left: 320, right: 420 },   // max widths capped at 2xl
} as const;

export type SupportedBreakpoint = keyof typeof BREAKPOINT_PANE_WIDTHS;

/**
 * Computes raw center width available between left and right side panes.
 */
export function computeRawCenterWidth(viewportWidth: SupportedBreakpoint): number {
  const panes = BREAKPOINT_PANE_WIDTHS[viewportWidth];
  return viewportWidth - (panes.left + panes.right);
}

/**
 * Computes usable interior question card width (after outer padding and card padding).
 * outer padding at lg+ = 32px * 2 = 64px
 * card padding at lg+ = 32px * 2 = 64px
 * total padding = 128px
 */
export function computeUsableCardWidth(viewportWidth: SupportedBreakpoint): number {
  const rawCenter = computeRawCenterWidth(viewportWidth);
  const totalPadding = viewportWidth >= 1024 ? 128 : 96; // px-6*2 + p-6*2 = 96 at tablet
  return rawCenter - totalPadding;
}
