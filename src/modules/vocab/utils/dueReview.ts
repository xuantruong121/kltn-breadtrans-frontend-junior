/**
 * The due-word review of a deck (owner 2026-11-27): the room asks only the
 * words whose review time has come, and asks before it shows anything. A
 * review that first showed the answer would grade every word as remembered.
 * The other words of the deck stay as the wrong answers of the quiz.
 */
export type ReviewStage = "QUIZ" | "TYPING";

/** A due word is asked by the quiz, then by the typing; no card, no speaking. */
export const REVIEW_STAGES: readonly ReviewStage[] = ["QUIZ", "TYPING"];

export function dueWordsOf<T extends { isDue?: boolean }>(words: readonly T[]): T[] {
  return words.filter((word) => word.isDue === true);
}

export function dueReviewHref(topicId: number): string {
  return `/flashcard/${topicId}?due=1`;
}

export interface DueDeck {
  id: number;
  title: string;
  dueCount: number;
}

/** The deck to review next: the one with the most due words, then the lower id. */
export function nextDueDeck(
  topics: ReadonlyArray<{ id: number; title: string; dueCount?: number | null }>,
  currentId: number,
): DueDeck | null {
  const open = topics
    .map((t) => ({ id: t.id, title: t.title, dueCount: Math.max(0, Math.floor(t.dueCount ?? 0)) }))
    .filter((t) => t.id !== currentId && t.dueCount > 0)
    .sort((a, b) => b.dueCount - a.dueCount || a.id - b.id);
  return open[0] ?? null;
}

/** The heading of the screen that ends a review, or opens on a deck with nothing due. */
/** `left`: due words that left the session still to relearn (see relearnLimit in wordVerdict). */
export function dueDoneHeading(done: number, left: number = 0): string {
  if (done > 0) return `Đã ôn xong ${done} từ đến hạn`;
  return left > 0 ? "Phiên ôn đã kết thúc" : "Bộ này chưa có từ nào đến hạn";
}

export function dueDoneBody(done: number, topicTitle: string, left: number = 0): string {
  if (done > 0) return `Bộ ${topicTitle}. Mỗi từ đã có lịch ôn mới theo kết quả vừa rồi.`;
  return left > 0 ? `Bộ ${topicTitle}.` : `Bộ ${topicTitle}. Từ sẽ có ở đây khi đến lịch ôn.`;
}

/** The words not remembered in this review; null when there are none. */
export function dueLeftLine(left: number): string | null {
  return left > 0 ? `${left} từ chưa nhớ, hệ thống sẽ nhắc lại sau 10 phút.` : null;
}

export function nextDeckLabel(deck: DueDeck): string {
  return `Ôn tiếp ${deck.dueCount} từ của bộ ${deck.title}`;
}

/** "Chế độ 1/2": where a step stands among the steps this word goes through. */
export function stageCounter<T extends string>(
  mode: T,
  stages: readonly T[],
): { step: number; total: number } {
  const at = stages.indexOf(mode);
  return { step: at === -1 ? 1 : at + 1, total: stages.length };
}
