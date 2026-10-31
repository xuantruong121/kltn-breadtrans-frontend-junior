import test from "node:test";
import assert from "node:assert/strict";
import { audioFileProblem, recordedFileType } from "./audioClip.ts";

test("recordedFileType strips codecs so the upload filter accepts it", () => {
  assert.deepEqual(recordedFileType("audio/webm;codecs=opus"), { type: "audio/webm", extension: "webm" });
  assert.deepEqual(recordedFileType("audio/mp4"), { type: "audio/mp4", extension: "m4a" });
  assert.deepEqual(recordedFileType(""), { type: "audio/webm", extension: "webm" });
});

test("audioFileProblem refuses non-audio and large files", () => {
  assert.equal(audioFileProblem({ type: "audio/mpeg", size: 50_000 }), null);
  assert.match(audioFileProblem({ type: "image/png", size: 10 }) ?? "", /âm thanh/);
  assert.match(audioFileProblem({ type: "audio/wav", size: 11 * 1024 * 1024 }) ?? "", /10MB/);
});
