import test from "node:test";
import assert from "node:assert/strict";
import { PRACTICE_LEVEL_LABEL, practiceLevelLabel, prioritySkillsText, skillsBelowOverall } from "./practiceLevel.ts";

test("skills under the overall level are the ones to work on first", () => {
  const skills = {
    LISTENING: "ADVANCED",
    READING: "INTERMEDIATE",
    SPEAKING: "BASIC",
    WRITING: "BASIC",
  } as const;
  const low = skillsBelowOverall(skills, "INTERMEDIATE");
  assert.deepEqual(low, ["SPEAKING", "WRITING"]);
  assert.equal(prioritySkillsText(low), "Nói, Viết");
  assert.deepEqual(skillsBelowOverall(skills, "BASIC"), []);
  assert.deepEqual(skillsBelowOverall(skills, null), []);
  assert.deepEqual(skillsBelowOverall({ LISTENING: null }, "ADVANCED"), []);
});

test("practice level labels are the internal names, never CEFR codes", () => {
  assert.equal(practiceLevelLabel("STARTER"), "Mất gốc");
  assert.equal(practiceLevelLabel("ADVANCED"), "Nâng cao");
  assert.equal(practiceLevelLabel(null), "Chưa xác định");
  for (const label of Object.values(PRACTICE_LEVEL_LABEL)) assert.doesNotMatch(label, /\b[ABC][12]\b|CEFR/);
});
