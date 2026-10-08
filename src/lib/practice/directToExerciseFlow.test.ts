import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(process.cwd());
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("normal Listening opens the usable workspace without a second start CTA", () => {
  const source = read("src/components/quiz/TakeQuizPage.tsx");
  assert.match(source, /ListeningComprehensionWorkspace/);
  assert.doesNotMatch(source, /Bắt đầu luyện nghe/);
  assert.doesNotMatch(source, /stage="INTRO"/);
});

test("normal Speaking opens prompt and recording controls directly", () => {
  const source = read("src/app/(student)/speaking/[id]/page.tsx");
  assert.match(source, /startRecording/);
  assert.match(source, /stage=\{phase === "COMPLETED" \? "FEEDBACK" : "PRACTICE"\}/);
  assert.doesNotMatch(source, /Bắt đầu luyện nói/);
});

test("normal Writing opens the editor directly and keeps guidance in the workspace", () => {
  const source = read("src/app/(student)/writing/[id]/page.tsx");
  assert.match(source, /writingMode\.guidance/);
  assert.match(source, /<textarea/);
  assert.match(source, /stage=\{feedback \? "FEEDBACK" : "PRACTICE"\}/);
  assert.doesNotMatch(source, /Bắt đầu viết/);
});

test("TOEIC retains a functional briefing boundary before timed attempt creation", () => {
  const briefing = read("src/app/(student)/toeic/[examId]/page.tsx");
  const attempt = read("src/app/(student)/toeic/attempts/[attemptId]/page.tsx");
  assert.match(briefing, /startAttempt/);
  assert.match(briefing, /Bắt đầu làm bài/);
  assert.match(attempt, /useAssessmentAntiCheat/);
  assert.match(attempt, /formatTime/);
});

test("learner practice route tree remains deleted", () => {
  assert.equal(fs.existsSync(path.join(root, "src/app/(student)/practice")), false);
});
