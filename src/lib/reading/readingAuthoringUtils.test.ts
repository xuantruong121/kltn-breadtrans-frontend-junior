import assert from "node:assert/strict";
import test from "node:test";
import { resolveReadingAuthoringAnswer } from "./readingAuthoringUtils.ts";

test("resolves canonical correctIndex", () => {
  assert.deepEqual(
    resolveReadingAuthoringAnswer({ options: ["A", "B"], correctIndex: 1 }),
    { available: true, answer: "B", index: 1 },
  );
});

test("handles invalid index without showing an answer", () => {
  assert.equal(
    resolveReadingAuthoringAnswer({ options: ["A"], correctIndex: 2 })
      .available,
    false,
  );
});

test("supports legacy fallback and rejects canonical conflict", () => {
  assert.equal(resolveReadingAuthoringAnswer({ correct: "B" }).available, true);
  assert.equal(
    resolveReadingAuthoringAnswer({
      options: ["A", "B"],
      correctIndex: 0,
      correct: "B",
    }).available,
    false,
  );
});
