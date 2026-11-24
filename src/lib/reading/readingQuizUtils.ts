export type ReadingQuestionLike = {
  id: number;
  content?: unknown;
};

export type ReadingCorrectAnswer =
  | { available: true; answer: string }
  | { available: false };

function asDisplayString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

export function formatReadingValue(value: unknown, fallback = "(Bỏ trống)") {
  return asDisplayString(value) ?? fallback;
}

/** Resolve only verified answer-key shapes; corrupt content stays unavailable. */
export function resolveReadingCorrectAnswer(content: unknown): ReadingCorrectAnswer {
  if (!content || typeof content !== "object") return { available: false };
  const value = content as Record<string, unknown>;
  const options = value.options;
  const correctIndex = value.correctIndex;

  if (
    Array.isArray(options) &&
    Number.isInteger(correctIndex) &&
    (correctIndex as number) >= 0 &&
    (correctIndex as number) < options.length
  ) {
    const answer = asDisplayString(options[correctIndex as number]);
    if (answer) return { available: true, answer };
    return { available: false };
  }

  const directAnswer = asDisplayString(value.correct) ?? asDisplayString(value.correctAnswer);
  return directAnswer ? { available: true, answer: directAnswer } : { available: false };
}

export function formatReadingExplanation(content: unknown): string | null {
  if (!content || typeof content !== "object") return null;
  const explanation = (content as Record<string, unknown>).explanation;
  const direct = asDisplayString(explanation);
  if (direct) return direct;
  if (!explanation || typeof explanation !== "object") return null;

  const fields = ["vi", "evidence", "keyPhrase", "vocabularyNote"]
    .map((key) => asDisplayString((explanation as Record<string, unknown>)[key]))
    .filter((value): value is string => Boolean(value));
  return fields.length > 0 ? fields.join("\n") : null;
}

export function getUnansweredQuestionIndexes(
  questions: ReadingQuestionLike[],
  answers: Record<number, string>,
): number[] {
  return questions.reduce<number[]>((missing, question, index) => {
    const answer = answers[question.id];
    if (typeof answer !== "string" || answer.trim().length === 0) missing.push(index);
    return missing;
  }, []);
}

/** Pause after a choice before the next question opens, so the pick is seen. */
export const READING_AUTO_ADVANCE_MS = 350;

/**
 * The question to open after the learner picks an answer (owner 2026-11-24):
 * the next one, or null on the last question, where "Nộp bài" stays.
 */
export function readingStepAfterAnswer(step: number, total: number): number | null {
  return step < total - 1 ? step + 1 : null;
}
