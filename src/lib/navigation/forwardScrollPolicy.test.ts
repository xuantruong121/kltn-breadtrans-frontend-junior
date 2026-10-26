import test from "node:test";
import assert from "node:assert/strict";
import { shouldResetScrollOnPathChange } from "./forwardScrollPolicy.ts";

test("resets the viewport for a forward learner route change", () => {
  assert.equal(shouldResetScrollOnPathChange({ isHistoryNavigation: false }), true);
});

test("leaves browser Back and Forward restoration intact", () => {
  assert.equal(shouldResetScrollOnPathChange({ isHistoryNavigation: true }), false);
});
