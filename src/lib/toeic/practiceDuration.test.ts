import assert from "node:assert/strict";
import test from "node:test";

import { PRACTICE_PART_MINUTES, practiceMinutes } from "./practiceDuration.ts";

test("a Part 5 practice lasts 11 minutes", () => {
  assert.equal(practiceMinutes([5]), 11);
});

test("chosen Parts add up, duplicates and unknown Parts ignored", () => {
  assert.equal(practiceMinutes([3, 4, 7]), 87);
  assert.equal(practiceMinutes([7, 7, 9]), 56);
  assert.equal(practiceMinutes([]), 0);
});

test("all seven Parts add up to the 120-minute Full Test", () => {
  assert.equal(Object.values(PRACTICE_PART_MINUTES).reduce((a, b) => a + b, 0), 120);
});
