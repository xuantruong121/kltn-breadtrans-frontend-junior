import { test } from "node:test";
import assert from "node:assert/strict";

import { isCompanionPetHidden } from "./companionPetVisibility.ts";

test("the Entry Diagnostic hides the pet, as before", () => {
  assert.equal(isCompanionPetHidden("/diagnostic", null), true);
  assert.equal(isCompanionPetHidden("/diagnostic/attempt/3", null), true);
  assert.equal(isCompanionPetHidden("/hub", "diagnostic-result"), true);
  assert.equal(isCompanionPetHidden("/student", "diagnostic"), true);
  assert.equal(isCompanionPetHidden("/hub", "learning-progress"), false);
});

test("a TOEIC exam page and its attempts hide the pet (CP60-UX-02)", () => {
  assert.equal(isCompanionPetHidden("/exams/15", null), true);
  assert.equal(isCompanionPetHidden("/exams/submissions/9", null), true);
  assert.equal(isCompanionPetHidden("/toeic/attempts/41", null), true);
  assert.equal(isCompanionPetHidden("/toeic/assessments/16/attempts/41/result", null), true);
});

test("catalog and history pages keep the pet", () => {
  assert.equal(isCompanionPetHidden("/exams", null), false);
  assert.equal(isCompanionPetHidden("/toeic/history", null), false);
  assert.equal(isCompanionPetHidden("/listening", null), false);
  assert.equal(isCompanionPetHidden("/speaking/16", null), false);
});
