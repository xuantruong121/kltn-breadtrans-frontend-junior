import assert from "node:assert/strict";
import { test } from "node:test";

import { levelLabel, statusLabel } from "./displayLabels.ts";

test("level enums become Vietnamese labels", () => {
  assert.equal(levelLabel("BEGINNER"), "Cơ bản");
  assert.equal(levelLabel("INTERMEDIATE"), "Trung cấp");
  assert.equal(levelLabel("advanced"), "Nâng cao");
});

test("CEFR tags and free text are kept", () => {
  assert.equal(levelLabel("B1"), "B1");
  assert.equal(levelLabel("Cơ bản · A1–A2"), "Cơ bản · A1–A2");
  assert.equal(levelLabel(undefined), "");
});

test("status enums become Vietnamese labels; unknown values stay visible", () => {
  assert.equal(statusLabel("PUBLISHED"), "Đã xuất bản");
  assert.equal(statusLabel("DRAFT"), "Bản nháp");
  assert.equal(statusLabel("PENDING_GRADING"), "Đang chấm bài");
  assert.equal(statusLabel("SOMETHING_NEW"), "SOMETHING_NEW");
});
