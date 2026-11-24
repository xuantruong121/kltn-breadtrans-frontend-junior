import assert from "node:assert/strict";
import test from "node:test";
import {
  formatReadingExplanation,
  formatReadingValue,
  getUnansweredQuestionIndexes,
  readingStepAfterAnswer,
  resolveReadingCorrectAnswer,
} from "./readingQuizUtils.ts";

test("blocks incomplete Reading answers and identifies the first unanswered question", () => {
  const missing = getUnansweredQuestionIndexes(
    [{ id: 10 }, { id: 11 }, { id: 12 }],
    { 10: "A", 11: "" },
  );
  assert.deepEqual(missing, [1, 2]);
});

test("resolves a Reading answer from correctIndex", () => {
  assert.deepEqual(
    resolveReadingCorrectAnswer({ options: ["A", "B"], correctIndex: 1 }),
    { available: true, answer: "B" },
  );
});

test("does not expose an answer for an invalid correctIndex", () => {
  assert.deepEqual(
    resolveReadingCorrectAnswer({ options: ["A", "B"], correctIndex: 2 }),
    { available: false },
  );
  assert.equal(formatReadingValue({ answer: "bad" }, "Đáp án chưa khả dụng"), "Đáp án chưa khả dụng");
});

test("keeps review explanation controlled and non-empty", () => {
  assert.equal(
    formatReadingExplanation({
      explanation: { vi: "Vì đáp án này khớp với chi tiết trong bài đọc." },
    }),
    "Vì đáp án này khớp với chi tiết trong bài đọc.",
  );
  assert.equal(formatReadingExplanation({ explanation: {} }), null);
});

test("choosing an answer moves on to the next question, except on the last one", () => {
  assert.equal(readingStepAfterAnswer(0, 5), 1);
  assert.equal(readingStepAfterAnswer(3, 5), 4);
  assert.equal(readingStepAfterAnswer(4, 5), null);
  assert.equal(readingStepAfterAnswer(0, 1), null);
});
