import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAssessmentStructureRows,
  buildAssessmentSummaryFacts,
  getToeicComponentLabel,
  getToeicDetailPresentation,
  resolveAssessmentReadiness,
  type ToeicAssessmentComponentView,
} from "./detailPresentation.ts";

const ready = (reason: string | null = null) => ({
  ready: reason === null,
  reason,
});

const SW: ToeicAssessmentComponentView[] = [
  { id: 1, kind: "SPEAKING", order: 1, itemCount: 11, readiness: ready() },
  { id: 2, kind: "WRITING", order: 2, itemCount: 8, readiness: ready() },
];

const FOUR_SKILLS: ToeicAssessmentComponentView[] = [
  {
    id: 3,
    kind: "LISTENING_READING",
    order: 1,
    itemCount: 200,
    readiness: ready(),
  },
  { id: 4, kind: "SPEAKING", order: 2, itemCount: 11, readiness: ready() },
  { id: 5, kind: "WRITING", order: 3, itemCount: 8, readiness: ready() },
];

test("uses learner-facing labels for the TOEIC productive products", () => {
  assert.equal(
    getToeicDetailPresentation("TOEIC_SW").badge,
    "TOEIC Speaking & Writing",
  );
  assert.match(
    getToeicDetailPresentation("TOEIC_SW").summary,
    /11 nhiệm vụ Speaking/,
  );
  assert.equal(getToeicDetailPresentation("TOEIC_4_SKILLS").badge, "TOEIC 4 Skills");
});

test("has a safe TOEIC fallback for future product families", () => {
  assert.equal(getToeicDetailPresentation("UNKNOWN").badge, "TOEIC");
});

test("exam format wording avoids internal product codes", () => {
  assert.equal(
    getToeicDetailPresentation("TOEIC_SW").format,
    "2 kỹ năng (Speaking + Writing)",
  );
  assert.match(getToeicDetailPresentation("TOEIC_4_SKILLS").format, /4 kỹ năng/);
  for (const family of ["TOEIC_SW", "TOEIC_4_SKILLS"]) {
    const presentation = getToeicDetailPresentation(family);
    assert.doesNotMatch(presentation.format, /TOEIC_SW|TOEIC_4_SKILLS|component/);
    assert.doesNotMatch(presentation.badge, /TOEIC_SW|TOEIC_4_SKILLS|component/);
  }
});

test("a skill group is never presented as a numbered TOEIC Part", () => {
  for (const kind of ["SPEAKING", "WRITING", "LISTENING_READING"]) {
    assert.doesNotMatch(getToeicComponentLabel(kind), /Part\s*\d/);
  }
  assert.equal(getToeicComponentLabel("SPEAKING"), "Speaking");
  assert.equal(getToeicComponentLabel("LISTENING_READING"), "Listening + Reading");
});

test("S&W structure reports the server task counts", () => {
  const rows = buildAssessmentStructureRows(SW);
  assert.deepEqual(
    rows.map((row) => [row.label, row.measure]),
    [
      ["Speaking", "11 nhiệm vụ"],
      ["Writing", "8 nhiệm vụ"],
    ],
  );
  assert.equal(rows[1].meta, "60 phút");
});

test("4 Skills structure reports all three component sizes in order", () => {
  const rows = buildAssessmentStructureRows(FOUR_SKILLS);
  assert.deepEqual(
    rows.map((row) => [row.label, row.measure]),
    [
      ["Listening + Reading", "200 câu"],
      ["Speaking", "11 nhiệm vụ"],
      ["Writing", "8 nhiệm vụ"],
    ],
  );
});

test("structure rows follow component order, not array order", () => {
  const shuffled = [FOUR_SKILLS[2], FOUR_SKILLS[0], FOUR_SKILLS[1]];
  assert.deepEqual(
    buildAssessmentStructureRows(shuffled).map((row) => row.label),
    ["Listening + Reading", "Speaking", "Writing"],
  );
});

test("S&W totals its tasks because every component shares one unit", () => {
  const facts = buildAssessmentSummaryFacts(SW, "TOEIC_SW");
  assert.equal(facts.totalLabel, "Tổng nhiệm vụ");
  assert.equal(facts.totalValue, "19");
  assert.deepEqual(facts.durationLines, [
    "Speaking khoảng 20 phút",
    "Writing 60 phút",
  ]);
});

test("4 Skills never adds questions to tasks", () => {
  const facts = buildAssessmentSummaryFacts(FOUR_SKILLS, "TOEIC_4_SKILLS");
  // 200 questions + 19 tasks must not be advertised as "219".
  assert.equal(facts.totalValue, null);
  assert.equal(facts.totalLabel, null);
  assert.deepEqual(facts.itemLines, [
    "Listening + Reading 200 câu",
    "Speaking 11 nhiệm vụ",
    "Writing 8 nhiệm vụ",
  ]);
});

test("readiness is taken from the server for every component", () => {
  assert.deepEqual(resolveAssessmentReadiness(SW), { ready: true, reasons: [] });

  const blocked = resolveAssessmentReadiness([
    SW[0],
    { ...SW[1], readiness: ready("Writing Set chưa PUBLISHED") },
  ]);
  assert.equal(blocked.ready, false);
  assert.deepEqual(blocked.reasons, ["Writing: Writing Set chưa PUBLISHED"]);
});

test("a component with no readiness payload is not treated as ready", () => {
  const unknown = resolveAssessmentReadiness([
    { id: 9, kind: "SPEAKING", order: 1, itemCount: 11, readiness: null },
  ]);
  assert.equal(unknown.ready, false);
  assert.deepEqual(unknown.reasons, ["Speaking: chưa sẵn sàng"]);
});

test("an assessment with no components cannot be started", () => {
  assert.deepEqual(resolveAssessmentReadiness([]), {
    ready: false,
    reasons: ["Bài thi chưa có phần thi nào."],
  });
});

test("missing server counts degrade without inventing numbers", () => {
  const rows = buildAssessmentStructureRows([
    { id: 7, kind: "SPEAKING", order: 1, itemCount: null, readiness: ready() },
  ]);
  assert.equal(rows[0].measure, "Theo cấu trúc TOEIC");
  const facts = buildAssessmentSummaryFacts(
    [{ id: 7, kind: "SPEAKING", order: 1, itemCount: null, readiness: ready() }],
    "TOEIC_SW",
  );
  assert.equal(facts.totalValue, null);
  assert.deepEqual(facts.itemLines, []);
});
