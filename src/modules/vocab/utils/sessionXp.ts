/**
 * Flashcard XP of one study session (owner 2026-11-18): the server pays 2 XP
 * the first time a learner knows a word, 150 a day at most, and reports it as
 * `xpEarned` on each review or mark. Flashcards pay no Bánh mì and move no
 * daily quest, so the completion note says neither.
 */
export function addSessionXp(total: number, reply: unknown): number {
  const xp = (reply as { xpEarned?: unknown } | null | undefined)?.xpEarned;
  return typeof xp === "number" && Number.isFinite(xp) && xp > 0 ? total + xp : total;
}

export function completionXpNote(sessionXp: number): string {
  return sessionXp > 0
    ? `+${sessionXp} XP cho các từ bạn thuộc lần đầu`
    : "Tiến độ học từ của bạn đã được lưu";
}
