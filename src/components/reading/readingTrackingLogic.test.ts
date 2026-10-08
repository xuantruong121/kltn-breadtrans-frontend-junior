import { strict as assert } from "node:assert";
import test from "node:test";
import { readingSubskillLabel, readingTrendLabel } from "./readingTrackingLogic.ts";

test("Reading tracking labels remain deterministic and learner-friendly", () => {
  assert.equal(readingTrendLabel("IMPROVING"), "Đang tăng");
  assert.equal(readingTrendLabel("INSUFFICIENT_DATA"), "Chưa đủ dữ liệu");
  assert.equal(readingSubskillLabel("VOCAB_IN_CONTEXT"), "Vocabulary in Context");
  assert.equal(readingSubskillLabel("UNKNOWN_SKILL"), "UNKNOWN_SKILL");
});
