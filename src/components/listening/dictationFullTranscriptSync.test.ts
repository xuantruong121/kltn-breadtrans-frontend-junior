import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const source = fs.readFileSync(
  path.join(process.cwd(), "src/components/listening/DailyDictationWorkspace.tsx"),
  "utf8",
);

test("full transcript focus uses the audio timeline cursor, while Dictation keeps its selected question cursor", () => {
  assert.match(
    source,
    /activeTab === "transcript" && activeTranscriptItemIndex >= 0[\s\S]*?clampTranscriptIndex\(activeTranscriptItemIndex, fullTranscript\.length\)/,
  );
  assert.match(
    source,
    /: clampTranscriptIndex\(selectedTranscriptItemIndex, fullTranscript\.length\)/,
  );
  assert.match(source, /const activeTranscriptItem =[\s\S]*?fullTranscript\[transcriptCursorIndex\]/);
});
