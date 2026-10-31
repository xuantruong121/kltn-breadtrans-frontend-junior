import assert from "node:assert/strict";
import test from "node:test";

import {
  catalogHref,
  dependsOnLevel,
  formatRetryAt,
  gateClosedMessage,
  gateHref,
  levelLockOf,
  parseGateSkill,
  progressLine,
  progressRule,
  unansweredCount,
  type GateQuestion,
} from "./levelLock.ts";

const progress = { done: 2, needed: 3, neededAverage: 70, average: 64 };

test("a list row's plan counts only when the row is plan-locked", () => {
  assert.deepEqual(levelLockOf("WRITING", { practiceLevel: "INTERMEDIATE", isLocked: true, requiredPlan: "PLUS" }), {
    skill: "WRITING",
    level: "INTERMEDIATE",
    requiredPlan: "PLUS",
  });
  assert.equal(levelLockOf("WRITING", { isLocked: false, requiredPlan: "PLUS" }).requiredPlan, null);
  assert.equal(levelLockOf("READING", { isLocked: true, requiredPlan: "FREE" }).requiredPlan, null);
});

test("progress reads as lessons, and as exercises for Speaking", () => {
  assert.equal(progressLine("READING", progress), "2/3 bài, trung bình 64%");
  assert.equal(progressLine("SPEAKING", { ...progress, average: null }), "2/3 câu luyện");
  assert.equal(progressLine("READING", { ...progress, done: 5 }), "3/3 bài, trung bình 64%");
  assert.equal(progressRule("WRITING", progress), "3 bài khác nhau, trung bình từ 70%");
});

test("only Listening and Reading have a gate route", () => {
  assert.equal(parseGateSkill("listening"), "LISTENING");
  assert.equal(parseGateSkill("READING"), "READING");
  assert.equal(parseGateSkill("speaking"), null);
  assert.equal(parseGateSkill(undefined), null);
  assert.equal(gateHref("READING"), "/gate/reading");
  assert.equal(catalogHref("WRITING"), "/writing");
});

test("a retry time reads in local time", () => {
  assert.equal(formatRetryAt(new Date(2026, 10, 1, 9, 5).toISOString()), "09:05, 01/11");
});

test("a closed gate says why, and never claims a certificate", () => {
  assert.match(gateClosedMessage("PROGRESS_ONLY"), /tiến độ/);
  assert.match(gateClosedMessage("TOP_LEVEL"), /cao nhất/);
  assert.match(gateClosedMessage("NO_QUESTIONS"), /chưa đủ câu hỏi/);
  for (const reason of ["PROGRESS_ONLY", "TOP_LEVEL", "NO_QUESTIONS"] as const)
    assert.doesNotMatch(gateClosedMessage(reason), /CEFR|chứng chỉ|[ABC][12]/);
});

test("unanswered questions are counted", () => {
  const questions = [{ id: 1 }, { id: 2 }] as GateQuestion[];
  assert.equal(unansweredCount(questions, { 1: "a" }), 1);
  assert.equal(unansweredCount(questions, { 1: "a", 2: "b" }), 0);
});

test("an attempt refreshes the learning path and the level-marked lists", () => {
  for (const key of ["learning-path-profile", "learning-path-today", "reading-exercises", "writing-topics"])
    assert.equal(dependsOnLevel([key]), true);
  assert.equal(dependsOnLevel(["myPet"]), false);
  assert.equal(dependsOnLevel([1]), false);
});
