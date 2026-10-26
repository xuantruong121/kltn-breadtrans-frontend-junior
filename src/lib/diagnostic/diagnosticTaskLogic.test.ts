import assert from "node:assert/strict";
import test from "node:test";

import {
  countSkippedTasks,
  countWords,
  describeForm,
  draftKey,
  describeSkillState,
  formatCriterionName,
  parseDraft,
  speakingLimitMs,
  toSubmissionAnswers,
  WRITING_SKIPPED,
  writingGuidance,
} from "./diagnosticTaskLogic.ts";

const v2Form = [
  ...Array.from({ length: 10 }, (_, i) => ({ id: i, section: "LISTENING", questionType: "MCQ", taskType: "MCQ" })),
  ...Array.from({ length: 10 }, (_, i) => ({ id: 10 + i, section: "READING", questionType: "MCQ", taskType: "MCQ" })),
  { id: 20, section: "SPEAKING", questionType: "OPEN_TEXT", taskType: "SPEAKING_RESPONSE", responseSeconds: 45, prepSeconds: 15 },
  { id: 21, section: "SPEAKING", questionType: "OPEN_TEXT", taskType: "SPEAKING_RESPONSE", responseSeconds: 60, prepSeconds: 30 },
  { id: 22, section: "WRITING", questionType: "OPEN_TEXT", taskType: "WRITING_RESPONSE", wordMin: 60, wordMax: 90 },
  { id: 23, section: "WRITING", questionType: "OPEN_TEXT", taskType: "WRITING_RESPONSE", wordMin: 90, wordMax: 130 },
  ...Array.from({ length: 5 }, (_, i) => ({ id: 30 + i, section: "LANGUAGE_USE", questionType: "MCQ", taskType: "MCQ" })),
];

test("the form description is counted from the administered items, not hard-coded", () => {
  const d = describeForm(v2Form);
  assert.deepEqual([d.total, d.objective, d.speaking, d.writing], [29, 25, 2, 2]);
  assert.deepEqual(
    d.parts.map((p) => `${p.label}:${p.count}`),
    ["Nghe:10", "Đọc:10", "Nói:2", "Viết:2", "Ngữ pháp & Từ vựng:5"],
  );
  const legacy = describeForm(Array.from({ length: 20 }, (_, i) => ({ id: i, section: "LISTENING", questionType: "MCQ" })));
  assert.equal(legacy.total, 20);
  assert.equal(legacy.objective, 20);
});

test("recording limit follows each task's responseSeconds", () => {
  assert.equal(speakingLimitMs(v2Form[20]), 45_000);
  assert.equal(speakingLimitMs(v2Form[21]), 60_000);
  assert.equal(speakingLimitMs({ id: 1 }), 90_000); // legacy task without a configured limit
});

test("word count matches the backend convention", () => {
  assert.equal(countWords("  Hello   world \n again "), 3);
  assert.equal(countWords("   "), 0);
});

test("word range is guidance and never blocks", () => {
  assert.equal(writingGuidance(0, 60, 90)?.tone, "neutral");
  assert.equal(writingGuidance(40, 60, 90)?.tone, "below");
  assert.match(writingGuidance(40, 60, 90)!.message, /vẫn được chấm/);
  assert.equal(writingGuidance(75, 60, 90)?.tone, "within");
  assert.equal(writingGuidance(140, 90, 130)?.tone, "above");
  assert.equal(writingGuidance(10, null, null), null);
});

test("a skipped Writing task is sent as the empty string and counted", () => {
  const answers = { "1": 2, "20": "SKIPPED", "22": WRITING_SKIPPED, "23": "My answer" };
  assert.deepEqual(toSubmissionAnswers(answers), { "1": 2, "20": "SKIPPED", "22": "", "23": "My answer" });
  assert.deepEqual(countSkippedTasks(v2Form, answers), { speaking: 1, writing: 1 });
});

test("skill state distinguishes skipped from not submitted", () => {
  assert.equal(describeSkillState("NOT_STARTED", { tasksSkipped: 2, itemsTotal: 2 }).label, "Đã bỏ qua");
  assert.equal(describeSkillState("NOT_STARTED", { tasksSkipped: 1, itemsTotal: 2 }).label, "Bỏ qua 1/2 bài");
  assert.equal(describeSkillState("NOT_STARTED", { tasksSkipped: 0, itemsTotal: 2 }).tone, "missing");
});

test("a local draft keeps only question answers and survives bad input", () => {
  assert.deepEqual(parseDraft('{"3":1,"22":"text","__permScheme":"x","5":{"a":1}}'), { "3": 1, "22": "text" });
  assert.deepEqual(parseDraft("not json"), {});
  assert.deepEqual(parseDraft(null), {});
  assert.equal(draftKey(7), "breadtrans:diagnostic-draft:7");
});

test("criterion keys and skill states have Vietnamese labels", () => {
  assert.equal(formatCriterionName("intelligibility"), "Độ dễ hiểu");
  assert.equal(formatCriterionName("organisation"), "Tổ chức ý");
  assert.equal(describeSkillState("PENDING_GRADING").tone, "pending");
  assert.equal(describeSkillState("GRADING_FAILED").tone, "failed");
  assert.equal(describeSkillState("NOT_STARTED").tone, "missing");
  assert.equal(describeSkillState("COMPLETE").tone, "done");
});
