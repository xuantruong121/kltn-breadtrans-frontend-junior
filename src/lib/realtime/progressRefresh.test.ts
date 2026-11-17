import assert from "node:assert/strict";
import test from "node:test";

import { PLAN_UPDATE_QUERY_KEYS, PROGRESS_QUERY_KEYS } from "./progressRefresh.ts";
import { PLAN_QUERY_KEYS } from "../../modules/subscription/planLogic.ts";

const joined = (keys: readonly (readonly string[])[]) => keys.map((key) => key.join("/"));

test("rewards applied: streak, XP, Bánh Mì, quests, mistakes and unlocked levels refetch", () => {
  const keys = joined(PROGRESS_QUERY_KEYS);
  for (const key of [
    "user-stats",
    "profile",
    "market-balance",
    "dashboard-today",
    "myQuests",
    "daily-quests",
    "my-pet",
    "my-badges",
    "mistakes",
    "notifications",
    "learning-path-profile",
    "listeningPractices",
    "reading-exercises",
    "speaking-exercises",
    "writing-topics",
  ]) {
    assert.ok(keys.includes(key), key);
  }
});

test("plan changed: the plan keys the payment modal refreshes, plus shields and notices", () => {
  const keys = joined(PLAN_UPDATE_QUERY_KEYS);
  for (const key of [
    PLAN_QUERY_KEYS.effectivePlan,
    PLAN_QUERY_KEYS.catalog,
    PLAN_QUERY_KEYS.myPurchases,
    PLAN_QUERY_KEYS.expirySummary,
    PLAN_QUERY_KEYS.dailyUsage,
    PLAN_QUERY_KEYS.vocabTopics,
    PLAN_QUERY_KEYS.readingExercises,
    PLAN_QUERY_KEYS.listeningPractices,
    PLAN_QUERY_KEYS.speakingExercises,
    PLAN_QUERY_KEYS.writingTopics,
  ]) {
    assert.ok(keys.includes(key.join("/")), key.join("/"));
  }
  for (const key of ["user-stats", "notifications"]) assert.ok(keys.includes(key), key);
});

test("each key is a prefix and no exercise detail is refetched mid-exercise", () => {
  for (const key of [...PROGRESS_QUERY_KEYS, ...PLAN_UPDATE_QUERY_KEYS]) {
    assert.equal(key.length, 1, key.join("/"));
    assert.ok(!["quiz", "speaking-exercise", "writing-topic", "toeic-attempt"].includes(key[0]), key[0]);
  }
});
