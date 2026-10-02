import assert from "node:assert/strict";
import test from "node:test";
import {
  READING_DRAFT_VERSION,
  READING_DRAFT_TTL_MS,
  buildReadingDraftKey,
  clearReadingDraft,
  loadReadingDraft,
  parseReadingDraft,
  resolveReadingAttemptId,
  saveReadingDraft,
  type ReadingDraftStorage,
  type ReadingDraftV1,
} from "./readingDraft.ts";

function storage(): ReadingDraftStorage & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
  };
}

const questionFixture = [
  { id: 1, content: { options: ["A", "B", "C"] } },
  { id: 2, content: { options: ["C", "D"] } },
  { id: 3, content: { options: ["A", "B"] } },
];

function draft(overrides: Partial<ReadingDraftV1> = {}): ReadingDraftV1 {
  return {
    version: READING_DRAFT_VERSION,
    userId: 7,
    quizId: 24,
    clientAttemptId: "11111111-1111-4111-8111-111111111111",
    answers: { 1: "A", 2: "C" },
    savedAt: new Date(1_700_000_000_000).toISOString(),
    ...overrides,
  };
}

test("save/load keeps valid draft and isolates the user+quiz key", () => {
  const store = storage();
  saveReadingDraft(draft(), store);
  assert.equal(store.values.has(buildReadingDraftKey(7, 24)), true);
  assert.deepEqual(
    loadReadingDraft({
      storage: store,
      userId: 7,
      quizId: 24,
      questions: questionFixture,
      now: 1_700_000_000_000 + 1000,
    })?.answers,
    { 1: "A", 2: "C" },
  );
  assert.equal(
    loadReadingDraft({ storage: store, userId: 8, quizId: 24, questions: questionFixture }),
    null,
  );
  assert.equal(
    loadReadingDraft({ storage: store, userId: 7, quizId: 25, questions: questionFixture }),
    null,
  );
});

test("expired, malformed, unsupported, and invalid UUID drafts are removed safely", () => {
  const store = storage();
  const key = buildReadingDraftKey(7, 24);
  store.values.set(key, "not-json");
  assert.equal(loadReadingDraft({ storage: store, userId: 7, quizId: 24, questions: questionFixture }), null);
  store.values.set(key, JSON.stringify(draft({ savedAt: new Date(0).toISOString() })));
  assert.equal(
    loadReadingDraft({ storage: store, userId: 7, quizId: 24, questions: questionFixture, now: READING_DRAFT_TTL_MS + 1 }),
    null,
  );
  store.values.set(key, JSON.stringify(draft({ version: 2 as unknown as 1 })));
  assert.equal(loadReadingDraft({ storage: store, userId: 7, quizId: 24, questions: questionFixture }), null);
  store.values.set(key, JSON.stringify(draft({ clientAttemptId: "bad" })));
  assert.equal(loadReadingDraft({ storage: store, userId: 7, quizId: 24, questions: questionFixture }), null);
});

test("restores only current valid options and removes stale question IDs", () => {
  const parsed = parseReadingDraft(
    JSON.stringify(draft({ answers: { 1: "A", 2: "B", 999: "C" } })),
    7,
    24,
    questionFixture,
    1_700_000_000_000 + 1000,
  );
  assert.deepEqual(parsed?.answers, { 1: "A" });
});

test("clear removes only the target draft and storage failures never throw", () => {
  const store = storage();
  saveReadingDraft(draft(), store);
  saveReadingDraft(draft({ quizId: 25 }), store);
  clearReadingDraft(7, 24, store);
  assert.equal(store.values.has(buildReadingDraftKey(7, 24)), false);
  assert.equal(store.values.has(buildReadingDraftKey(7, 25)), true);
  const broken: ReadingDraftStorage = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
    removeItem: () => {
      throw new Error("blocked");
    },
  };
  assert.doesNotThrow(() => loadReadingDraft({ storage: broken, userId: 7, quizId: 24, questions: questionFixture }));
  assert.doesNotThrow(() => saveReadingDraft(draft(), broken));
  assert.doesNotThrow(() => clearReadingDraft(7, 24, broken));
});

test("attempt ID is created only without a valid draft and stays stable on reload", () => {
  const generated = "22222222-2222-4222-8222-222222222222";
  assert.equal(resolveReadingAttemptId(null, () => generated), generated);
  const restored = draft().clientAttemptId;
  assert.equal(resolveReadingAttemptId(draft(), () => generated), restored);
  assert.equal(resolveReadingAttemptId(draft(), () => generated), restored);
});

test("draft stores learner choices only, never answer-key metadata", () => {
  const store = storage();
  saveReadingDraft(draft(), store);
  const serialized = store.values.get(buildReadingDraftKey(7, 24)) ?? "";
  assert.equal(serialized.includes("correctIndex"), false);
  assert.equal(serialized.includes("correctAnswer"), false);
  assert.equal(serialized.includes("explanation"), false);
  assert.equal(serialized.includes("accessToken"), false);
});
