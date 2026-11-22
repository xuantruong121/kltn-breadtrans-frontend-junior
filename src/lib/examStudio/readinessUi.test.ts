import assert from "node:assert/strict";
import test from "node:test";
import {
  getPublishReadinessUi,
  getReadinessIssueLabel,
  missingImageNote,
  partFromUrl,
} from "./readinessUi.ts";

test("readiness UI disables publishing until the learner-ready contract passes", () => {
  const blocked = getPublishReadinessUi(false, 6);
  const ready = getPublishReadinessUi(true, 0);

  assert.equal(blocked.canPublish, false);
  assert.equal(blocked.label, "Còn 6 mục cần hoàn thiện");
  // The tab's own words (QA 2026-11-22: it said "tiền xuất bản").
  assert.match(blocked.helpText ?? "", /"Kiểm tra trước xuất bản"/);
  assert.equal(ready.canPublish, true);
  assert.equal(ready.label, "Xuất bản đề thi");
});

test("readiness UI names the source step instead of counting zero items", () => {
  const blocked = getPublishReadinessUi(false, 0);

  assert.equal(blocked.canPublish, false);
  assert.equal(blocked.label, "Chưa thể xuất bản");
  assert.match(blocked.helpText ?? "", /Speaking và Writing/);
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

test("the missing-picture banner says the questions are complete only when pictures are all that is left", () => {
  assert.equal(
    missingImageNote(2, [{ code: "MISSING_IMAGE" }, { code: "STALE_IMAGE_QUESTION" }]),
    "Còn thiếu 2 ảnh. Câu hỏi và đáp án đã đủ; đề xuất bản được khi đủ ảnh.",
  );
  assert.equal(
    missingImageNote(1, [{ code: "MISSING_IMAGE" }, { code: "EMPTY_GROUP" }, { code: "PART_COUNT" }]),
    "Còn thiếu 1 ảnh.",
  );
  assert.equal(missingImageNote(1, []), "Còn thiếu 1 ảnh.");
});

test("the editor opens on the Part named in the link, else Part 1", () => {
  assert.equal(partFromUrl("5"), 5);
  assert.equal(partFromUrl("7"), 7);
  assert.equal(partFromUrl(null), 1);
  assert.equal(partFromUrl("0"), 1);
  assert.equal(partFromUrl("8"), 1);
  assert.equal(partFromUrl("2.5"), 1);
  assert.equal(partFromUrl("all"), 1);
});
