import test from "node:test";
import assert from "node:assert/strict";
import { isStarterLearner } from "./onboarding.ts";
import { canContinue, hasDiagnosticPlacement, needsLevelChoice, profilePayload, shouldOpenOnboarding, type OnboardingAnswers } from "./onboarding.ts";

const empty: OnboardingAnswers = { goal: null, track: null, minutesPerDay: null, targetDate: "", selfLevel: null };

test("each step needs its answer; the level step never blocks", () => {
  assert.equal(canContinue("goal", empty), false);
  assert.equal(canContinue("goal", { ...empty, goal: "TRAVEL" }), true);
  assert.equal(canContinue("track", { ...empty, track: "IT_SOFTWARE" }), true);
  assert.equal(canContinue("time", { ...empty, minutesPerDay: 15 }), true);
  assert.equal(canContinue("level", empty), true);
});

test("the payload sends only what was answered and marks onboarding done", () => {
  assert.deepEqual(profilePayload(empty), { onboarded: true });
  assert.deepEqual(
    profilePayload({ goal: "WORK_COMMUNICATION", track: "IT_SOFTWARE", minutesPerDay: 20, targetDate: "2027-03-01", selfLevel: "STARTER" }),
    { onboarded: true, goal: "WORK_COMMUNICATION", track: "IT_SOFTWARE", minutesPerDay: 20, targetDate: "2027-03-01", selfLevel: "STARTER" },
  );
});

test("onboarding opens once per session for a learner who has not done it", () => {
  assert.equal(shouldOpenOnboarding(undefined, false), false);
  assert.equal(shouldOpenOnboarding({ onboarded: false }, false), true);
  assert.equal(shouldOpenOnboarding({ onboarded: false }, true), false);
  assert.equal(shouldOpenOnboarding({ onboarded: true }, false), false);
});

test("a diagnostic result takes the level choice out of onboarding", () => {
  assert.equal(hasDiagnosticPlacement({ placementSource: "DIAGNOSTIC" }), true);
  assert.equal(hasDiagnosticPlacement({ placementSource: "SELF" }), false);
  assert.equal(hasDiagnosticPlacement({ placementSource: "NONE" }), false);
  assert.equal(hasDiagnosticPlacement(undefined), false);
});

test("the level card shows only without any placement", () => {
  assert.equal(needsLevelChoice({ placementSource: "NONE" }), true);
  assert.equal(needsLevelChoice({ placementSource: "SELF" }), false);
  assert.equal(needsLevelChoice({ placementSource: "DIAGNOSTIC" }), false);
  assert.equal(needsLevelChoice(undefined), false);
});

test("the starter path is for a learner at Mất gốc, chosen or placed", () => {
  const profile = { selfLevel: null, placementLevel: null };
  assert.equal(isStarterLearner({ ...profile, placementSource: "SELF", selfLevel: "STARTER" }), true);
  assert.equal(isStarterLearner({ ...profile, placementSource: "DIAGNOSTIC", placementLevel: "STARTER" }), true);
  assert.equal(isStarterLearner({ ...profile, placementSource: "SELF", selfLevel: "BASIC" }), false);
  assert.equal(isStarterLearner({ ...profile, placementSource: "NONE" }), false);
  assert.equal(isStarterLearner(undefined), false);
});
