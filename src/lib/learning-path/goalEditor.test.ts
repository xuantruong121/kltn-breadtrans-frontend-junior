import test from "node:test";
import assert from "node:assert/strict";

import {
  formatGoalDate,
  goalDraft,
  goalPatch,
  goalSummary,
  isPastDate,
  minuteChoices,
  toDateInput,
} from "./goalEditor.ts";

const profile = {
  goal: "TOEIC_SCORE" as const,
  track: "IT_SOFTWARE",
  trackName: "Công nghệ thông tin",
  minutesPerDay: 30,
  targetDate: "2026-12-20T00:00:00.000Z",
};

test("dates are read as the Vietnam calendar day", () => {
  assert.equal(toDateInput("2026-12-20T00:00:00.000Z"), "2026-12-20");
  // 18:00 UTC on the 19th is already the 20th in Vietnam.
  assert.equal(toDateInput("2026-12-19T18:00:00.000Z"), "2026-12-20");
  assert.equal(toDateInput(null), "");
  assert.equal(toDateInput("not a date"), "");
  assert.equal(formatGoalDate("2026-12-20T00:00:00.000Z"), "20/12/2026");
  assert.equal(formatGoalDate(null), "");
});

test("the summary names the goal, the track as admins named it, the time and the target day", () => {
  assert.equal(
    goalSummary(profile),
    "Đạt điểm TOEIC · Công nghệ thông tin · 30 phút mỗi ngày · Ngày mục tiêu 20/12/2026",
  );
  // GENERAL is still the default code, but its name comes from the API too.
  assert.equal(
    goalSummary({ ...profile, goal: "GENERAL", track: "GENERAL", trackName: "Chung", targetDate: null }),
    "Tiếng Anh tổng quát · Chung · 30 phút mỗi ngày · Chưa đặt ngày mục tiêu",
  );
  // A track an admin created reads by its name; the code only if no name came.
  assert.equal(goalSummary({ ...profile, track: "Y_TE", trackName: "Y tế" }).split(" · ")[1], "Y tế");
  assert.equal(goalSummary({ ...profile, track: "Y_TE", trackName: "" }).split(" · ")[1], "Y_TE");
});

test("only the changed fields are sent, and an empty day clears the target", () => {
  const saved = goalDraft(profile);
  assert.deepEqual(goalPatch(saved, saved), {});
  assert.deepEqual(goalPatch(saved, { ...saved, minutesPerDay: 45 }), { minutesPerDay: 45 });
  assert.deepEqual(goalPatch(saved, { ...saved, track: "GENERAL" }), { track: "GENERAL" });
  assert.deepEqual(goalPatch(saved, { ...saved, targetDate: "" }), { targetDate: null });
  assert.deepEqual(goalPatch(saved, { ...saved, goal: "STUDY", targetDate: "2027-01-15" }), {
    goal: "STUDY",
    targetDate: "2027-01-15",
  });
});

test("a target day before today is refused; today itself is fine", () => {
  const today = new Date("2026-11-19T03:00:00.000Z");
  assert.equal(isPastDate("2026-11-18", today), true);
  assert.equal(isPastDate("2026-11-19", today), false);
  assert.equal(isPastDate("", today), false);
});

test("the minute choices keep a value set outside the usual list", () => {
  assert.deepEqual(minuteChoices(30), [10, 15, 20, 30, 45, 60]);
  assert.deepEqual(minuteChoices(25), [10, 15, 20, 25, 30, 45, 60]);
});
