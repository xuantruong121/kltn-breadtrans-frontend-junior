import assert from "node:assert/strict";
import test from "node:test";

import {
  editContentLabel,
  examGroupLabel,
  groupActions,
  isFixedPrompt,
  questionRangeLabel,
} from "./examGroupCard.ts";

const q = (...numbers: number[]) =>
  numbers.map((questionNumber) => ({ questionNumber }));

test("a group is named by its questions, not its position", () => {
  assert.equal(examGroupLabel({ part: 3, questions: q(32, 33, 34) }), "Part 3 · Hội thoại · Câu 32–34");
  assert.equal(examGroupLabel({ part: 1, questions: q(1) }), "Part 1 · Mô tả ảnh · Câu 1");
});

test("the range ignores row order and handles an empty group", () => {
  assert.equal(questionRangeLabel({ part: 3, questions: q(34, 32, 33) }), "Câu 32–34");
  assert.equal(questionRangeLabel({ part: 3, questions: [] }), "Chưa có câu");
});

test("shared prompts are recognised and real questions are not", () => {
  assert.equal(isFixedPrompt("Choose the best response."), true);
  assert.equal(isFixedPrompt("Choose the best option for blank [131]."), true);
  assert.equal(isFixedPrompt("Choose the sentence that best completes blank [134]."), true);
  assert.equal(isFixedPrompt("Choose the sentence that best describes the photograph."), true);
  assert.equal(isFixedPrompt("Where are the speakers?"), false);
  assert.equal(isFixedPrompt(null), false);
});

test("a group offers only what its Part allows", () => {
  assert.equal(groupActions(1, true).includes("addQuestion"), false);
  assert.equal(groupActions(1, true).includes("questionFromImage"), true);
  assert.equal(groupActions(1, false).includes("questionFromImage"), false);
  assert.equal(groupActions(2, false).includes("findImage"), false);
  assert.equal(groupActions(3, false).includes("addQuestion"), true);
  assert.deepEqual(groupActions(5, false), ["suggestQuestion", "deleteGroup"]);
  assert.equal(groupActions(7, false).includes("regenerateAudio"), false);
});

test("the edit action names what it opens", () => {
  assert.equal(editContentLabel(1), "Sửa ảnh và audio");
  assert.equal(editContentLabel(3), "Sửa audio và lời thoại");
  assert.equal(editContentLabel(7), "Sửa đoạn văn");
});
