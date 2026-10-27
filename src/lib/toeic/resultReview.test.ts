import { test } from "node:test";
import assert from "node:assert/strict";
import {
  filterReview,
  formatAccuracy,
  formatDuration,
  groupByPart,
  groupSegment,
  groupTasks,
  SPEAKING_GROUPS,
  WRITING_GROUPS,
} from "./resultReview.ts";

const q = (questionNumber: number, part: number, status: "CORRECT" | "INCORRECT" | "SKIPPED", flagged = false) => ({
  questionNumber,
  part,
  status,
  flagged,
});

test("answer filters select by stored status and by flag", () => {
  const all = [q(1, 1, "CORRECT"), q(2, 1, "INCORRECT", true), q(3, 2, "SKIPPED")];
  assert.deepEqual(filterReview(all, "ALL").map((x) => x.questionNumber), [1, 2, 3]);
  assert.deepEqual(filterReview(all, "CORRECT").map((x) => x.questionNumber), [1]);
  assert.deepEqual(filterReview(all, "INCORRECT").map((x) => x.questionNumber), [2]);
  assert.deepEqual(filterReview(all, "SKIPPED").map((x) => x.questionNumber), [3]);
  assert.deepEqual(filterReview(all, "FLAGGED").map((x) => x.questionNumber), [2]);
});

test("groups by Part in ascending order with sorted numbers", () => {
  const groups = groupByPart([q(32, 3, "CORRECT"), q(7, 2, "CORRECT"), q(1, 1, "SKIPPED"), q(8, 2, "INCORRECT")]);
  assert.deepEqual(
    groups.map((g) => [g.part, g.questions.map((x) => x.questionNumber)]),
    [[1, [1]], [2, [7, 8]], [3, [32]]],
  );
});

test("durations and accuracy format honestly", () => {
  assert.equal(formatDuration(725), "12:05");
  assert.equal(formatDuration(3912), "1:05:12");
  assert.equal(formatDuration(null), null);
  assert.equal(formatAccuracy(33.33), "33.33%");
  assert.equal(formatAccuracy(50), "50%");
  assert.equal(formatAccuracy(null), "—");
});

test("finds a group's segment in the Listening master", () => {
  const timeline = [
    { kind: "INTRO" as const, start: 0, end: 30 },
    { kind: "GROUP" as const, groupId: 5, part: 1, start: 30, end: 42.5 },
  ];
  assert.deepEqual(groupSegment(timeline, 5), { start: 30, end: 42.5 });
  assert.equal(groupSegment(timeline, 9), null);
});

test("S&W tasks fall into the TOEIC task groups", () => {
  const speaking = groupTasks(Array.from({ length: 11 }, (_, i) => ({ number: i + 1 })), SPEAKING_GROUPS);
  assert.deepEqual(speaking.map((g) => [g.range, g.tasks.length]), [["Q1–2", 2], ["Q3–4", 2], ["Q5–7", 3], ["Q8–10", 3], ["Q11", 1]]);
  const writing = groupTasks(Array.from({ length: 8 }, (_, i) => ({ number: i + 1 })), WRITING_GROUPS);
  assert.deepEqual(writing.map((g) => [g.range, g.tasks.length]), [["Q1–5", 5], ["Q6–7", 2], ["Q8", 1]]);
});
