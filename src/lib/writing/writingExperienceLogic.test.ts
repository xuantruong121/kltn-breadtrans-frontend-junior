import assert from "node:assert/strict";
import test from "node:test";
import { countWritingWords, resolveWritingMode, resolveWritingPlaceholder } from "./writingExperienceLogic.ts";

test("writing guidance follows canonical task type", () => {
  assert.equal(resolveWritingMode({ taskType: "WRITING_OPINION" }).id, "OPINION");
  assert.equal(resolveWritingMode({ taskType: "WRITING_EMAIL" }).id, "EMAIL");
  assert.equal(resolveWritingMode({ taskType: "SHORT_MESSAGE" }).id, "SHORT_MESSAGE");
  assert.equal(resolveWritingMode({ type: "WRITING_PICTURE" }).id, "SENTENCE");
  assert.equal(resolveWritingMode({ taskType: "WRITING_OPINION" }).guidance.some((item) => item.title === "Opening"), false);
});

test("writing placeholders follow the real task type", () => {
  assert.equal(resolveWritingPlaceholder({ taskType: "SENTENCE" }).includes("Dear"), false);
  assert.equal(resolveWritingPlaceholder({ taskType: "SENTENCE" }).includes("Mr."), false);
  assert.equal(resolveWritingPlaceholder({ taskType: "SHORT_MESSAGE" }).includes("Dear"), false);
  assert.equal(resolveWritingPlaceholder({ taskType: "OPINION" }).includes("Dear"), false);
  assert.equal(resolveWritingPlaceholder({ taskType: "EMAIL" }).startsWith("Dear"), true);
});

test("word count ignores repeated whitespace and punctuation stays part of a word", () => {
  assert.equal(countWritingWords("  One,\n two   three. "), 3);
});
