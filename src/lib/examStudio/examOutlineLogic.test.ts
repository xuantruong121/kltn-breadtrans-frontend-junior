import test from "node:test";
import assert from "node:assert/strict";
import { buildLrOutline, groupBySkill } from "./examOutlineLogic.ts";

const groups = [
  { id: 1, part: 1, questions: [{ id: 101 }, { id: 102 }] },
  { id: 2, part: 3, questions: [{ id: 103 }, { id: 104 }, { id: 105 }] },
];

test("Exam Outline: Part with no groups is INCOMPLETE", () => {
  const rows = buildLrOutline(groups, []);
  const part5 = rows.find((r) => r.part === 5)!;
  assert.equal(part5.questionCount, 0);
  assert.equal(part5.state, "INCOMPLETE");
});

test("Exam Outline: Part with questions and no issues is READY", () => {
  const rows = buildLrOutline(groups, []);
  const part1 = rows.find((r) => r.part === 1)!;
  assert.equal(part1.questionCount, 2);
  assert.equal(part1.state, "READY");
});

test("Exam Outline: issue on a group's question marks that Part WARNING, not others", () => {
  const rows = buildLrOutline(groups, [{ questionId: 104 }]);
  const part3 = rows.find((r) => r.part === 3)!;
  const part1 = rows.find((r) => r.part === 1)!;
  assert.equal(part3.state, "WARNING");
  assert.equal(part3.issueCount, 1);
  assert.equal(part1.state, "READY");
});

test("Exam Outline: issue referenced by groupId resolves to the right Part", () => {
  const rows = buildLrOutline(groups, [{ groupId: 1 }]);
  const part1 = rows.find((r) => r.part === 1)!;
  assert.equal(part1.state, "WARNING");
});

test("Exam Outline: groupBySkill splits Listening (1-4) from Reading (5-7)", () => {
  const rows = buildLrOutline(groups, []);
  const { listening, reading } = groupBySkill(rows);
  assert.equal(listening.length, 4);
  assert.equal(reading.length, 3);
});
