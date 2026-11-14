import assert from "node:assert/strict";
import test from "node:test";

import {
  enterAction,
  nextUnchecked,
  sentenceStatus,
  sentencesToRedo,
  translationTally,
  VERDICT_LABEL,
} from "./sentenceTranslationLogic.ts";

const latest = (score: number) => ({ submissionId: 1, score, maxScore: 2 });

test("a sentence takes this visit's check, else its stored grade", () => {
  assert.equal(sentenceStatus({ latest: null }, undefined), "NONE");
  assert.equal(sentenceStatus({ latest: latest(2) }, undefined), "CORRECT");
  assert.equal(sentenceStatus({ latest: latest(1) }, undefined), "MINOR");
  assert.equal(sentenceStatus({ latest: latest(0) }, undefined), "WRONG");
  assert.equal(sentenceStatus({ latest: latest(0) }, { verdict: "CORRECT" }), "CORRECT");
});

test("tally counts only fully right sentences as right", () => {
  assert.deepEqual(translationTally(["CORRECT", "MINOR", "UNMATCHED", "NONE"]), {
    total: 4,
    answered: 3,
    correct: 1,
    wrong: 2,
  });
  assert.deepEqual(sentencesToRedo(["CORRECT", "MINOR", "NONE", "WRONG"]), [1, 3]);
});

test("next unchecked sentence wraps round and ends when all are checked", () => {
  assert.equal(nextUnchecked(["CORRECT", "NONE", "NONE"], 0), 1);
  assert.equal(nextUnchecked(["NONE", "CORRECT", "CORRECT"], 2), 0);
  assert.equal(nextUnchecked(["CORRECT", "WRONG"], 0), null);
});

test("Enter checks, then moves on; Shift+Enter and an empty answer do nothing", () => {
  assert.equal(enterAction("Enter", false, false, "My mom"), "check");
  assert.equal(enterAction("Enter", false, false, "   "), null);
  assert.equal(enterAction("Enter", true, false, "My mom"), null);
  assert.equal(enterAction("Enter", false, true, ""), "next");
  assert.equal(enterAction("a", false, false, "x"), null);
});

test("every verdict has a Vietnamese label", () => {
  assert.equal(VERDICT_LABEL.MINOR, "Gần đúng");
  assert.equal(VERDICT_LABEL.UNMATCHED, "Chưa khớp đáp án mẫu");
});
