import test from "node:test";
import assert from "node:assert/strict";
import {
  getUnansweredQuestionIndexes,
  resolveReviewAnswer,
} from "./diagnosticUiLogic.ts";

test("diagnostic submit guard identifies the first unanswered question", () => {
  assert.deepEqual(
    getUnansweredQuestionIndexes([{ id: 11 }, { id: 12 }, { id: 13 }], {
      "11": 1,
    }),
    [1, 2],
  );
});

test("diagnostic review resolves a valid correctIndex and safely rejects corrupt history", () => {
  assert.equal(resolveReviewAnswer(["A", "B"], 1), "B");
  assert.equal(resolveReviewAnswer(["A"], 3), null);
  assert.equal(resolveReviewAnswer({ answer: "B" }, 0), null);
});

test("diagnostic submit guard treats blank productive answers as unanswered", () => {
  assert.deepEqual(
    getUnansweredQuestionIndexes([{ id: 21 }, { id: 22 }], {
      "21": "   ",
      "22": "ok",
    }),
    [0],
  );
});
