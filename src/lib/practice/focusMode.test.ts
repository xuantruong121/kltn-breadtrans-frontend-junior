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
  assert.equal(isLearningFocusRoute("/practice/speaking/123"), true);
  assert.equal(isLearningFocusRoute("/practice/quizzes/456"), true);
  assert.equal(isLearningFocusRoute("/practice/writing/789"), true);
  assert.equal(isLearningFocusRoute("/practice/vocab/999"), true);
  assert.equal(isLearningFocusRoute("/practice/toeic/attempts/1"), true);
  assert.equal(isLearningFocusRoute("/diagnostic"), false);
  assert.equal(isLearningFocusRoute("/vocabulary/study"), true);

  // Dynamic non-numeric IDs (alphanumeric, UUID, slugs)
  assert.equal(isLearningFocusRoute("/practice/speaking/topic-travel-01"), true);
  assert.equal(isLearningFocusRoute("/practice/quizzes/listening-quiz-uuid"), true);
  assert.equal(isLearningFocusRoute("/practice/writing/essay-argument-02"), true);
  assert.equal(isLearningFocusRoute("/practice/vocab/business-vocab-advanced"), true);
  assert.equal(isLearningFocusRoute("/practice/toeic/attempts/attempt-uuid-7788"), true);
});

test("Route classification: Catalog, pre-start briefing, and hub pages retain global navigation", () => {
  // Catalogs
  assert.equal(isLearningFocusRoute("/practice"), false);
  assert.equal(isLearningFocusRoute("/practice/listening"), false);
  assert.equal(isLearningFocusRoute("/practice/reading"), false);
  assert.equal(isLearningFocusRoute("/practice/reading/12"), false); // topic list page
  assert.equal(isLearningFocusRoute("/practice/reading/topic-food"), false);
  assert.equal(isLearningFocusRoute("/practice/writing"), false);
  assert.equal(isLearningFocusRoute("/practice/speaking"), false);
  assert.equal(isLearningFocusRoute("/practice/vocab"), false);
  assert.equal(isLearningFocusRoute("/flashcard"), false);
  assert.equal(isLearningFocusRoute("/grammar"), false);

  // Pre-start TOEIC briefing (before attempt starts)
  assert.equal(isLearningFocusRoute("/practice/toeic/1"), false);
  assert.equal(isLearningFocusRoute("/practice/toeic/exam-uuid-45"), false);
  assert.equal(isLearningFocusRoute("/practice/toeic/bundle/10"), false);
});

test("Route classification: Result and review pages retain global navigation", () => {
  assert.equal(isLearningFocusRoute("/practice/quizzes/submissions/123"), false);
  assert.equal(isLearningFocusRoute("/practice/quizzes/submissions/sub-uuid"), false);
  assert.equal(isLearningFocusRoute("/practice/toeic/results/456"), false);
  assert.equal(isLearningFocusRoute("/practice/toeic/results/attempt-uuid"), false);
});

test("isPracticeRoomPath and isToeicAttemptPath helpers", () => {
  assert.equal(isPracticeRoomPath("/practice/speaking/1"), true);
  assert.equal(isPracticeRoomPath("/practice/toeic/attempts/1"), true);
  assert.equal(isToeicAttemptPath("/practice/toeic/attempts/1"), true);
  assert.equal(isToeicAttemptPath("/practice/toeic/attempts/uuid-99"), true);
  assert.equal(isToeicAttemptPath("/practice/toeic/1"), false);
  assert.equal(isPracticeRoomPath("/practice/listening"), false);
  assert.equal(isPracticeRoomPath("/practice/toeic/results/1"), false);
  assert.equal(isPracticeRoomPath("/diagnostic"), false);
});

test("shouldHideStudentNavigation with runtime override", () => {
  // Respects runtime boolean override
  assert.equal(shouldHideStudentNavigation("/grammar", true), true);
  assert.equal(shouldHideStudentNavigation("/grammar", false), false);
  assert.equal(shouldHideStudentNavigation("/diagnostic", true), true);
  assert.equal(shouldHideStudentNavigation("/diagnostic", false), false);
  assert.equal(shouldHideStudentNavigation("/practice/speaking/1", false), false);

  // Defaults to route classification when null/undefined
  assert.equal(shouldHideStudentNavigation("/practice/speaking/1", null), true);
  assert.equal(shouldHideStudentNavigation("/practice", undefined), false);
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
