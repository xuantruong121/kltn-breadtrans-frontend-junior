import test from "node:test";
import assert from "node:assert/strict";

import {
  SPEAKING_GROUPS,
  WRITING_GROUPS,
  groupIndexOf,
  groupLabel,
  questionsOf,
  roomStep,
  secondsLeft,
  speakingTimeLabel,
  type RoomComponent,
} from "./assessmentRoom.ts";

const part = (kind: string, order: number, status: string, extra: Partial<RoomComponent> = {}): RoomComponent => ({
  assessmentComponentId: order * 10,
  kind,
  order,
  status,
  ...extra,
});

test("the tabs cover every question of a section exactly once", () => {
  assert.deepEqual(SPEAKING_GROUPS.flatMap(questionsOf), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  assert.deepEqual(WRITING_GROUPS.flatMap(questionsOf), [1, 2, 3, 4, 5, 6, 7, 8]);
});

test("a tab is named by its question numbers", () => {
  assert.equal(groupLabel(SPEAKING_GROUPS[3]), "Câu 8–10");
  assert.equal(groupLabel(SPEAKING_GROUPS[4]), "Câu 11");
});

test("a question number finds its tab", () => {
  assert.equal(groupIndexOf(SPEAKING_GROUPS, 9), 3);
  assert.equal(groupIndexOf(WRITING_GROUPS, 8), 2);
});

test("time left never goes below zero, and an unopened section has no clock", () => {
  const deadline = "2026-11-02T08:20:00Z";
  assert.equal(secondsLeft(deadline, Date.parse("2026-11-02T08:19:30Z")), 30);
  assert.equal(secondsLeft(deadline, Date.parse("2026-11-02T09:00:00Z")), 0);
  assert.equal(secondsLeft(null, 0), null);
});

test("the question 8 label includes its reading time", () => {
  assert.equal(
    speakingTimeLabel({ readingSeconds: 45, prepSeconds: 3, responseSeconds: 15 }),
    "Đọc thông tin 45 giây · Chuẩn bị 3 giây · Trả lời 15 giây",
  );
  assert.equal(
    speakingTimeLabel({ readingSeconds: 0, prepSeconds: 45, responseSeconds: 30 }),
    "Chuẩn bị 45 giây · Trả lời 30 giây",
  );
});

test("a new exam opens on the intro of its first section", () => {
  const step = roomStep({
    status: "IN_PROGRESS",
    components: [part("SPEAKING", 1, "NOT_STARTED"), part("WRITING", 2, "NOT_STARTED")],
  });
  assert.equal(step.kind, "INTRO");
  assert.equal(step.kind === "INTRO" && step.component.kind, "SPEAKING");
  assert.equal(step.kind === "INTRO" && step.previous, null);
});

test("the next section follows the one just submitted", () => {
  const step = roomStep({
    status: "IN_PROGRESS",
    components: [part("WRITING", 2, "NOT_STARTED"), part("SPEAKING", 1, "COMPLETED")],
  });
  assert.equal(step.kind === "INTRO" && step.component.kind, "WRITING");
  assert.equal(step.kind === "INTRO" && step.previous?.kind, "SPEAKING");
});

test("a section being answered reopens its room", () => {
  const step = roomStep({
    status: "IN_PROGRESS",
    components: [part("SPEAKING", 1, "IN_PROGRESS")],
  });
  assert.equal(step.kind, "ROOM");
});

test("Listening & Reading runs in its own room until its paper is in", () => {
  const open = part("LISTENING_READING", 1, "IN_PROGRESS", { childStatus: "IN_PROGRESS" });
  const handedIn = part("LISTENING_READING", 1, "IN_PROGRESS", { childStatus: "SUBMITTED" });
  assert.equal(roomStep({ status: "IN_PROGRESS", components: [open] }).kind, "LISTENING_READING");
  assert.equal(roomStep({ status: "IN_PROGRESS", components: [handedIn] }).kind, "CLOSE_LISTENING_READING");
});

test("a finished exam goes to its result", () => {
  assert.equal(roomStep({ status: "COMPLETED", components: [] }).kind, "DONE");
  assert.equal(roomStep({ status: "IN_PROGRESS", components: [part("WRITING", 2, "COMPLETED")] }).kind, "DONE");
});
