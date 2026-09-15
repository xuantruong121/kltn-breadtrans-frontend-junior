import test from "node:test";
import assert from "node:assert/strict";
import {
  getVietnamDayOfWeek,
  deriveDailyProgress,
  getTypeSpecificQuestFallback,
  isSafeInternalRoute,
} from "./dashboardUtils.ts";

test("getVietnamDayOfWeek deterministically parses backend dateKey", () => {
  // 2026-09-14 is Monday -> index 0 (T2)
  assert.equal(getVietnamDayOfWeek("2026-09-14"), 0);

  // 2026-09-15 is Tuesday -> index 1 (T3)
  assert.equal(getVietnamDayOfWeek("2026-09-15"), 1);

  // 2026-09-16 is Wednesday -> index 2 (T4)
  assert.equal(getVietnamDayOfWeek("2026-09-16"), 2);

  // 2026-09-17 is Thursday -> index 3 (T5)
  assert.equal(getVietnamDayOfWeek("2026-09-17"), 3);

  // 2026-09-18 is Friday -> index 4 (T6)
  assert.equal(getVietnamDayOfWeek("2026-09-18"), 4);

  // 2026-09-19 is Saturday -> index 5 (T7)
  assert.equal(getVietnamDayOfWeek("2026-09-19"), 5);

  // 2026-09-20 is Sunday -> index 6 (CN)
  assert.equal(getVietnamDayOfWeek("2026-09-20"), 6);
});

test("Daily progress calculation agrees with counts and handles edge cases", () => {
  // 1/4 -> 25%
  const r1 = deriveDailyProgress(1, 4);
  assert.equal(r1.safeCompleted, 1);
  assert.equal(r1.safeTotal, 4);
  assert.equal(r1.derivedPercent, 25);

  // 2/3 -> 67%
  const r2 = deriveDailyProgress(2, 3);
  assert.equal(r2.safeCompleted, 2);
  assert.equal(r2.safeTotal, 3);
  assert.equal(r2.derivedPercent, 67);

  // 4/4 -> 100%
  const r3 = deriveDailyProgress(4, 4);
  assert.equal(r3.safeCompleted, 4);
  assert.equal(r3.safeTotal, 4);
  assert.equal(r3.derivedPercent, 100);

  // 0/0 -> 0% (never a misleading percentage)
  const r4 = deriveDailyProgress(0, 0);
  assert.equal(r4.safeCompleted, 0);
  assert.equal(r4.safeTotal, 0);
  assert.equal(r4.derivedPercent, 0);

  // completedCount never exceeds totalCount
  const r5 = deriveDailyProgress(6, 4);
  assert.equal(r5.safeCompleted, 4);
  assert.equal(r5.derivedPercent, 100);

  // negative completed handled defensively
  const r6 = deriveDailyProgress(-1, 4);
  assert.equal(r6.safeCompleted, 0);
  assert.equal(r6.derivedPercent, 0);
});

test("Quest routing correctly separates COMPLETE_QUIZ from DO_LISTENING", () => {
  // DO_LISTENING -> /practice/listening
  const listening = getTypeSpecificQuestFallback("DO_LISTENING");
  assert.equal(listening.actionUrl, "/practice/listening");
  assert.equal(listening.actionLabel, "Luyện nghe");

  // COMPLETE_QUIZ -> /practice/quizzes (NOT /practice/listening!)
  const quiz = getTypeSpecificQuestFallback("COMPLETE_QUIZ");
  assert.equal(quiz.actionUrl, "/practice/quizzes");
  assert.equal(quiz.actionLabel, "Làm bài kiểm tra");

  // DO_SPEAKING -> /practice/speaking
  const speaking = getTypeSpecificQuestFallback("DO_SPEAKING");
  assert.equal(speaking.actionUrl, "/practice/speaking");

  // LEARN_VOCAB -> /flashcard
  const vocab = getTypeSpecificQuestFallback("LEARN_VOCAB");
  assert.equal(vocab.actionUrl, "/flashcard");

  // COMPLETE_LESSON -> /my-courses
  const lesson = getTypeSpecificQuestFallback("COMPLETE_LESSON");
  assert.equal(lesson.actionUrl, "/my-courses");
});

test("isSafeInternalRoute validates allowed prefixes", () => {
  assert.equal(isSafeInternalRoute("/practice/quizzes"), true);
  assert.equal(isSafeInternalRoute("/practice/listening"), true);
  assert.equal(isSafeInternalRoute("/flashcard"), true);
  assert.equal(isSafeInternalRoute("/my-courses"), true);
  assert.equal(isSafeInternalRoute("https://external-malicious-site.com"), false);
  assert.equal(isSafeInternalRoute("javascript:alert(1)"), false);
});
