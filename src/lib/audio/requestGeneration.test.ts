import assert from "node:assert/strict";
import test from "node:test";
import {
  isCurrentAudioRequest,
  nextAudioRequestGeneration,
} from "./requestGeneration.ts";

test("a newer same-group request invalidates an older audio response", () => {
  const firstGeneration = nextAudioRequestGeneration(0);
  const secondGeneration = nextAudioRequestGeneration(firstGeneration);

  assert.equal(
    isCurrentAudioRequest(secondGeneration, firstGeneration, 42, 42),
    false,
  );
  assert.equal(
    isCurrentAudioRequest(secondGeneration, secondGeneration, 42, 42),
    true,
  );
});

test("changing the active group invalidates the previous request", () => {
  const generation = nextAudioRequestGeneration(4);

  assert.equal(isCurrentAudioRequest(generation, generation, 43, 42), false);
});
