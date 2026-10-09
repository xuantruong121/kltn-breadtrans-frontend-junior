import { strict as assert } from "node:assert";
import test from "node:test";
import { readingSubskillLabel, readingTrendLabel } from "./readingTrackingLogic.ts";

test("Reading tracking labels remain deterministic and learner-friendly", () => {
  assert.equal(readingTrendLabel("IMPROVING"), "Đang tăng");
  assert.equal(readingTrendLabel("INSUFFICIENT_DATA"), "Chưa đủ dữ liệu");
  assert.equal(readingSubskillLabel("VOCAB_IN_CONTEXT"), "Từ vựng trong ngữ cảnh");
  assert.equal(readingSubskillLabel("PROMOTION"), "Thông tin khuyến mãi");
  assert.equal(readingSubskillLabel("UNKNOWN_SKILL"), "UNKNOWN_SKILL");
});
