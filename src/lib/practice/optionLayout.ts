/**
 * How an answer list is laid out (owner 2026-11-19): short options sit in two
 * columns, long ones in one, and the choice follows the width of the question
 * panel, not of the screen. The list must sit inside an element with the
 * `@container` class.
 *
 * Two columns only when the longest option fits its column:
 * - up to 20 characters: from a 20rem panel (the narrow reading side panel);
 * - up to 45 characters (the Entry Diagnostic's old rule): from a 36rem panel;
 * - longer: always one column.
 */
export const SHORT_OPTION_CHARS = 20;
export const LONG_OPTION_CHARS = 45;

export function longestOption(options: readonly (string | null | undefined)[]): number {
  return options.reduce((max, option) => Math.max(max, (option ?? "").trim().length), 0);
}

export function hasLongOption(options: readonly (string | null | undefined)[], limit = LONG_OPTION_CHARS): boolean {
  return longestOption(options) > limit;
}

/** Grid classes for an answer list; add the gap at the call site. */
export function optionGridClass(options: readonly (string | null | undefined)[]): string {
  const longest = longestOption(options);
  if (longest <= SHORT_OPTION_CHARS) return "grid grid-cols-1 @xs:grid-cols-2";
  if (longest <= LONG_OPTION_CHARS) return "grid grid-cols-1 @xl:grid-cols-2";
  return "grid grid-cols-1";
}
