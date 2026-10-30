import test from "node:test";
import assert from "node:assert/strict";
import { PRACTICE_LEVEL_LABEL, practiceLevelLabel } from "./practiceLevel.ts";

test("practice level labels are the internal names, never CEFR codes", () => {
  assert.equal(practiceLevelLabel("STARTER"), "Mất gốc");
  assert.equal(practiceLevelLabel("ADVANCED"), "Nâng cao");
  assert.equal(practiceLevelLabel(null), "Chưa xác định");
  for (const label of Object.values(PRACTICE_LEVEL_LABEL)) assert.doesNotMatch(label, /\b[ABC][12]\b|CEFR/);
});
