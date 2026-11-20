import { strict as assert } from "node:assert";
import test from "node:test";
import { readingSubskillLabel, readingTrendLabel } from "./readingTrackingLogic.ts";

test("Reading tracking labels remain deterministic and learner-friendly", () => {
  assert.equal(readingTrendLabel("IMPROVING"), "Đang tăng");
  assert.equal(readingTrendLabel("INSUFFICIENT_DATA"), "Chưa đủ dữ liệu");
  assert.equal(readingSubskillLabel("VOCAB_IN_CONTEXT"), "Hiểu từ trong ngữ cảnh");
  assert.equal(readingSubskillLabel("PROMOTION"), "Thông tin khuyến mãi");
  assert.equal(readingSubskillLabel("UNKNOWN_SKILL"), "UNKNOWN_SKILL");
  // Stored keys come in other spellings; none may reach the page in English.
  assert.equal(readingSubskillLabel("detail"), "Tìm thông tin chi tiết");
  assert.equal(readingSubskillLabel("purpose"), "Xác định mục đích");
  assert.equal(readingSubskillLabel("specific detail"), "Tìm thông tin chi tiết");
  assert.equal(readingSubskillLabel("main-idea"), "Nắm ý chính");
  assert.equal(readingSubskillLabel("MCQ"), "Đọc hiểu chung");
});
