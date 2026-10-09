import { createReadingAttemptId } from "./readingAttempt.ts";

export const READING_DRAFT_VERSION = 1 as const;
export const READING_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

export type ReadingDraftV1 = {
  version: typeof READING_DRAFT_VERSION;
  userId: number;
  quizId: number;
  clientAttemptId: string;
  answers: Record<number, string>;
  savedAt: string;
};

export type ReadingDraftQuestion = {
  id: number;
  content?: { options?: unknown } | null;
};

export type ReadingDraftStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

function isUuidV4(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function buildReadingDraftKey(
  userId: number | string,
  quizId: number,
): string {
  return `breadtrans:reading-draft:v1:${String(userId)}:${quizId}`;
}

export function sanitizeReadingAnswers(
  answers: unknown,
  questions: ReadingDraftQuestion[],
): Record<number, string> {
  if (!isRecord(answers)) return {};

  const validQuestions = new Map<number, Set<string>>();
  for (const question of questions) {
    if (!Number.isInteger(question.id)) continue;
    const options = question.content?.options;
    if (!Array.isArray(options)) continue;
    validQuestions.set(
      question.id,
      new Set(
        options.filter((option): option is string => typeof option === "string"),
      ),
    );
  }

  const sanitized: Record<number, string> = {};
  for (const [rawQuestionId, answer] of Object.entries(answers)) {
    const questionId = Number(rawQuestionId);
    const options = validQuestions.get(questionId);
    if (
      !options ||
      typeof answer !== "string" ||
      !options.has(answer)
    ) {
      continue;
    }
    sanitized[questionId] = answer;
  }
  return sanitized;
}

export function parseReadingDraft(
  raw: string | null,
  userId: number,
  quizId: number,
  questions: ReadingDraftQuestion[],
  now = Date.now(),
): ReadingDraftV1 | null {
  if (!raw) return null;

  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value)) return null;
    if (
      value.version !== READING_DRAFT_VERSION ||
      value.userId !== userId ||
      value.quizId !== quizId ||
      !isUuidV4(value.clientAttemptId) ||
      typeof value.savedAt !== "string"
    ) {
      return null;
    }

    const savedAt = Date.parse(value.savedAt);
    if (!Number.isFinite(savedAt) || now - savedAt > READING_DRAFT_TTL_MS) {
      return null;
    }

    return {
      version: READING_DRAFT_VERSION,
      userId,
      quizId,
      clientAttemptId: value.clientAttemptId,
      answers: sanitizeReadingAnswers(value.answers, questions),
      savedAt: new Date(savedAt).toISOString(),
    };
  } catch {
    return null;
  }
}

function getDefaultStorage(): ReadingDraftStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function loadReadingDraft({
  storage = getDefaultStorage(),
  userId,
  quizId,
  questions,
  now,
}: {
  storage?: ReadingDraftStorage | null;
  userId: number;
  quizId: number;
  questions: ReadingDraftQuestion[];
  now?: number;
}): ReadingDraftV1 | null {
  if (!storage) return null;
  const key = buildReadingDraftKey(userId, quizId);
  try {
    const raw = storage.getItem(key);
    const draft = parseReadingDraft(raw, userId, quizId, questions, now);
    if (!draft && raw) storage.removeItem(key);
    return draft;
  } catch {
    return null;
  }
}

export function saveReadingDraft(
  draft: ReadingDraftV1,
  storage: ReadingDraftStorage | null = getDefaultStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(buildReadingDraftKey(draft.userId, draft.quizId), JSON.stringify(draft));
  } catch {
    // localStorage can be unavailable or full; in-memory practice remains valid.
  }
}

export function clearReadingDraft(
  userId: number,
  quizId: number,
  storage: ReadingDraftStorage | null = getDefaultStorage(),
): void {
  if (!storage) return;
  try {
    storage.removeItem(buildReadingDraftKey(userId, quizId));
  } catch {
    // Ignore storage failures; successful submission must still navigate.
  }
}

export function resolveReadingAttemptId(
  draft: ReadingDraftV1 | null,
  createId: () => string = createReadingAttemptId,
): string {
  return draft?.clientAttemptId ?? createId();
}
