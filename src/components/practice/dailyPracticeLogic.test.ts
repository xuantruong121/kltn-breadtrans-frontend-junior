import assert from "node:assert/strict";
import test from "node:test";
import { dailyPracticeHref, dailyPracticeProgress } from "./dailyPracticeLogic.ts";

test("clamps completion and reports the all-done state", () => {
    assert.deepEqual(dailyPracticeProgress({ completedCount: 4, targetActivities: 3 }), {
      completed: 3,
      target: 3,
      percent: 100,
      isComplete: true,
    });
});

test("does not expose a locked exercise route as an actionable CTA", () => {
    assert.equal(dailyPracticeHref({ route: "/practice/quizzes/42", isLocked: true }),
      "/plans?highlight=plus",
    );
    assert.equal(dailyPracticeHref({ route: "/practice/quizzes/42", isLocked: false }),
      "/practice/quizzes/42",
    );
});
