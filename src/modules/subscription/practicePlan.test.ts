import { test } from "node:test";
import assert from "node:assert/strict";

import { plansHrefFor, unlockPlanFor } from "./practicePlan.ts";

test("Listening and Reading unlock with PLUS, Speaking and Writing with PRO", () => {
  assert.equal(unlockPlanFor("LISTENING"), "PLUS");
  assert.equal(unlockPlanFor("READING"), "PLUS");
  assert.equal(unlockPlanFor("SPEAKING"), "PRO");
  assert.equal(unlockPlanFor("WRITING"), "PRO");
});

test("the plan sent by the API wins over the skill fallback", () => {
  assert.equal(unlockPlanFor("READING", "PRO"), "PRO");
  assert.equal(unlockPlanFor("WRITING", "PLUS"), "PLUS");
});

test("an unknown or FREE value never weakens a PRO-only lock to PLUS", () => {
  assert.equal(unlockPlanFor("SPEAKING", "FREE"), "PRO");
  assert.equal(unlockPlanFor("SPEAKING", "GOLD"), "PRO");
  assert.equal(unlockPlanFor("WRITING", null), "PRO");
});

test("the plans link highlights the plan that unlocks the item", () => {
  assert.equal(plansHrefFor("PRO"), "/plans?highlight=pro");
  assert.equal(plansHrefFor("PLUS"), "/plans?highlight=plus");
});
