import { test } from "node:test";
import assert from "node:assert/strict";

import {
  grammarCategory,
  grammarDisplayTitle,
  quizDisplayTitle,
  speakingSetDisplayTitle,
} from "./displayTitles.ts";

test("Writing B1 email reads as a Vietnamese title with its authoritative level", () => {
  assert.equal(
    quizDisplayTitle(4, "Writing B1 — Professional Email", "B1"),
    "Viết email công việc (B1)",
  );
  assert.equal(
    quizDisplayTitle(19, "Writing B2–C1 — Argument & Problem Solving", "B2-C1"),
    "Viết bài lập luận và đề xuất giải pháp (B2–C1)",
  );
});

test("unknown content keeps its stored title; a missing level adds no suffix", () => {
  assert.equal(quizDisplayTitle(999, "Listening B1 — New"), "Listening B1 — New");
  assert.equal(quizDisplayTitle(4, "Writing B1 — Professional Email", null), "Viết email công việc");
  // a detail view without cefrLevel reads the stored title's authored tag
  assert.equal(quizDisplayTitle(4, "Writing B1 — Professional Email"), "Viết email công việc (B1)");
  assert.equal(speakingSetDisplayTitle("new-set", "Bộ mới", "A2"), "Bộ mới");
});

test("Speaking sets are keyed by set key", () => {
  assert.equal(
    speakingSetDisplayTitle("practice-describe-picture-b1", "Mô tả tranh — Trung cấp", "B1"),
    "Mô tả tranh (B1)",
  );
});

test("grammar topics carry a Vietnamese title and a category; 13/14 are tenses", () => {
  assert.equal(grammarDisplayTitle(13, "Present Simple"), "Thì hiện tại đơn và trạng từ tần suất");
  assert.equal(grammarCategory(13), "VERB");
  assert.equal(grammarCategory(14), "VERB");
  assert.equal(grammarCategory(5), "WORD_CLASS");
  assert.equal(grammarCategory(9), "OTHER");
  assert.equal(grammarCategory(1234), "OTHER");
  assert.equal(grammarDisplayTitle(1234, "New topic"), "New topic");
});
