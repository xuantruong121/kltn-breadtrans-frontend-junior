/**
 * One grading attempt per submitted text. Pure: no React, no storage access.
 *
 * The server stores one grade per (learner, exercise, clientAttemptId) and
 * returns that stored grade when the same id is sent again. Reusing the id for
 * the same text means a retry after a lost response (refresh, dropped
 * connection, timeout on our side after the server finished) gets the grade
 * that was already saved instead of a second, billed grading. Editing the
 * text starts a new attempt.
 */
export type PendingWritingAttempt = { text: string; id: string };

export function attemptForSubmission(
  pending: PendingWritingAttempt | null,
  text: string,
  newId: () => string,
): PendingWritingAttempt {
  const normalized = text.trim();
  return pending && pending.text === normalized
    ? pending
    : { text: normalized, id: newId() };
}

export function parsePendingAttempt(raw: string | null): PendingWritingAttempt | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PendingWritingAttempt>;
    return typeof value.text === "string" && typeof value.id === "string" && value.id
      ? { text: value.text, id: value.id }
      : null;
  } catch {
    return null;
  }
}
