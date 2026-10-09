import assert from "node:assert/strict";
import test from "node:test";
import {
  isLearningFocusRoute,
  isPracticeRoomPath,
  isToeicAttemptPath,
  resolveAssessmentPolicy,
  shouldHideStudentNavigation,
} from "./focusMode.ts";

test("Route classification: Active answering rooms hide global navigation", () => {
  // Numeric IDs
  assert.equal(isLearningFocusRoute("/speaking/123"), true);
  assert.equal(isLearningFocusRoute("/listening/456"), true);
  assert.equal(isLearningFocusRoute("/writing/789"), true);
  assert.equal(isLearningFocusRoute("/flashcard/999"), true);
  assert.equal(isLearningFocusRoute("/toeic/attempts/1"), true);
  assert.equal(isLearningFocusRoute("/diagnostic"), false);
  assert.equal(isLearningFocusRoute("/vocabulary/study"), true);

  // Dynamic non-numeric IDs (alphanumeric, UUID, slugs)
  assert.equal(isLearningFocusRoute("/speaking/topic-travel-01"), true);
  assert.equal(isLearningFocusRoute("/listening/listening-quiz-uuid"), true);
  assert.equal(isLearningFocusRoute("/writing/essay-argument-02"), true);
  assert.equal(isLearningFocusRoute("/flashcard/business-vocab-advanced"), true);
  assert.equal(isLearningFocusRoute("/toeic/attempts/attempt-uuid-7788"), true);
});

test("Route classification: Catalog, pre-start briefing, and hub pages retain global navigation", () => {
  // Catalogs
  assert.equal(isLearningFocusRoute("/dashboard"), false);
  assert.equal(isLearningFocusRoute("/listening"), false);
  assert.equal(isLearningFocusRoute("/reading"), false);
  assert.equal(isLearningFocusRoute("/reading/12"), true); // exact Reading exercise
  assert.equal(isLearningFocusRoute("/reading/topic-food"), true); // canonical IDs remain route-safe
  assert.equal(isLearningFocusRoute("/writing"), false);
  assert.equal(isLearningFocusRoute("/speaking"), false);
  assert.equal(isLearningFocusRoute("/flashcard"), false);
  assert.equal(isLearningFocusRoute("/flashcard"), false);
  assert.equal(isLearningFocusRoute("/grammar"), false);

  // Pre-start TOEIC briefing (before attempt starts)
  assert.equal(isLearningFocusRoute("/toeic/1"), false);
  assert.equal(isLearningFocusRoute("/toeic/exam-uuid-45"), false);
  assert.equal(isLearningFocusRoute("/toeic/bundle/10"), false);
});

test("Route classification: Result and review pages retain global navigation", () => {
  assert.equal(isLearningFocusRoute("/listening/submissions/123"), false);
  assert.equal(isLearningFocusRoute("/reading/submissions/sub-uuid"), false);
  assert.equal(isLearningFocusRoute("/toeic/results/456"), false);
  assert.equal(isLearningFocusRoute("/toeic/results/attempt-uuid"), false);
});

test("isPracticeRoomPath and isToeicAttemptPath helpers", () => {
  assert.equal(isPracticeRoomPath("/speaking/1"), true);
  assert.equal(isPracticeRoomPath("/reading/1"), true);
  assert.equal(isPracticeRoomPath("/toeic/attempts/1"), true);
  assert.equal(isToeicAttemptPath("/toeic/attempts/1"), true);
  assert.equal(isToeicAttemptPath("/toeic/attempts/uuid-99"), true);
  assert.equal(isToeicAttemptPath("/toeic/1"), false);
  assert.equal(isPracticeRoomPath("/listening"), false);
  assert.equal(isPracticeRoomPath("/toeic/results/1"), false);
  assert.equal(isPracticeRoomPath("/diagnostic"), false);
});

test("shouldHideStudentNavigation with runtime override", () => {
  // Respects runtime boolean override
  assert.equal(shouldHideStudentNavigation("/grammar", true), true);
  assert.equal(shouldHideStudentNavigation("/grammar", false), false);
  assert.equal(shouldHideStudentNavigation("/diagnostic", true), true);
  assert.equal(shouldHideStudentNavigation("/diagnostic", false), false);
  assert.equal(shouldHideStudentNavigation("/speaking/1", false), false);

  // Defaults to route classification when null/undefined
  assert.equal(shouldHideStudentNavigation("/speaking/1", null), true);
  assert.equal(shouldHideStudentNavigation("/dashboard", undefined), false);
});

test("Assessment Policy Matrix: Individual skill practice never requires fullscreen or anti-cheat", () => {
  const skills: Array<"SPEAKING" | "LISTENING" | "READING" | "WRITING" | "VOCABULARY" | "GRAMMAR"> = [
    "SPEAKING",
    "LISTENING",
    "READING",
    "WRITING",
    "VOCABULARY",
    "GRAMMAR",
  ];

  for (const skill of skills) {
    const policy = resolveAssessmentPolicy({ kind: skill });
    assert.equal(policy.requiresFullscreen, false, `${skill} must not require fullscreen`);
    assert.equal(policy.enableAntiCheat, false, `${skill} must not enable anti-cheat`);
    assert.equal(policy.allowCopyPaste, true, `${skill} must allow copy/paste`);
    assert.equal(policy.allowContextMenu, true, `${skill} must allow context menu`);
    assert.equal(policy.hideGlobalNavigation, true, `${skill} must hide global navigation`);
  }
});

test("Assessment Policy Matrix: TOEIC FULL_TEST enforces fullscreen and strict anti-cheat", () => {
  const policy = resolveAssessmentPolicy({ kind: "TOEIC", mode: "FULL_TEST" });
  assert.equal(policy.requiresFullscreen, true);
  assert.equal(policy.enableAntiCheat, true);
  assert.equal(policy.allowCopyPaste, false);
  assert.equal(policy.allowContextMenu, false);
  assert.equal(policy.hideGlobalNavigation, true);
});

test("Assessment Policy Matrix: TOEIC PRACTICE requests fullscreen on start but disables anti-cheat", () => {
  const policy = resolveAssessmentPolicy({ kind: "TOEIC", mode: "PRACTICE" });
  assert.equal(policy.requiresFullscreen, true);
  assert.equal(policy.enableAntiCheat, false, "TOEIC PRACTICE must not enable anti-cheat");
  assert.equal(policy.allowCopyPaste, true, "TOEIC PRACTICE must allow copy/paste");
  assert.equal(policy.allowContextMenu, true, "TOEIC PRACTICE must allow context menu");
  assert.equal(policy.hideGlobalNavigation, true);
});

test("Assessment Policy Matrix: Diagnostic assessment enforces fullscreen and anti-cheat", () => {
  const policy = resolveAssessmentPolicy({ kind: "DIAGNOSTIC" });
  assert.equal(policy.requiresFullscreen, true);
  assert.equal(policy.enableAntiCheat, true);
  assert.equal(policy.allowCopyPaste, false);
  assert.equal(policy.allowContextMenu, false);
  assert.equal(policy.hideGlobalNavigation, true);
});
