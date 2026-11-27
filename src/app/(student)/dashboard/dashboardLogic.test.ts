import test from "node:test";
import assert from "node:assert/strict";
import {
  getVietnamDayOfWeek,
  deriveDailyProgress,
  getTypeSpecificQuestFallback,
  isSafeInternalRoute,
  canAccessFilterPeriod,
  SKILL_DETAIL_CONFIGS,
  periodPhrase,
  learningSummaryParams,
  SKILL_TILE_ORDER,
  getVietnamFormattedDate,
  resolveQuestAction,
  weekDayState,
} from "./dashboardUtils.ts";

test("weekDayState: the Tuần này row shows the days studied this week", () => {
  // Thursday (3); studied Monday and Wednesday.
  const studied = [0, 2];
  assert.equal(weekDayState(0, 3, studied, false), "studied");
  assert.equal(weekDayState(1, 3, studied, false), "missed");
  assert.equal(weekDayState(2, 3, studied, false), "studied");
  assert.equal(weekDayState(3, 3, studied, false), "today-pending");
  assert.equal(weekDayState(4, 3, studied, false), "future");
  assert.equal(weekDayState(6, 3, studied, false), "future");
});

test("weekDayState: today is done when the server lists it or a task is completed", () => {
  assert.equal(weekDayState(3, 3, [3], false), "today-done");
  assert.equal(weekDayState(3, 3, [], true), "today-done");
  // An older server without the field: past days read as not studied.
  assert.equal(weekDayState(1, 3, undefined, false), "missed");
});

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
  // DO_LISTENING -> canonical Listening home
  const listening = getTypeSpecificQuestFallback("DO_LISTENING");
  assert.equal(listening.actionUrl, "/listening");
  assert.equal(listening.actionLabel, "Luyện nghe");

  // COMPLETE_QUIZ counts standalone Listening/Reading/Writing practice only,
  // never a TOEIC exam, so its fallback is a practice home.
  const quiz = getTypeSpecificQuestFallback("COMPLETE_QUIZ");
  assert.equal(quiz.actionUrl, "/listening");
  assert.equal(quiz.actionLabel, "Luyện kỹ năng");

  // DO_SPEAKING -> canonical Speaking home
  const speaking = getTypeSpecificQuestFallback("DO_SPEAKING");
  assert.equal(speaking.actionUrl, "/speaking");

  // LEARN_VOCAB -> /flashcard
  const vocab = getTypeSpecificQuestFallback("LEARN_VOCAB");
  assert.equal(vocab.actionUrl, "/flashcard");

});

test("a skill-practice quest never opens the exam pages", () => {
  const plan = (skill: string, route: string, over: Record<string, boolean> = {}) => ({
    skill,
    route,
    isLocked: false,
    isCompleted: false,
    ...over,
  });
  // The old backend link and the old frontend guard both sent it to /exams.
  for (const actionUrl of ["/exams", "/toeic/assessments", "/listening", undefined]) {
    const action = resolveQuestAction({ type: "COMPLETE_QUIZ", actionUrl, actionLabel: "Làm bài kiểm tra" });
    assert.ok(!/^\/(exams|toeic)/.test(action.actionUrl), `${actionUrl} -> ${action.actionUrl}`);
    assert.notEqual(action.actionLabel, "Làm bài kiểm tra");
  }
  // Today's planned practice wins, skipping a locked or finished one and a
  // planned skill the quest does not count.
  const planned = [
    plan("SPEAKING", "/speaking/4"),
    plan("LISTENING", "/listening/7", { isCompleted: true }),
    plan("READING", "/reading/12", { isLocked: true }),
    plan("WRITING", "/writing/3"),
  ];
  assert.deepEqual(resolveQuestAction({ type: "COMPLETE_QUIZ" }, planned), {
    actionLabel: "Luyện kỹ năng",
    actionUrl: "/writing/3",
  });
  // A planned route that does not open the planned skill is not followed.
  assert.equal(
    resolveQuestAction({ type: "COMPLETE_QUIZ" }, [plan("READING", "/exams/2")]).actionUrl,
    "/listening",
  );
  // A planned speaking item without a task type is not followed, since it
  // might count for the other speaking quest.
  assert.equal(
    resolveQuestAction({ type: "DO_SPEAKING" }, planned).actionUrl,
    "/speaking",
  );
  assert.equal(
    resolveQuestAction({ quest: { type: "LEARN_VOCAB" }, actionUrl: "/flashcard" }).actionUrl,
    "/flashcard",
  );
});

test("isSafeInternalRoute validates allowed prefixes", () => {
  assert.equal(isSafeInternalRoute("/exams"), true);
  assert.equal(isSafeInternalRoute("/practice/listening"), false);
  assert.equal(isSafeInternalRoute("/listening/123"), true);
  assert.equal(isSafeInternalRoute("/flashcard"), true);
  assert.equal(isSafeInternalRoute("/my-courses"), false);
  assert.equal(isSafeInternalRoute("/courses/abc"), false);
  assert.equal(isSafeInternalRoute("https://external-malicious-site.com"), false);
  assert.equal(isSafeInternalRoute("javascript:alert(1)"), false);
});

