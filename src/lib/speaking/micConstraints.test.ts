import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { SPEAKING_MIC_CONSTRAINTS } from "./micConstraints.ts";

test("Speaking records the raw voice: no noise suppression, no auto gain", () => {
  assert.equal(SPEAKING_MIC_CONSTRAINTS.noiseSuppression, false);
  assert.equal(SPEAKING_MIC_CONSTRAINTS.autoGainControl, false);
  assert.equal(SPEAKING_MIC_CONSTRAINTS.echoCancellation, true);
  assert.equal(SPEAKING_MIC_CONSTRAINTS.channelCount, 1);
});

test("every graded recorder (practice, entry diagnostic) uses the shared constraints", () => {
  for (const file of [
    "src/lib/speaking/useWavRecorder.ts",
    "src/app/(student)/speaking/[id]/page.tsx",
    "src/app/(student)/diagnostic/page.tsx",
  ]) {
    const source = readFileSync(file, "utf8");
    assert.match(source, /getUserMedia\(\{\s*audio: SPEAKING_MIC_CONSTRAINTS/, file);
    assert.doesNotMatch(source, /noiseSuppression: true/, file);
  }
});
