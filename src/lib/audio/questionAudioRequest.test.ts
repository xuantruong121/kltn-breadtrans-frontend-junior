import test from "node:test";
import assert from "node:assert/strict";
import { buildQuestionAudioRequestPath } from "./questionAudioRequest.ts";

test("question-level listening audio does not impersonate a quiz artifact", () => {
  assert.equal(
    buildQuestionAudioRequestPath(25, 155),
    "/quizzes/25/questions/155/audio",
  );
});

test("published quiz artifact identity is retained for continuous playback", () => {
  assert.equal(
    buildQuestionAudioRequestPath(25, 155, {
      id: 18,
      version: 3,
      checksumSha256: "checksum-v3",
    }),
    "/quizzes/25/questions/155/audio?artifactId=18&v=3&checksum=checksum-v3",
  );
});