test("canAccessFilterPeriod enforces subscription tier permissions", () => {
  // FREE tier: only "today" is accessible
  assert.equal(canAccessFilterPeriod("today", "FREE"), true);
  assert.equal(canAccessFilterPeriod("week", "FREE"), false);
  assert.equal(canAccessFilterPeriod("month", "FREE"), false);
  assert.equal(canAccessFilterPeriod("all", "FREE"), false);
  assert.equal(canAccessFilterPeriod("custom", "FREE"), false);

  // Default or null/undefined tier behaves as FREE
  assert.equal(canAccessFilterPeriod("today", null), true);
  assert.equal(canAccessFilterPeriod("week", undefined), false);
  assert.equal(canAccessFilterPeriod("all", ""), false);

  // PLUS tier: unlocks "today", "week", "month"; locks "all" and "custom"
  assert.equal(canAccessFilterPeriod("today", "PLUS"), true);
  assert.equal(canAccessFilterPeriod("week", "PLUS"), true);
  assert.equal(canAccessFilterPeriod("month", "PLUS"), true);
  assert.equal(canAccessFilterPeriod("all", "PLUS"), false);
  assert.equal(canAccessFilterPeriod("custom", "PLUS"), false);

  // PRO tier: unlocks everything (today, week, month, all, custom)
  assert.equal(canAccessFilterPeriod("today", "PRO"), true);
  assert.equal(canAccessFilterPeriod("week", "PRO"), true);
  assert.equal(canAccessFilterPeriod("month", "PRO"), true);
  assert.equal(canAccessFilterPeriod("all", "PRO"), true);
  assert.equal(canAccessFilterPeriod("custom", "PRO"), true);
});

test("SKILL_DETAIL_CONFIGS: one tile per skill, read from the learning summary", () => {
  assert.deepEqual(SKILL_TILE_ORDER, ["exam", "reading", "listening", "speaking", "writing", "vocab"]);
  for (const k of SKILL_TILE_ORDER) {
    const cfg = SKILL_DETAIL_CONFIGS[k];
    assert.equal(cfg.key, k);
    assert.ok(cfg.doneLabel.length > 0 && cfg.unit.length > 0);
    assert.ok(cfg.ctaHref.startsWith("/"));
  }
  assert.deepEqual(
    SKILL_TILE_ORDER.map((k) => SKILL_DETAIL_CONFIGS[k].summaryKey),
    ["EXAM", "READING", "LISTENING", "SPEAKING", "WRITING", "VOCAB"],
  );
  // The units say what is counted (owner 2026-11-26: "Luyện đề x câu" counted exams).
  assert.equal(SKILL_DETAIL_CONFIGS.exam.unit, "đề");
  assert.equal(SKILL_DETAIL_CONFIGS.reading.unit, "bài");
  assert.equal(SKILL_DETAIL_CONFIGS.listening.unit, "bài");
  assert.equal(SKILL_DETAIL_CONFIGS.speaking.unit, "lượt");
  assert.equal(SKILL_DETAIL_CONFIGS.vocab.unit, "từ");
  // No daily quest trains exams, so no daily goal is shown for them.
  assert.deepEqual(SKILL_DETAIL_CONFIGS.exam.questTypes, []);
  assert.deepEqual(SKILL_DETAIL_CONFIGS.listening.questTypes, ["DO_LISTENING"]);
});

test("periodPhrase and learningSummaryParams follow the chosen period", () => {
  assert.equal(periodPhrase("today"), "hôm nay");
  assert.equal(periodPhrase("week"), "tuần này");
  assert.equal(periodPhrase("month"), "tháng này");
  assert.equal(periodPhrase("all"), "từ trước đến nay");
  assert.equal(periodPhrase("custom"), "trong khoảng đã chọn");
  assert.deepEqual(learningSummaryParams("week", "2026-11-01", "2026-11-15"), { period: "week" });
  assert.deepEqual(learningSummaryParams("custom", "2026-11-01", "2026-11-15"), {
    period: "custom",
    from: "2026-11-01",
    to: "2026-11-15",
  });
});

test("getVietnamFormattedDate formats date as DD/MM", () => {
  const testDate = new Date("2026-10-09T08:00:00Z");
  const formatted = getVietnamFormattedDate(testDate);
  assert.equal(formatted, "09/10");
});

test("each daily quest opens practice of the kind it counts", () => {
  const plan = (skill: string, route: string, taskType: string | null = null) => ({
    skill,
    route,
    taskType,
    isLocked: false,
    isCompleted: false,
  });
  const planned = [
    plan("LISTENING", "/listening/9"),
    plan("READING", "/reading/6"),
    plan("WRITING", "/writing/17"),
    plan("SPEAKING", "/speaking/16", "RESPOND_TO_QUESTION"),
    plan("SPEAKING", "/speaking/129", "READ_ALOUD"),
  ];
  const go = (type: string) => resolveQuestAction({ type }, planned);
  assert.equal(go("DO_LISTENING").actionUrl, "/listening/9");
  assert.equal(go("DO_READING").actionUrl, "/reading/6");
  assert.equal(go("DO_WRITING").actionUrl, "/writing/17");
  assert.equal(go("PERFECT_QUIZ").actionUrl, "/listening/9");
  // Free speech for "Luyện Speaking", read-aloud for "Thực hành phát âm".
  assert.equal(go("DO_SPEAKING").actionUrl, "/speaking/16");
  assert.equal(go("PRACTICE_SPEAKING").actionUrl, "/speaking/129");
  assert.equal(go("PRACTICE_SPEAKING").actionLabel, "Luyện phát âm");
  // Without a fitting planned item, the skill catalog, never an exam page.
  for (const type of ["DO_LISTENING", "DO_READING", "DO_WRITING", "PERFECT_QUIZ", "DO_SPEAKING", "PRACTICE_SPEAKING"]) {
    const url = resolveQuestAction({ type, actionUrl: "/exams" }).actionUrl;
    assert.match(url, /^\/(listening|reading|writing|speaking)$/, type);
  }
});
