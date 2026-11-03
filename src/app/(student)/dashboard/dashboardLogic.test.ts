import test from "node:test";
import assert from "node:assert/strict";
import {
  getVietnamDayOfWeek,
  deriveDailyProgress,
  getTypeSpecificQuestFallback,
  isSafeInternalRoute,
  canAccessFilterPeriod,
  SKILL_DETAIL_CONFIGS,
  matchPartActivity,
  getVietnamFormattedDate,
  resolveQuestAction,
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
    actionLabel: "Luyện kỹ năng ngay",
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

test("SKILL_DETAIL_CONFIGS defines valid data for all 6 core skills", () => {
  const keys = ["exam", "reading", "listening", "speaking", "writing", "vocab"] as const;
  for (const k of keys) {
    const cfg = SKILL_DETAIL_CONFIGS[k];
    assert.ok(cfg, `Config for ${k} must exist`);
    assert.equal(cfg.key, k);
    assert.ok(cfg.title.length > 0);
    assert.ok(cfg.statLabel3.length > 0);
    assert.ok(cfg.statLabel4.length > 0);
    assert.ok(cfg.ctaLabel.length > 0);
    assert.ok(cfg.ctaHref.startsWith("/"));
    assert.ok(cfg.parts.length > 0);
    assert.ok(cfg.defaultTarget > 0);
  }

  // Listening specific checks matching BreadTrans learning modes
  const listening = SKILL_DETAIL_CONFIGS.listening;
  assert.equal(listening.title, "NGHE");
  assert.equal(listening.statLabel3, "Câu đã nghe");
  assert.equal(listening.statLabel4, "Bài nghe chép");
  assert.equal(listening.actionHeader, "ĐÃ NGHE");
  assert.equal(listening.ctaLabel, "Luyện nghe tiếp");
  assert.equal(listening.ctaHref, "/listening");
  assert.equal(listening.parts.length, 3);
  assert.deepEqual(listening.parts.map((p) => p.id), [
    "listen-comprehension",
    "listen-dictation",
    "listen-dialogue",
  ]);

  // Flashcard specific checks matching BreadTrans system
  const vocab = SKILL_DETAIL_CONFIGS.vocab;
  assert.equal(vocab.label, "Flashcard");
  assert.equal(vocab.title, "FLASHCARD");
  assert.equal(vocab.ctaLabel, "Luyện Flashcard tiếp");
  assert.equal(vocab.ctaHref, "/flashcard");
  assert.equal(vocab.targetUnit, "thẻ");
  assert.equal(vocab.parts.length, 4);

  // Exam specific checks matching BreadTrans test formats
  const exam = SKILL_DETAIL_CONFIGS.exam;
  assert.equal(exam.title, "LUYỆN ĐỀ");
  // Only papers the catalog has; there is no "mini" TOEIC product.
  assert.deepEqual(
    exam.parts.map((p) => p.href),
    ["/exams?paper=TOEIC_LR", "/exams?paper=TOEIC_SW", "/exams?paper=TOEIC_4_SKILLS"],
  );

  // Reading specific checks matching BreadTrans levels
  const reading = SKILL_DETAIL_CONFIGS.reading;
  assert.equal(reading.title, "ĐỌC");
  assert.equal(reading.parts.length, 4);

  // Speaking specific checks matching BreadTrans practice sets
  const speaking = SKILL_DETAIL_CONFIGS.speaking;
  assert.equal(speaking.title, "NÓI");
  assert.equal(speaking.parts.length, 5);

  // Writing specific checks matching BreadTrans topic categories
  const writing = SKILL_DETAIL_CONFIGS.writing;
  assert.equal(writing.title, "VIẾT");
  assert.equal(writing.parts.length, 3);
});

test("matchPartActivity correctly identifies activities across all 6 skills", () => {
  // Listening
  assert.equal(
    matchPartActivity("listening", "listen-dictation", {
      type: "LISTENING_PRACTICE_COMPLETED",
      title: "Nghe chép A2: Du lịch và chỉ đường",
    }),
    true
  );
  assert.equal(
    matchPartActivity("listening", "listen-comprehension", {
      type: "LISTENING_PRACTICE_COMPLETED",
      title: "Nghe hiểu B1: Đời sống thường ngày",
    }),
    true
  );

  // Reading
  assert.equal(
    matchPartActivity("reading", "read-basic", {
      type: "READING_PRACTICE_COMPLETED",
      title: "Reading A2: Notices & Messages",
    }),
    true
  );
  assert.equal(
    matchPartActivity("reading", "read-grammar", {
      type: "GRAMMAR_PRACTICE",
      title: "Thì hiện tại hoàn thành",
    }),
    true
  );

  // Writing
  assert.equal(
    matchPartActivity("writing", "write-sentence", {
      type: "WRITING_PRACTICE_COMPLETED",
      title: "Writing A2-B1: Sentence Builder",
    }),
    true
  );

  // Vocab
  assert.equal(
    matchPartActivity("vocab", "vocab-toeic", {
      type: "VOCABULARY_MASTERED",
      title: "Office & Meetings",
      detail: "600 từ vựng TOEIC",
    }),
    true
  );

  // Exam
  assert.equal(
    matchPartActivity("exam", "exam-lr", {
      type: "TOEIC_LR_EXAM",
      title: "TOEIC L&R: Đề thi chuẩn 01",
    }),
    true
  );
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
  assert.equal(go("PRACTICE_SPEAKING").actionLabel, "Luyện phát âm ngay");
  // Without a fitting planned item, the skill catalog, never an exam page.
  for (const type of ["DO_LISTENING", "DO_READING", "DO_WRITING", "PERFECT_QUIZ", "DO_SPEAKING", "PRACTICE_SPEAKING"]) {
    const url = resolveQuestAction({ type, actionUrl: "/exams" }).actionUrl;
    assert.match(url, /^\/(listening|reading|writing|speaking)$/, type);
  }
});
