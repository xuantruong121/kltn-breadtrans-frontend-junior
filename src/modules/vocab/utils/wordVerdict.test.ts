import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MAX_RELEARNS,
  NO_EVIDENCE,
  comesBackThisSession,
  relearnLimit,
  stepLines,
  toReviewEvidence,
  verdictHeadline,
  withQuickCheck,
  withQuiz,
  withSpeaking,
  withTyping,
} from "./wordVerdict.ts";

test("the first quiz and typing answers count", () => {
  let e = withQuiz(NO_EVIDENCE, false);
  e = withQuiz(e, true);
  assert.equal(e.quiz, "WRONG");
  e = withTyping(e, true, 2);
  e = withTyping(e, false, 0);
  assert.equal(e.typing, "CORRECT");
  assert.equal(e.typingHints, 2);
});

test("a spoken pass stays, other speaking results take the last one", () => {
  let e = withSpeaking(NO_EVIDENCE, "FAILED");
  e = withSpeaking(e, "UNAVAILABLE");
  assert.equal(e.speaking, "UNAVAILABLE");
  e = withSpeaking(e, "PASSED");
  e = withSpeaking(e, "FAILED");
  assert.equal(e.speaking, "PASSED");
});

test("steps never reached are sent as skipped", () => {
  assert.deepEqual(toReviewEvidence(NO_EVIDENCE), {
    quiz: "SKIPPED",
    typing: "SKIPPED",
    typingHints: 0,
    speaking: "SKIPPED",
    quickCheck: false,
  });
});

test("the quick check never sends a speaking result", () => {
  let e = withQuickCheck(NO_EVIDENCE);
  e = withQuiz(e, true);
  e = withTyping(e, true, 0);
  e = withSpeaking(e, "PASSED");
  assert.deepEqual(toReviewEvidence(e), {
    quiz: "CORRECT",
    typing: "CORRECT",
    typingHints: 0,
    speaking: "SKIPPED",
    quickCheck: true,
  });
});

test("the headline says the grade and when the word comes back", () => {
  assert.equal(verdictHeadline("HARD", 1), "Khó · ôn lại sau 1 ngày");
  assert.equal(verdictHeadline("GOOD", 3), "Tốt · ôn lại sau 3 ngày");
  assert.equal(verdictHeadline("EASY", 4), "Dễ · ôn lại sau 4 ngày");
  assert.equal(verdictHeadline("EASY", 60), "Dễ · ôn lại sau 2 tháng");
  assert.equal(verdictHeadline("AGAIN", 0), "Học lại · từ này quay lại cuối phiên");
});

test("each step gets a line in plain words", () => {
  const lines = stepLines({
    quiz: "CORRECT",
    typing: "CORRECT",
    typingHints: 2,
    speaking: "UNAVAILABLE",
    quickCheck: false,
  });
  assert.deepEqual(
    lines.map((l) => `${l.label}: ${l.text} (${l.tone})`),
    ["Trắc nghiệm: đúng (ok)", "Gõ từ: đúng, dùng 2 gợi ý (warn)", "Phát âm: không dùng được micro (none)"],
  );
  const missed = stepLines({
    quiz: "WRONG",
    typing: "SKIPPED",
    typingHints: 0,
    speaking: "FAILED",
    quickCheck: false,
  });
  assert.deepEqual(
    missed.map((l) => l.text),
    ["chọn sai", "bỏ qua", "chưa chính xác"],
  );
  assert.equal(
    stepLines({ quiz: "CORRECT", typing: "WRONG", typingHints: 0, speaking: "SKIPPED", quickCheck: true })[2].text,
    "không cần (bạn chọn Đã nhớ)",
  );
});

test("a due-word review has no speaking line", () => {
  const lines = stepLines(
    { quiz: "CORRECT", typing: "CORRECT", typingHints: 0, speaking: "SKIPPED", quickCheck: false },
    { speaking: false },
  );
  assert.deepEqual(lines.map((l) => l.label), ["Trắc nghiệm", "Gõ từ"]);
});

test("a word to relearn comes back twice, then is left to the schedule", () => {
  assert.equal(MAX_RELEARNS.deck, 2);
  assert.equal(comesBackThisSession(1), true);
  assert.equal(comesBackThisSession(2), true);
  assert.equal(comesBackThisSession(3), false);
  assert.equal(verdictHeadline("AGAIN", 0), "Học lại · từ này quay lại cuối phiên");
  assert.equal(verdictHeadline("AGAIN", 0, false), "Học lại · hệ thống sẽ nhắc lại sau 10 phút");
  // The flag only matters for a word to relearn.
  assert.equal(verdictHeadline("GOOD", 1, false), verdictHeadline("GOOD", 1));
});

test("a due-word review lets a word to relearn come back once", () => {
  assert.deepEqual(MAX_RELEARNS, { deck: 2, dueReview: 1 });
  assert.equal(relearnLimit(false), 2);
  assert.equal(relearnLimit(true), 1);
  assert.equal(comesBackThisSession(1, relearnLimit(true)), true);
  assert.equal(comesBackThisSession(2, relearnLimit(true)), false);
  assert.equal(comesBackThisSession(2, relearnLimit(false)), true);
  assert.equal(comesBackThisSession(3, relearnLimit(false)), false);
});
