import test from "node:test";
import assert from "node:assert/strict";
import {
  isValidDiagnosticRecording,
  selectDiagnosticRecordingMimeType,
  speakingResponseCountsAsEvidence,
} from "./diagnosticSpeakingRecorderLogic.ts";

test("selects the first browser-supported MIME type", () => {
  assert.equal(
    selectDiagnosticRecordingMimeType((mime) => mime === "audio/mp4"),
    "audio/mp4",
  );
});

test("rejects accidental or overlong recordings", () => {
  assert.equal(isValidDiagnosticRecording(999, 1000), false);
  assert.equal(isValidDiagnosticRecording(2000, 301), true);
  assert.equal(isValidDiagnosticRecording(2000, 90_001), false);
});

test("only graded responses contribute evidence", () => {
  assert.equal(speakingResponseCountsAsEvidence("SKIPPED", null), false);
  assert.equal(speakingResponseCountsAsEvidence("GRADING_FAILED", null), false);
  assert.equal(speakingResponseCountsAsEvidence("GRADED", 72), true);
});
