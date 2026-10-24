import assert from "node:assert/strict";
import test from "node:test";
import {
  getPublishReadinessUi,
  getReadinessIssueLabel,
} from "./readinessUi.ts";

test("readiness UI disables publishing until the learner-ready contract passes", () => {
  const blocked = getPublishReadinessUi(false, 6);
  const ready = getPublishReadinessUi(true, 0);

  assert.equal(blocked.canPublish, false);
  assert.equal(blocked.label, "Còn 6 mục cần hoàn thiện");
  assert.match(blocked.helpText ?? "", /Kiểm tra tiền xuất bản/);
  assert.equal(ready.canPublish, true);
  assert.equal(ready.label, "Xuất bản đề thi");
});

test("readiness UI prefers the human message and never needs a raw code or DB id", () => {
  assert.equal(
    getReadinessIssueLabel({
      humanMessage: "Listening · Part 1 · Bức ảnh 2 chưa có hình ảnh.",
      message: "Part 1 group has no image stimulus (Nhóm ID: 1672)",
    }),
    "Listening · Part 1 · Bức ảnh 2 chưa có hình ảnh.",
  );
  assert.equal(
    getReadinessIssueLabel({
      message: "[MISSING_IMAGE] Part 1 group has no image stimulus (Nhóm ID: 1672)",
    }),
    "Mục này cần được hoàn thiện.",
  );
});
