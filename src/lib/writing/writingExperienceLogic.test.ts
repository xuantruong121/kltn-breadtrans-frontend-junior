import assert from "node:assert/strict";
import test from "node:test";
import { countWritingWords, resolveWritingMode } from "./writingExperienceLogic.ts";

test("writing guidance follows canonical task type", () => {
  assert.equal(resolveWritingMode({ taskType: "WRITING_OPINION" }).id, "OPINION");
  assert.equal(resolveWritingMode({ taskType: "WRITING_EMAIL" }).id, "EMAIL");
  assert.equal(resolveWritingMode({ type: "WRITING_PICTURE" }).id, "SENTENCE");
  assert.equal(resolveWritingMode({ taskType: "WRITING_OPINION" }).guidance.some((item) => item.title === "Opening"), false);
});

test("word count ignores repeated whitespace and punctuation stays part of a word", () => {
  assert.equal(countWritingWords("  One,\n two   three. "), 3);
});
