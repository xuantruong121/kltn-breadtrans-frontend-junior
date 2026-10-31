import { test } from "node:test";
import assert from "node:assert/strict";

import {
  grammarCategory,
  grammarDisplayTitle,
  quizDisplayTitle,
  recommendationDisplayTitle,
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

test("every practice quiz published in F8 has a Vietnamese title", () => {
  for (let id = 47; id <= 82; id += 1) {
    const stored = `Reading A1 — English title ${id}`;
    assert.notEqual(quizDisplayTitle(id, stored, "A1"), stored);
  }
});

test("a recommendation reads the same title as its catalog", () => {
  const base = { title: "Reading A1 — Store Refund Policy", route: "/reading/60" };
  assert.equal(
    recommendationDisplayTitle({ ...base, contentType: "QUIZ", contentId: 60 }),
    "Chính sách hoàn tiền của cửa hàng (A1)",
  );
  assert.equal(
    recommendationDisplayTitle({
      contentType: "SPEAKING_SET",
      contentId: 172,
      title: "A Visit to the Doctor",
      route: "/speaking/172?set=speaking-722e96f8-3df7-469e-9d4c-f67084411620",
    }),
    "Đi khám bác sĩ",
  );
  assert.equal(
    recommendationDisplayTitle({ contentType: "CONTENT_TOPIC", contentId: 1, title: "X", route: "/x" }),
    "X",
  );
});
