import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPaperParts,
  formatClock,
  formatMinutes,
  nextPlayable,
  playbackSegments,
  realToVirtual,
  segmentsDuration,
  virtualToReal,
  groupStart,
  isPassageWorthShowing,
  navigatorStatus,
  paperQuestionOrder,
  segmentAt,
  splitPassageDocuments,
} from "./examPaper.ts";

const g = (id: number, part: number, groupOrder: number, numbers: number[]) => ({
  id,
  part,
  groupOrder,
  questions: numbers.map((n) => ({ id: 1000 + n, questionNumber: n })),
});

test("parts come out in order 1..7 with their question ranges, groups by groupOrder", () => {
  const parts = buildPaperParts([g(9, 7, 60, [147, 148]), g(2, 2, 7, [7]), g(1, 1, 1, [1]), g(3, 3, 32, [34, 32, 33])]);
  assert.deepEqual(parts.map((p) => [p.part, p.section, p.firstNumber, p.lastNumber]), [
    [1, "LISTENING", 1, 1],
    [2, "LISTENING", 7, 7],
    [3, "LISTENING", 32, 34],
    [7, "READING", 147, 148],
  ]);
  assert.deepEqual(paperQuestionOrder(parts).map((q) => q.questionNumber), [1, 7, 32, 33, 34, 147, 148]);
});

test("multi-document passages split into their documents with headings", () => {
  const docs = splitPassageDocuments("DOCUMENT 1 — EMAIL\nFrom: A\nHello\n\nDOCUMENT 2 — INVOICE\nTotal: $5");
  assert.deepEqual(docs, [
    { heading: "DOCUMENT 1 — EMAIL", body: "From: A\nHello" },
    { heading: "DOCUMENT 2 — INVOICE", body: "Total: $5" },
  ]);
  const single = splitPassageDocuments("NOTICE\nThe branch [135] _____ closed.\n\nSecond paragraph.");
  assert.equal(single.length, 1);
  assert.equal(single[0].heading, "NOTICE");
  assert.match(single[0].body, /Second paragraph/);
  assert.deepEqual(splitPassageDocuments(null), []);
});

test("Part 5 section label is not shown as a passage; listening never shows one", () => {
  assert.equal(isPassageWorthShowing(5, "PART 5 — INCOMPLETE SENTENCES"), false);
  assert.equal(isPassageWorthShowing(6, "EMAIL\nTo: All"), true);
  assert.equal(isPassageWorthShowing(3, "Man: hello"), false);
});

test("timeline lookup finds the playing segment and a group's start", () => {
  const timeline = [
    { kind: "INTRO" as const, start: 0, end: 30 },
    { kind: "DIRECTIONS" as const, part: 1, start: 32, end: 50 },
    { kind: "GROUP" as const, part: 1, groupId: 11, questionNumbers: [1], start: 52, end: 80 },
    { kind: "GROUP" as const, part: 1, groupId: 12, questionNumbers: [2], start: 80, end: 104 },
  ];
  assert.equal(segmentAt(timeline, 10)?.kind, "INTRO");
  assert.equal(segmentAt(timeline, 79.9)?.groupId, 11);
  assert.equal(segmentAt(timeline, 80)?.groupId, 12);
  assert.equal(groupStart(timeline, 12), 80);
  assert.equal(groupStart(timeline, 99), null);
});

test("part practice plays each selected Listening Part from its directions; full paper plays everything", () => {
  const timeline = [
    { kind: "INTRO" as const, start: 0, end: 30 },
    { kind: "DIRECTIONS" as const, part: 1, start: 32, end: 50 },
    { kind: "GROUP" as const, part: 1, groupId: 1, questionNumbers: [1], start: 52, end: 80 },
    { kind: "DIRECTIONS" as const, part: 2, start: 82, end: 100 },
    { kind: "GROUP" as const, part: 2, groupId: 2, questionNumbers: [7], start: 102, end: 120 },
    { kind: "GROUP" as const, part: 2, groupId: 3, questionNumbers: [8], start: 120, end: 140 },
    { kind: "END" as const, start: 140, end: 145 },
  ];
  assert.deepEqual(playbackSegments(timeline, 145, null), [{ start: 0, end: 145 }]);
  assert.deepEqual(playbackSegments(timeline, 145, [2]), [{ start: 82, end: 140 }]);
  assert.deepEqual(playbackSegments(timeline, 145, [6]), []);
  const both = playbackSegments(timeline, 145, [2, 1, 6]);
  assert.deepEqual(both, [
    { start: 32, end: 80 },
    { start: 82, end: 140 },
  ]);
  assert.equal(segmentsDuration(both), 106);
  assert.equal(realToVirtual(both, 90), 56);
  assert.equal(virtualToReal(both, 56), 90);
  assert.equal(nextPlayable(both, 80), 82);
  assert.equal(nextPlayable(both, 140), null);
  assert.equal(formatMinutes(7200), "120:00");
  assert.equal(formatMinutes(554), "09:14");
});

test("navigator status and clock formatting", () => {
  assert.equal(navigatorStatus(5, 5, {}), "current");
  assert.equal(navigatorStatus(5, 6, { 5: 0 }), "answered");
  assert.equal(navigatorStatus(5, 6, {}), "unanswered");
  assert.equal(formatClock(65), "01:05");
  assert.equal(formatClock(7200), "2:00:00");
  assert.equal(formatClock(-3), "00:00");
});
