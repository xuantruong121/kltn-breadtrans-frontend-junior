import assert from "node:assert/strict";
import test from "node:test";
import {
  claimListeningPlayback,
  mayReplaceListeningSource,
  ownsListeningPlayback,
  type ListeningPlaybackOwnership,
} from "./listeningPlaybackOwnership.ts";

test("stale question audio completion cannot overwrite the later full-script owner", () => {
  const initial: ListeningPlaybackOwnership = { owner: "NONE", generation: 0 };
  const question = claimListeningPlayback(initial, "QUESTION_SEGMENT");
  const fullScript = claimListeningPlayback(question, "FULL_SCRIPT");

  assert.equal(ownsListeningPlayback(fullScript, "QUESTION_SEGMENT", question.generation), false);
  assert.equal(ownsListeningPlayback(fullScript, "FULL_SCRIPT", fullScript.generation), true);
});

test("entering full script is a new generation and owns a reset-to-zero transition", () => {
  const question = claimListeningPlayback({ owner: "NONE", generation: 3 }, "QUESTION_SEGMENT");
  const fullScript = claimListeningPlayback(question, "FULL_SCRIPT");

  assert.equal(fullScript.generation, question.generation + 1);
  assert.equal(fullScript.owner, "FULL_SCRIPT");
});

test("pause and resume preserve the full-script owner and source generation", () => {
  const fullScript = claimListeningPlayback({ owner: "QUESTION_SEGMENT", generation: 8 }, "FULL_SCRIPT");

  assert.equal(ownsListeningPlayback(fullScript, "FULL_SCRIPT", fullScript.generation), true);
  assert.equal(ownsListeningPlayback(fullScript, "QUESTION_SEGMENT", fullScript.generation), false);
  assert.equal(
    mayReplaceListeningSource({ ...fullScript, url: "blob:full-a" }, "FULL_SCRIPT", fullScript.generation, "blob:full-b"),
    false,
  );
  assert.equal(
    mayReplaceListeningSource({ ...fullScript, url: "blob:full-a" }, "FULL_SCRIPT", fullScript.generation, "blob:full-a"),
    true,
  );
});

test("rapid mode switching accepts only the latest playback intent", () => {
  const questionA = claimListeningPlayback({ owner: "NONE", generation: 0 }, "QUESTION_SEGMENT");
  const fullA = claimListeningPlayback(questionA, "FULL_SCRIPT");
  const questionB = claimListeningPlayback(fullA, "QUESTION_SEGMENT");
  const fullB = claimListeningPlayback(questionB, "FULL_SCRIPT");

  assert.equal(ownsListeningPlayback(fullB, "QUESTION_SEGMENT", questionA.generation), false);
  assert.equal(ownsListeningPlayback(fullB, "FULL_SCRIPT", fullA.generation), false);
  assert.equal(ownsListeningPlayback(fullB, "QUESTION_SEGMENT", questionB.generation), false);
  assert.equal(ownsListeningPlayback(fullB, "FULL_SCRIPT", fullB.generation), true);
});
