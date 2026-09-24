import assert from "node:assert/strict";
import test from "node:test";
import {
  formatReadingExplanation,
  formatReadingValue,
  getUnansweredQuestionIndexes,
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
