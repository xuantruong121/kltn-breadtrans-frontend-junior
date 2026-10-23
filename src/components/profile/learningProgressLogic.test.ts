import { strict as assert } from "node:assert";
import test from "node:test";
import {
  computeWeeklyActivity,
  groupRecentActivities,
  getSkillDisplayMetrics,
  getLearnerMilestones,
  formatFriendlyDate,
} from "./learningProgressLogic.ts";
import type { SkillProgressSummary, LearningActivity } from "@/lib/api/services/user.service";

test("formatFriendlyDate handles today, yesterday, and formatted dates", () => {
  const now = new Date();
  assert.equal(formatFriendlyDate(now.toISOString()), "Hôm nay");

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  assert.equal(formatFriendlyDate(yesterday.toISOString()), "Hôm qua");

  assert.equal(formatFriendlyDate(null), "Chưa học");
  assert.equal(formatFriendlyDate(""), "Chưa học");
});

test("computeWeeklyActivity creates 7 days and correctly tallies active days", () => {
  const ref = new Date("2026-10-22T10:00:00Z");
  const activities: LearningActivity[] = [
    {
      id: 1,
      type: "VOCAB",
      title: "Học từ vựng",
      detail: "Apple",
      score: 100,
      durationSec: 30,
      occurredAt: "2026-10-22T08:00:00Z",
    },
    {
      id: 2,
      type: "VOCAB",
      title: "Học từ vựng",
      detail: "Banana",
      score: 100,
      durationSec: 30,
      occurredAt: "2026-10-22T09:00:00Z",
    },
    {
      id: 3,
      type: "LISTENING",
      title: "Luyện nghe",
      detail: "Part 1",
      score: 80,
      durationSec: 120,
      occurredAt: "2026-10-20T14:00:00Z",
    },
  ];

  const weekly = computeWeeklyActivity(activities, ref);
  assert.equal(weekly.days.length, 7);
  assert.equal(weekly.activeDaysCount, 2); // 2026-10-20 and 2026-10-22
  assert.equal(weekly.totalActivitiesThisWeek, 3);
  assert.equal(weekly.days[6].count, 2); // today (Oct 22)
  assert.equal(weekly.days[6].isActive, true);
});

test("computeWeeklyActivity uses the application Vietnam timezone at the day boundary", () => {
  const weekly = computeWeeklyActivity(
    [
      {
        id: 4,
        type: "LISTENING_PRACTICE_COMPLETED",
        title: "Listening",
        detail: null,
        score: 80,
        durationSec: 60,
        // 00:30 on 22/10 in Vietnam, not 21/10.
        occurredAt: "2026-10-21T17:30:00.000Z",
      },
    ],
    new Date("2026-10-22T10:00:00.000Z"),
  );

  assert.equal(weekly.days[6].dateStr, "2026-10-22");
  assert.equal(weekly.days[6].count, 1);
});

test("groupRecentActivities groups same-day vocab entries and hides technical names", () => {
  const activities: LearningActivity[] = [
    {
      id: 10,
      type: "VOCAB_LEARNED",
      title: "Học từ vựng",
      detail: "Từ: Horizon",
      score: null,
      durationSec: 10,
      occurredAt: "2026-10-22T08:00:00Z",
    },
    {
      id: 11,
      type: "VOCAB_LEARNED",
      title: "Học từ vựng",
      detail: "Từ: Paradigm",
      score: null,
      durationSec: 10,
      occurredAt: "2026-10-22T08:05:00Z",
    },
    {
      id: 12,
      type: "VOCAB_LEARNED",
      title: "Học từ vựng",
      detail: "Từ: Velocity",
      score: null,
      durationSec: 10,
      occurredAt: "2026-10-22T08:10:00Z",
    },
    {
      id: 13,
      type: "DIAGNOSTIC",
      title: "Entry Diagnostic v2",
      detail: "Bài kiểm tra đầu vào",
      score: 85,
      durationSec: 600,
      occurredAt: "2026-10-21T10:00:00Z",
    },
  ];

  const grouped = groupRecentActivities(activities);
  assert.equal(grouped.length, 2);

  // Group 1: 3 vocab items
  assert.equal(grouped[0].title, "Học từ vựng");
  assert.equal(grouped[0].count, 3);
  assert.equal(grouped[0].detail, "Đã ghi nhớ 3 từ vựng mới");

  // Group 2: Diagnostic with sanitized title
  assert.equal(grouped[1].title, "Đánh giá đầu vào");
  assert.equal(grouped[1].count, 1);
  assert.equal(grouped[1].detail.includes("85%"), true);
});

test("groupRecentActivities does not merge unrelated exercises and hides technical runtime names", () => {
  const grouped = groupRecentActivities([
    {
      id: 20,
      type: "TOEIC_ATTEMPT",
      title: "TOEIC_ATTEMPT",
      detail: null,
      score: 70,
      durationSec: null,
      occurredAt: "2026-10-22T08:00:00.000Z",
    },
    {
      id: 21,
      type: "COURSE_LESSON",
      title: "CourseLessonAttempt",
      detail: null,
      score: null,
      durationSec: null,
      occurredAt: "2026-10-22T09:00:00.000Z",
    },
  ]);

  assert.equal(grouped.length, 2);
  assert.equal(grouped[0].title, "Luyện đề TOEIC");
  assert.equal(grouped[1].title, "Bài học khóa học");
});

