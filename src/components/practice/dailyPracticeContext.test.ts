import assert from "node:assert/strict";
import test from "node:test";
import type { DailyPracticeResponse } from "@/lib/api/services/user.service";
import { projectDailyPracticeForSkill } from "./dailyPracticeContext.ts";

const plan: DailyPracticeResponse = {
  dateKey: "2026-10-08",
  generatedAt: "2026-10-08T00:00:00.000Z",
  estimatedMinutes: 15,
  targetActivities: 3,
  completedCount: 1,
  reasonSummary: "Củng cố kỹ năng cần luyện",
  items: [
    {
      skill: "SPEAKING",
      exerciseId: 12,
      title: "Speaking 12",
      route: "/speaking/12",
      estimatedMinutes: 4,
      reasonCode: "WEAKEST_SKILL",
      reasonLabel: "Luyện nói",
      isLocked: false,
      isCompleted: false,
      priority: 1,
      dimension: null,
    },
    {
      skill: "WRITING",
      exerciseId: 17,
      title: "Writing 17",
      route: "/writing/17",
      estimatedMinutes: 6,
      reasonCode: "NEEDS_MORE_DATA",
      reasonLabel: "Luyện viết",
      isLocked: false,
      isCompleted: true,
      priority: 2,
      dimension: null,
    },
    {
      skill: "READING",
      exerciseId: 14,
      title: "Reading 14",
      route: "/listening/14",
      estimatedMinutes: 5,
      reasonCode: "BALANCED_START",
      reasonLabel: "Luyện đọc",
      isLocked: false,
      isCompleted: false,
      priority: 3,
      dimension: null,
    },
  ],
};

test("skill projection keeps only the canonical skill slice and local counter", () => {
  const speaking = projectDailyPracticeForSkill(plan, "SPEAKING");
  assert.deepEqual(speaking?.items.map((item) => item.exerciseId), [12]);
  assert.equal(speaking?.targetActivities, 1);
  assert.equal(speaking?.completedCount, 0);
});

test("global plan remains available and empty skill slices do not invent work", () => {
  assert.equal(plan.items.length, 3);
  assert.equal(projectDailyPracticeForSkill(plan, "LISTENING"), undefined);
});

test("CTA routes stay attached to canonical IDs when plan order changes", () => {
  const reordered = { ...plan, items: [...plan.items].reverse() };
  const writing = projectDailyPracticeForSkill(reordered, "WRITING");
  assert.equal(writing?.items[0]?.exerciseId, 17);
  assert.equal(writing?.items[0]?.route, "/writing/17");
});
