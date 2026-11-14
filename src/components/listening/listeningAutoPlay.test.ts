import test from "node:test";
import assert from "node:assert/strict";
import { audioTrackKey, shouldAutoPlay } from "./listeningAutoPlay.ts";

test("a published artifact is identified by its id, whatever the signed URL", () => {
  assert.equal(audioTrackKey("https://r2.example/a.mp3?X-Amz-Signature=1", 42), "artifact:42");
  assert.equal(audioTrackKey("https://r2.example/b.mp3?X-Amz-Signature=2", 42), "artifact:42");
});

test("without an artifact, the URL without its query string identifies the recording", () => {
  assert.equal(
    audioTrackKey("https://r2.example/q/7.mp3?X-Amz-Signature=abc", null),
    "https://r2.example/q/7.mp3",
  );
  assert.equal(audioTrackKey("https://cdn.example/q/7.mp3"), "https://cdn.example/q/7.mp3");
});

test("the next question plays by itself when its recording is new", () => {
  assert.equal(
    shouldAutoPlay({ requested: true, previousTrackKey: "artifact:1", trackKey: "artifact:2" }),
    true,
  );
  assert.equal(
    shouldAutoPlay({ requested: true, previousTrackKey: null, trackKey: "artifact:2" }),
    true,
  );
});

test("a dialogue question sharing the recording just heard does not replay it", () => {
  assert.equal(
    shouldAutoPlay({ requested: true, previousTrackKey: "artifact:5", trackKey: "artifact:5" }),
    false,
  );
});

test("nothing plays by itself unless the learner pressed Câu tiếp theo", () => {
  assert.equal(
    shouldAutoPlay({ requested: false, previousTrackKey: "artifact:1", trackKey: "artifact:2" }),
    false,
  );
});
