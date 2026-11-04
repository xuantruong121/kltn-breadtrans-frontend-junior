import assert from "node:assert/strict";
import { test } from "node:test";

import {
  SPEAKING_FAST_POLL_ATTEMPTS,
  SPEAKING_POLL_LIMIT_MS,
  SPEAKING_SLOW_POLL_MS,
  speakingPollStep,
} from "./speakingPollLogic.ts";

test("polls fast at first, as before", () => {
  assert.deepEqual(speakingPollStep(0, 0), { kind: "wait", delayMs: 0, slowPhaseStarted: false });
  assert.deepEqual(speakingPollStep(3, 5_000), { kind: "wait", delayMs: 1000, slowPhaseStarted: false });
  assert.deepEqual(speakingPollStep(10, 20_000), { kind: "wait", delayMs: 2000, slowPhaseStarted: false });
  assert.deepEqual(speakingPollStep(50, 200_000), { kind: "wait", delayMs: 5000, slowPhaseStarted: false });
});

test("keeps checking every 30 s after the fast phase instead of stopping", () => {
  const first = speakingPollStep(SPEAKING_FAST_POLL_ATTEMPTS + 1, 9 * 60_000);
  assert.deepEqual(first, { kind: "wait", delayMs: SPEAKING_SLOW_POLL_MS, slowPhaseStarted: true });
  // A grading that fails after the third retry (~21 min) is still observed.
  assert.deepEqual(speakingPollStep(SPEAKING_FAST_POLL_ATTEMPTS + 30, 21 * 60_000), {
    kind: "wait",
    delayMs: SPEAKING_SLOW_POLL_MS,
    slowPhaseStarted: false,
  });
});

test("stops after the overall limit", () => {
  assert.deepEqual(speakingPollStep(200, SPEAKING_POLL_LIMIT_MS + 1), { kind: "stop" });
});
