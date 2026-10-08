import assert from "node:assert/strict";
import test from "node:test";
import { dailyPracticeProgress } from "./dailyPracticeLogic.ts";

test("daily practice uses the server target instead of a hard-coded five", () => {
  assert.deepEqual(dailyPracticeProgress({ completedCount: 2, targetActivities: 3 }), {
    completed: 2,
    target: 3,
    percent: 67,
    isComplete: false,
  });
});
