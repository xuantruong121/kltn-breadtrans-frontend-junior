/**
 * The learner's hard flashcard words in the single-player Arena games (thesis
 * supervisor 2026-11-26): the words the flashcard room graded "Học lại" or
 * "Khó" come back in Pháo Bánh Mì and the free Hầm Bánh Mì. The server picks
 * them; this file only holds the words on screen. Pure.
 */
export type HardTally = { hit: number; total: number };

/** The small label on a block or a question that asks one of them. */
export const HARD_WORD_LABEL = "Từ bạn hay quên";

/**
 * "Trúng 3/4 từ bạn hay quên." (Pháo: blocks broken) or "Đúng 3/4 từ bạn hay
 * quên." (Hầm: right the first time). Null when the game asked none.
 */
export function hardWordsLine(verb: "Trúng" | "Đúng", tally: HardTally | null | undefined): string | null {
  if (!tally || !(tally.total > 0)) return null;
  const hit = Math.max(0, Math.min(tally.hit, tally.total));
  return `${verb} ${hit}/${tally.total} từ bạn hay quên.`;
}