test("getSkillDisplayMetrics solves 0/13 = 0% Speaking contradiction", () => {
  const speakingSkill: SkillProgressSummary = {
    skill: "SPEAKING",
    title: "Speaking",
    categoryLabel: "Nói và phát âm",
    totalItems: 13,
    completedItems: 0,
    progressPercent: 0,
    levelRange: "A1 - C1",
    badge: "Phản hồi",
    unitLabel: "bài luyện",
    totalExercises: 67,
    completedExercises: 3,
    completedAttempts: 3,
    normalizedScore: 60,
    recentAverage: 60,
    trend: "STABLE",
    statusLabel: "Cần luyện thêm",
    hasEnoughData: true,
  };

  const metrics = getSkillDisplayMetrics(speakingSkill);

  // Should NOT display 0/13 or 0% when 3 exercises are completed
  assert.equal(metrics.primaryValue, "3/67 phần luyện");
  assert.equal(metrics.primarySub, "Đã bắt đầu luyện tập");
  assert.equal(metrics.percent > 0, true);
  assert.equal(metrics.scoreText, "60% điểm trung bình");
  assert.equal(metrics.ctaLabel, "Luyện nói");
  assert.equal(metrics.ctaHref, "/speaking");
});

test("getSkillDisplayMetrics distinguishes no data from zero score", () => {
  const noDataSkill: SkillProgressSummary = {
    skill: "WRITING",
    title: "Writing",
    categoryLabel: "Viết",
    totalItems: 10,
    completedItems: 0,
    progressPercent: 0,
    levelRange: "A1 - C1",
    badge: "AI phản hồi",
    unitLabel: "đề bài",
    completedAttempts: 0,
    normalizedScore: null,
    hasEnoughData: false,
  };

  const metrics = getSkillDisplayMetrics(noDataSkill);
  assert.equal(metrics.scoreText, "Chưa đủ dữ liệu");
  assert.equal(metrics.hasScore, false);
  assert.equal(metrics.statusLabel, "Chưa đủ dữ liệu");
  assert.equal(metrics.statusColor, "slate");
});

test("getSkillDisplayMetrics keeps no-data, zero-completion, and zero-score distinct", () => {
  const noData = getSkillDisplayMetrics({
    skill: "WRITING",
    title: "Writing",
    categoryLabel: "Viết",
    totalItems: 0,
    completedItems: 0,
    progressPercent: 0,
    levelRange: "A1 - C1",
    badge: "AI phản hồi",
    unitLabel: "đề bài",
    completedAttempts: 0,
    normalizedScore: null,
    hasEnoughData: false,
  });
  const zeroCompletion = getSkillDisplayMetrics({
    skill: "WRITING",
    title: "Writing",
    categoryLabel: "Viết",
    totalItems: 8,
    completedItems: 0,
    progressPercent: 0,
    levelRange: "A1 - C1",
    badge: "AI phản hồi",
    unitLabel: "đề bài",
    completedAttempts: 0,
    normalizedScore: null,
    hasEnoughData: false,
  });
  const zeroScore = getSkillDisplayMetrics({
    skill: "WRITING",
    title: "Writing",
    categoryLabel: "Viết",
    totalItems: 8,
    completedItems: 1,
    progressPercent: 13,
    levelRange: "A1 - C1",
    badge: "AI phản hồi",
    unitLabel: "đề bài",
    completedAttempts: 1,
    normalizedScore: 0,
    hasEnoughData: true,
  });

  assert.equal(noData.primaryValue, "Chưa có bài");
  assert.equal(zeroCompletion.primaryValue, "0/8 đề bài");
  assert.equal(zeroCompletion.primarySub, "Chưa bắt đầu luyện");
  assert.equal(zeroScore.scoreText, "0% điểm trung bình");
  assert.notEqual(noData.primaryValue, zeroCompletion.primaryValue);
  assert.notEqual(zeroCompletion.scoreText, zeroScore.scoreText);
});

test("getLearnerMilestones extracts real milestones without fake gamification", () => {
  const milestones = getLearnerMilestones(
    {
      streakCount: 5,
      streakFreezes: 0,
      totalBanhRan: 100,
      quizAccuracy: 80,
      speakingAccuracy: 75,
      totalPoints: 500,
      weeklyExp: 200,
      tier: "SILVER",
      masteredVocabCount: 39,
      totalQuizzesDone: 15,
      totalToeicTestsDone: 2,
    },
    12,
  );

  assert.equal(milestones.length, 3);
  assert.equal(milestones[0].title, "39 Từ vựng đã nhớ");
  assert.equal(milestones[1].title, "5 Ngày học liên tiếp");
  assert.equal(milestones[2].title, "2 Lượt thi TOEIC");
});
