import { strict as assert } from "node:assert";
import test from "node:test";
import { readingSubskillLabel, readingTrendLabel } from "./readingTrackingLogic.ts";

test("Reading tracking labels remain deterministic and learner-friendly", () => {
  assert.equal(readingTrendLabel("IMPROVING"), "Đang tăng");
  assert.equal(readingTrendLabel("INSUFFICIENT_DATA"), "Chưa đủ dữ liệu");
  assert.equal(readingSubskillLabel("VOCAB_IN_CONTEXT"), "Từ vựng trong ngữ cảnh");
  assert.equal(readingSubskillLabel("PROMOTION"), "Thông tin khuyến mãi");
  assert.equal(readingSubskillLabel("UNKNOWN_SKILL"), "UNKNOWN_SKILL");
  // Stored keys come in other spellings; none may reach the page in English.
  assert.equal(readingSubskillLabel("detail"), "Chi tiết");
  assert.equal(readingSubskillLabel("purpose"), "Mục đích");
  assert.equal(readingSubskillLabel("specific detail"), "Chi tiết");
  assert.equal(readingSubskillLabel("main-idea"), "Ý chính");
  assert.equal(readingSubskillLabel("MCQ"), "Đọc hiểu");
});
