import { test } from "node:test";
import assert from "node:assert/strict";

import {
  grammarCategory,
  grammarDisplayTitle,
  quizDisplayTitle,
  recommendationDisplayTitle,
  speakingSetDisplayTitle,
  withoutLevelPhrase,
  withoutLevelTag,
} from "./displayTitles.ts";

test("Writing B1 email reads as a Vietnamese title without a level tag", () => {
  assert.equal(
    quizDisplayTitle(4, "Writing B1 — Professional Email"),
    "Viết email công việc",
  );
  assert.equal(
    quizDisplayTitle(19, "Writing B2–C1 — Argument & Problem Solving"),
    "Viết bài lập luận và đề xuất giải pháp",
  );
});

test("unknown content keeps its stored title without the level tag", () => {
  assert.equal(quizDisplayTitle(999, "Listening B1 — New"), "New");
  assert.equal(quizDisplayTitle(999, "Bài mới (A2)"), "Bài mới");
  assert.equal(speakingSetDisplayTitle("new-set", "Bộ mới"), "Bộ mới");
});

test("descriptions lose their level phrase", () => {
  assert.equal(withoutLevelPhrase("Learn a store refund policy at level A1."), "Learn a store refund policy.");
  assert.equal(withoutLevelPhrase("How an office welcomes a new member at B1 level."), "How an office welcomes a new member.");
  assert.equal(withoutLevelPhrase("Booking a city tour at an A1 level."), "Booking a city tour.");
  assert.equal(withoutLevelPhrase("An A1 listening dialogue about supplies."), "A listening dialogue about supplies.");
  assert.equal(withoutLevelPhrase("A C1-level dialogue with a doctor."), "A dialogue with a doctor.");
  assert.equal(withoutLevelPhrase("Vitamin B12 at a clinic."), "Vitamin B12 at a clinic.");
});

test("a title with no level tag stays whole", () => {
  assert.equal(withoutLevelTag("TOEIC 2 Skills: Listening & Reading — Đề luyện tập 01"), "TOEIC 2 Skills: Listening & Reading — Đề luyện tập 01");
  assert.equal(withoutLevelTag("Read Aloud B1–B2 — Office"), "Office");
});

test("Speaking sets are keyed by set key", () => {
  assert.equal(
    speakingSetDisplayTitle("practice-describe-picture-b1", "Mô tả tranh — Trung cấp"),
    "Mô tả tranh",
  );
});

test("grammar topics carry a Vietnamese title and a category; 13/14 are tenses", () => {
  assert.equal(grammarDisplayTitle(13, "Present Simple"), "Thì hiện tại đơn và trạng từ tần suất");
  assert.equal(grammarCategory(13), "TENSE");
  assert.equal(grammarCategory(14), "TENSE");
  assert.equal(grammarCategory(4), "VERB");
  assert.equal(grammarCategory(5), "WORD_CLASS");
  assert.equal(grammarCategory(9), "OTHER");
  assert.equal(grammarCategory(1234), "OTHER");
  assert.equal(grammarDisplayTitle(1234, "New topic"), "New topic");
});

test("tenses added later are found by title, whatever their id", () => {
  assert.equal(grammarDisplayTitle(1234, "Past Perfect"), "Thì quá khứ hoàn thành");
  assert.equal(grammarCategory(1234, "Past Perfect"), "TENSE");
  assert.equal(grammarCategory(1234, "Some other topic"), "OTHER");
});

test("every practice quiz published in F8 has a Vietnamese title", () => {
  for (let id = 47; id <= 82; id += 1) {
    const stored = `Reading A1 — English title ${id}`;
    assert.notEqual(quizDisplayTitle(id, stored), stored);
  }
});

test("a recommendation reads the same title as its catalog", () => {
  const base = { title: "Reading A1 — Store Refund Policy", route: "/reading/60" };
  assert.equal(
    recommendationDisplayTitle({ ...base, contentType: "QUIZ", contentId: 60 }),
    "Chính sách hoàn tiền của cửa hàng",
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
