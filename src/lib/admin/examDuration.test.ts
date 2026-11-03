import assert from "node:assert/strict";
import { test } from "node:test";

import {
  allowedExamTypes,
  defaultExamMinutes,
  durationLocked,
  examTypeFor,
  examTypeLabel,
} from "./examDuration.ts";

test("a full test follows the ETS length of its product", () => {
  assert.equal(defaultExamMinutes("TOEIC_LR", "FULL_TEST", "LISTENING"), 120);
  assert.equal(defaultExamMinutes("TOEIC_SW", "FULL_TEST", "LISTENING"), 80);
  assert.equal(defaultExamMinutes("TOEIC_4_SKILLS", "FULL_TEST", "READING"), 200);
});

test("L&R part practice starts from the length of its ETS section", () => {
  assert.equal(defaultExamMinutes("TOEIC_LR", "PRACTICE_BY_PART", "LISTENING"), 45);
  assert.equal(defaultExamMinutes("TOEIC_LR", "PRACTICE_BY_PART", "READING"), 75);
});

test("only L&R part practice has an editable length", () => {
  assert.equal(durationLocked("TOEIC_LR", "PRACTICE_BY_PART"), false);
  assert.equal(durationLocked("TOEIC_LR", "FULL_TEST"), true);
  assert.equal(durationLocked("TOEIC_SW", "FULL_TEST"), true);
});

test("Speaking & Writing and 4 skills offer a full test only", () => {
  assert.deepEqual(allowedExamTypes("TOEIC_LR"), ["FULL_TEST", "PRACTICE_BY_PART"]);
  assert.deepEqual(allowedExamTypes("TOEIC_SW"), ["FULL_TEST"]);
  assert.equal(examTypeFor("TOEIC_4_SKILLS", "PRACTICE_BY_PART"), "FULL_TEST");
  assert.equal(examTypeLabel("TOEIC_SW", "FULL_TEST"), "Full Test (11 câu nói, 8 câu viết)");
});
