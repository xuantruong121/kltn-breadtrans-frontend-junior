import assert from "node:assert/strict";
import test from "node:test";

import {
  describeCoverage,
  explainObservedScore,
  formatDifficulty,
  formatNumber,
  formatSubskill,
  withheldMessage,
  type ObservedLike,
} from "./observedResultLogic.ts";

const task = (order: number, status: string, score: number | null) => ({ order, status, score, weight: 0.075 });

// T02 shape from the harness probe: L 60, R 80, one Speaking task 75.
const t02: ObservedLike = {
  listening: { correct: 6, total: 10, score: 60, weight: 0.35 },
  reading: { correct: 8, total: 10, score: 80, weight: 0.35 },
  speaking: { tasks: [task(1, "GRADED", 75), task(2, "SKIPPED", null)], graded: 1, total: 2 },
  writing: { tasks: [task(1, "SKIPPED", null), task(2, "NOT_ATTEMPTED", null)], graded: 0, total: 2 },
  objectiveCore: 70,
  observed: { score: 70.5, denominator: 0.775, withheldReason: null },
};

test("coverage: 0/2 is unassessed (not zero), 1/2 limited, 2/2 full", () => {
  const none = describeCoverage("Nói", 0, 2);
  assert.equal(none.label, "Chưa đánh giá");
  assert.match(none.notice ?? "", /không phải điểm 0/);
  const partial = describeCoverage("Viết", 1, 2);
  assert.equal(partial.label, "Đánh giá 1/2 bài");
  assert.match(partial.notice ?? "", /bằng chứng còn hạn chế/);
  assert.deepEqual(describeCoverage("Nói", 2, 2), { label: "Đủ 2/2 bài", tone: "done", notice: null });
});

test("explanation lists every term; skipped tasks carry no weight", () => {
  const e = explainObservedScore(t02);
  assert.deepEqual(
    e.lines.map((l) => [l.label, l.value, l.counted]),
    [
      ["Nghe (6/10 câu đúng)", "60 × 35%", true],
      ["Đọc (8/10 câu đúng)", "80 × 35%", true],
      ["Nói – bài 1", "75 × 7,5%", true],
      ["Nói – bài 2", "bỏ qua – không tính điểm, không tính trọng số", false],
      ["Viết – bài 1", "bỏ qua – không tính điểm, không tính trọng số", false],
      ["Viết – bài 2", "bỏ qua – không tính điểm, không tính trọng số", false],
    ],
  );
  assert.equal(e.denominator, "35% + 35% + 7,5% × 1 bài đã chấm = 77,5%");
  assert.equal(e.outcome, "Điểm quan sát = tổng các dòng được tính ÷ 77,5% = 70,5/100");
});

test("a pending or failed task withholds the score and says why", () => {
  const pending = explainObservedScore({
    ...t02,
    speaking: { ...t02.speaking, tasks: [task(1, "GRADING_PENDING", null), task(2, "SKIPPED", null)], graded: 0 },
    observed: { score: null, denominator: 0.7, withheldReason: "PRODUCTIVE_PENDING" },
  });
  assert.equal(pending.lines[2].value, "đang chấm – chưa tính");
  assert.match(pending.outcome, /đang được chấm/);
  assert.match(withheldMessage("PRODUCTIVE_FAILED") ?? "", /Chấm lại/);
  assert.equal(withheldMessage(null), null);
});

test("difficulty tiers are shown as difficulty, never as a level", () => {
  assert.equal(formatDifficulty("D1"), "Câu dễ");
  assert.equal(formatDifficulty("D3"), "Câu khó");
  assert.equal(formatDifficulty("D4"), "Câu rất khó");
  assert.equal(formatDifficulty("B1"), "Chưa phân loại độ khó");
  for (const key of ["D1", "D2", "D3", "D4", "UNSPECIFIED"])
    assert.doesNotMatch(formatDifficulty(key), /\b(A1|A2|B1|B2|C1|C2|CEFR)\b/);
});

test("subskill labels are Vietnamese; unknown keys pass through", () => {
  assert.equal(formatSubskill("main idea"), "Ý chính");
  assert.equal(formatSubskill("UNSPECIFIED"), "Chưa phân loại");
  assert.equal(formatSubskill("new skill"), "new skill");
  assert.equal(formatNumber(70.45), "70,5");
});
