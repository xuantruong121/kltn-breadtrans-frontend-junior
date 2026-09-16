/**
 * Deterministic Test Suite for Pet Domain Logic and Focus Mode Guard.
 * Uses Node.js native test runner (`node --test`).
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getPetVisualState,
  formatPetCooldown,
  canFeedPet,
  getFeedingInvalidationKeys,
  handleFeedFailure,
  shouldRenderCompanion,
  shouldRenderFloatingAiTutor,
  getPetRecommendation,
  resolveFloatingPetUIState,
  getFloatingPetBoundingBox,
} from "./petLogic.ts";
import { isLearningFocusRoute } from "../../lib/practice/focusMode.ts";

test("Pet Visual State: resolves deterministic poses with correct priority", () => {
  // 1. Level up has highest priority
  assert.equal(
    getPetVisualState({
      isLevelUp: true,
      isJustFed: true,
      health: 20,
      canFeed: false,
    }),
    "levelup",
  );

  // 2. Just fed has next priority
  assert.equal(
    getPetVisualState({
      isJustFed: true,
      health: 30,
      canFeed: false,
    }),
    "fed",
  );

  // 3. Learning route state
  assert.equal(
    getPetVisualState({
      isLearningRoute: true,
      health: 80,
      happiness: 85,
      canFeed: true,
    }),
    "learning",
  );

  // 4. Hungry state when health < 40 or happiness < 40
  assert.equal(
    getPetVisualState({
      health: 35,
      happiness: 80,
      canFeed: true,
    }),
    "hungry",
  );
  assert.equal(
    getPetVisualState({
      health: 80,
      happiness: 30,
      canFeed: true,
    }),
    "hungry",
  );

  // 5. Full state when the server marks the pet as naturally full
  assert.equal(
    getPetVisualState({
      health: 80,
      happiness: 80,
      canFeed: false,
      satietyState: "FULL",
    }),
    "fed",
  );

  // 6. Default idle state
  assert.equal(
    getPetVisualState({
      health: 85,
      happiness: 90,
      canFeed: true,
    }),
    "idle",
  );
});

test("canFeedPet: evaluates eligibility strictly from backend metadata and user balance", () => {
  // Case: canFeed === true and sufficient balance
  const resultEligible = canFeedPet({ canFeed: true, feedCost: 10 }, 50);
  assert.equal(resultEligible.allowed, true);
  assert.equal(resultEligible.feedCost, 10);

  // Case: canFeed === true but custom backend feedCost (e.g. 15) and insufficient balance
  const resultLowBalance = canFeedPet({ canFeed: true, feedCost: 15 }, 12);
  assert.equal(resultLowBalance.allowed, false);
  assert.equal(resultLowBalance.feedCost, 15);
  assert.match(resultLowBalance.reason || "", /cần ít nhất 15 Bánh Mì/i);

  // Case: canFeed === false because the pet is full
  const resultOnCooldown = canFeedPet({ canFeed: false, satietyState: "FULL", feedCost: 10 }, 100);
  assert.equal(resultOnCooldown.allowed, false);
  assert.match(resultOnCooldown.reason || "", /đang no/);

  // Case: null or undefined pet data
  const resultNoPet = canFeedPet(null, 50);
  assert.equal(resultNoPet.allowed, false);
  assert.match(resultNoPet.reason || "", /Chưa có thông tin/);
});

test("formatPetCooldown: produces friendly, deterministic Vietnamese strings", () => {
  const baseTime = new Date("2026-09-15T12:00:00.000Z");

  // No nextFeedAt or past time
  assert.equal(formatPetCooldown(null, baseTime), "Sẵn sàng cho ăn");
  assert.equal(
    formatPetCooldown("2026-09-15T11:59:00.000Z", baseTime),
    "Sẵn sàng cho ăn",
  );

  // Exact hours and minutes
  const future3h25m = new Date("2026-09-15T15:25:00.000Z").toISOString();
  assert.equal(
    formatPetCooldown(future3h25m, baseTime),
    "Có thể cho ăn sau 3 giờ 25 phút",
  );

  // Exact hours only
  const future2h = new Date("2026-09-15T14:00:00.000Z").toISOString();
  assert.equal(formatPetCooldown(future2h, baseTime), "Có thể cho ăn sau 2 giờ");

  // Minutes only
  const future45m = new Date("2026-09-15T12:45:00.000Z").toISOString();
  assert.equal(
    formatPetCooldown(future45m, baseTime),
    "Có thể cho ăn sau 45 phút",
  );

  // Under 1 minute
  const future30s = new Date("2026-09-15T12:00:30.000Z").toISOString();
  assert.equal(
    formatPetCooldown(future30s, baseTime),
    "Có thể cho ăn sau ít hơn 1 phút",
  );
});

test("Feed Success Invalidation Keys: includes all required query keys", () => {
  const userId = 42;
  const keys = getFeedingInvalidationKeys(userId);

  // Must include pet query, user stats, profile, dashboard today, market balance
  assert.deepEqual(keys, [
    ["my-pet", 42],
    ["user-stats", 42],
    ["profile", 42],
    ["dashboard-today", 42],
    "market-balance",
  ]);
});

test("Feed Failure: preserves balance without local mutation and maps error message", () => {
  const initialBalance = 75;
  const backendError = {
    response: {
      data: {
        message: "Bạn chưa đủ Bánh Mì để thực hiện thao tác này.",
      },
    },
  };

  const outcome = handleFeedFailure(backendError, initialBalance);
  // Guarantee zero local balance decrement on error
  assert.equal(outcome.balance, initialBalance);
  assert.equal(
    outcome.errorMessage,
    "Bạn chưa đủ Bánh Mì để thực hiện thao tác này.",
  );
});

test("Practice Focus Mode: hides companion and suppresses FloatingAiTutor", () => {
  // During active assessments (isFocusMode === true)
  assert.equal(shouldRenderCompanion(true), false);
  assert.equal(shouldRenderFloatingAiTutor(true), false);

  // Outside active assessments (dashboard, catalogs, overview)
  assert.equal(shouldRenderCompanion(false), true);
  assert.equal(shouldRenderFloatingAiTutor(false), true);
});

test("Pet recommendation: uses the first actionable incomplete quest", () => {
  assert.deepEqual(
    getPetRecommendation([
      { title: "Đã xong", isCompleted: true, actionUrl: "/practice" },
      {
        title: "Học từ vựng",
        description: "Ôn 10 từ mới",
        isCompleted: false,
        actionLabel: "Học ngay",
        actionUrl: "/flashcard/1",
      },
    ]),
    {
      title: "Học từ vựng",
      description: "Ôn 10 từ mới",
      actionLabel: "Học ngay",
      actionUrl: "/flashcard/1",
    },
  );
  assert.equal(getPetRecommendation([{ isCompleted: true, actionUrl: "/practice" }]), null);
});

test("Route Focus Visibility: low-focus discovery routes show companion, active learning routes hide companion", () => {
  // Low-focus pages: companion is visible
  const discoveryRoutes = [
    "/dashboard",
    "/",
    "/courses",
    "/my-courses",
    "/practice",
    "/practice/listening",
    "/practice/reading",
    "/practice/speaking",
    "/practice/writing",
    "/practice/vocab",
    "/grammar",
    "/flashcard",
    "/learn",
    "/history",
    "/market",
    "/arena",
    "/pet",
    "/student/profile",
  ];

  for (const route of discoveryRoutes) {
    const isFocus = isLearningFocusRoute(route);
    assert.equal(isFocus, false, `Route ${route} should not be in focus mode`);
    assert.equal(shouldRenderCompanion(isFocus), true);
  }

  // Active learning assessments: companion must be hidden
  assert.equal(isLearningFocusRoute("/practice/quizzes/123"), true); // active quiz
  assert.equal(isLearningFocusRoute("/practice/toeic/attempts/99"), true); // active TOEIC attempt
  assert.equal(isLearningFocusRoute("/practice/speaking/45"), true); // active speaking recording
  assert.equal(isLearningFocusRoute("/practice/writing/67"), true); // active writing editor
  assert.equal(isLearningFocusRoute("/practice/vocab/88"), true); // active vocab exercise
  assert.equal(isLearningFocusRoute("/vocabulary/study"), true); // active flashcard study
  assert.equal(isLearningFocusRoute("/diagnostic"), true); // active diagnostic
  assert.equal(isLearningFocusRoute("/diagnostic/1"), true);

  // Transition back to low-focus: visible again
  assert.equal(shouldRenderCompanion(isLearningFocusRoute("/practice/quizzes/123")), false);
  assert.equal(shouldRenderCompanion(isLearningFocusRoute("/practice/quizzes")), true);
});

test("Floating UI States: transitions cleanly between HIDDEN, COLLAPSED, MESSAGE, and EXPANDED", () => {
  // 1. Focus mode forces HIDDEN regardless of expansion or messages
  assert.equal(
    resolveFloatingPetUIState({ isFocusMode: true, isExpanded: true, hasMessage: true }),
    "HIDDEN",
  );
  assert.equal(
    resolveFloatingPetUIState({ isFocusMode: true, isExpanded: false, hasMessage: false }),
    "HIDDEN",
  );

  // 2. Outside focus mode, when expanded -> EXPANDED
  assert.equal(
    resolveFloatingPetUIState({ isFocusMode: false, isExpanded: true, hasMessage: true }),
    "EXPANDED",
  );
  assert.equal(
    resolveFloatingPetUIState({ isFocusMode: false, isExpanded: true, hasMessage: false }),
    "EXPANDED",
  );

  // 3. Has pending message -> MESSAGE
  assert.equal(
    resolveFloatingPetUIState({ isFocusMode: false, isExpanded: false, hasMessage: true }),
    "MESSAGE",
  );

  // 4. Default -> COLLAPSED
  assert.equal(
    resolveFloatingPetUIState({ isFocusMode: false, isExpanded: false, hasMessage: false }),
    "COLLAPSED",
  );
});

test("Student layout: companion uses the right floating slot", () => {
  const viewports = [
    { name: "desktop", width: 1440 },
    { name: "tablet", width: 768 },
    { name: "mobile", width: 390 },
  ] as const;

  for (const vp of viewports) {
    const petBox = getFloatingPetBoundingBox(vp.name, vp.width);
    // The student tutor launcher is opened from the pet, so only one
    // floating control is rendered. Verify the pet remains in the right slot.
    assert.ok(petBox.x1 >= 0, `Pet left should be >= 0 on ${vp.name}`);
    assert.ok(petBox.x2 <= vp.width, `Pet right should be <= screen width on ${vp.name}`);
    assert.ok(petBox.x1 > vp.width / 2, `Pet should be on the right side on ${vp.name}`);
  }
});
