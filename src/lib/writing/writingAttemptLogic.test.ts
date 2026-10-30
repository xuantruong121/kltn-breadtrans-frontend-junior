import assert from "node:assert/strict";
import test from "node:test";

import { attemptForSubmission, parsePendingAttempt } from "./writingAttemptLogic.ts";

let n = 0;
const newId = () => `id-${++n}`;

test("the same text reuses its attempt id, so a retry gets the stored grade", () => {
  const first = attemptForSubmission(null, "  My answer. ", newId);
  const retry = attemptForSubmission(first, "My answer.", newId);
  assert.equal(retry.id, first.id);
  assert.equal(first.text, "My answer.");
});

test("edited text starts a new attempt", () => {
  const first = attemptForSubmission(null, "My answer.", newId);
  const edited = attemptForSubmission(first, "My better answer.", newId);
  assert.notEqual(edited.id, first.id);
});

test("stored attempts survive a refresh and bad storage is ignored", () => {
  const stored = JSON.stringify({ text: "My answer.", id: "abc" });
  assert.deepEqual(parsePendingAttempt(stored), { text: "My answer.", id: "abc" });
  assert.equal(parsePendingAttempt("not json"), null);
  assert.equal(parsePendingAttempt(JSON.stringify({ text: "x" })), null);
  assert.equal(parsePendingAttempt(null), null);
});
