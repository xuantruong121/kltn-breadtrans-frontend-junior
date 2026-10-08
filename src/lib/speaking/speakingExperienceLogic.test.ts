import assert from "node:assert/strict";
import test from "node:test";
import { findPreviousCompletedAttempt, presentSpeakingProgress, resolveSpeakingMode, scoreDelta } from "./speakingExperienceLogic.ts";

test("resolves learner-friendly speaking modes from existing metadata", () => {
  assert.equal(resolveSpeakingMode({ title: "Read Aloud A1", category: "GENERAL" }).id, "READ_ALOUD");
  assert.equal(resolveSpeakingMode({ title: "Opinion B1", category: "GENERAL" }).id, "OPINION");
  assert.equal(resolveSpeakingMode({ title: "TOEIC Speaking — Describe Office Scene", category: "TOEIC" }).id, "DESCRIBE");
});

test("compares only compatible completed attempts", () => {
  const previous = findPreviousCompletedAttempt([
    { id: 1, exerciseId: 4, status: "FAILED", overallScore: 20, submittedAt: "2026-01-01" },
    { id: 2, exerciseId: 4, status: "COMPLETED", overallScore: 65, submittedAt: "2026-01-02" },
  ], 4, 3);
  assert.equal(previous?.overallScore, 65);
  assert.equal(scoreDelta(78, previous?.overallScore), 13);
});

test("does not invent a completion denominator from a performance score", () => {
  const presentation = presentSpeakingProgress({ completedItems: 2, totalItems: 0 });
  assert.deepEqual(presentation, {
    completedItems: 2,
    totalItems: null,
    completionPercent: null,
  });
  assert.equal(presentSpeakingProgress({ completedItems: 2, totalItems: 0 }).completionPercent, null);
});
