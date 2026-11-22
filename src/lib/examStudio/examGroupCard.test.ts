import assert from "node:assert/strict";
import test from "node:test";

import {
  canAddQuestion,
  canBuildAudio,
  editContentLabel,
  emptyGroupNote,
  examGroupLabel,
  groupActions,
  isFixedPrompt,
  partFilterAfterAdd,
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
  assert.equal(groupActions(1, true, 1).includes("questionFromImage"), true);
  assert.equal(groupActions(1, false, 0).includes("questionFromImage"), false);
  assert.equal(groupActions(2, false, 0).includes("findImage"), false);
  assert.equal(groupActions(3, false, 3).includes("addQuestion"), true);
  assert.deepEqual(groupActions(5, false, 1), ["suggestQuestion", "deleteGroup"]);
  assert.equal(groupActions(7, false, 2).includes("regenerateAudio"), false);
});

// QA 2026-11-22: Parts 1, 2 and 5 had only "AI gợi ý câu khác" and "Xoá nhóm".
test("Parts 1, 2 and 5 get their one question by hand, with each Part's rule", () => {
  assert.deepEqual(groupActions(5, false, 0), ["suggestQuestion", "addQuestion", "deleteGroup"]);
  assert.equal(groupActions(2, false, 0).includes("addQuestion"), true);
  assert.equal(groupActions(2, false, 1).includes("addQuestion"), false);
  // Part 1: the statements describe the picture, so the picture comes first.
  assert.equal(groupActions(1, false, 0).includes("addQuestion"), false);
  assert.equal(groupActions(1, true, 0).includes("addQuestion"), true);
  assert.equal(groupActions(1, true, 1).includes("addQuestion"), false);
  assert.equal(canAddQuestion(6, false, 4), true);
});

test("Parts 1 and 2 make no audio before their question exists", () => {
  assert.equal(groupActions(2, false, 0).includes("regenerateAudio"), false);
  assert.equal(groupActions(2, false, 1).includes("regenerateAudio"), true);
  assert.equal(canBuildAudio(3, 0), true);
  assert.equal(canBuildAudio(5, 1), false);
});

test("an empty group says how to fill it when its add is hidden", () => {
  assert.match(emptyGroupNote(1, false, 0) ?? "", /Thêm ảnh trước/);
  assert.equal(emptyGroupNote(1, true, 0), "Nhóm này chưa có câu hỏi.");
  assert.match(emptyGroupNote(2, false, 0) ?? "", /tạo audio/);
  assert.equal(emptyGroupNote(5, false, 1), null);
});

test("a group added under a Part filter stays in view", () => {
  assert.equal(partFilterAfterAdd(1, 5), 5);
  assert.equal(partFilterAfterAdd(5, 5), 5);
  assert.equal(partFilterAfterAdd("all", 5), "all");
});

test("the edit action names what it opens", () => {
  assert.equal(editContentLabel(1), "Sửa ảnh và audio");
  assert.equal(editContentLabel(3), "Sửa audio và lời thoại");
  assert.equal(editContentLabel(7), "Sửa đoạn văn");
});
