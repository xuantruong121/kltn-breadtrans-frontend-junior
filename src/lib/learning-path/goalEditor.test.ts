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
  track: "OFFICE_BUSINESS" as const,
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

test("the summary names the goal, the track, the time and the target day", () => {
  assert.equal(
    goalSummary(profile),
    "Đạt điểm TOEIC · Văn phòng – Kinh doanh · 30 phút mỗi ngày · Ngày mục tiêu 20/12/2026",
  );
  assert.equal(
    goalSummary({ ...profile, goal: "GENERAL", track: "GENERAL", targetDate: null }),
    "Tiếng Anh tổng quát · Chưa xác định lĩnh vực · 30 phút mỗi ngày · Chưa đặt ngày mục tiêu",
  );
});

test("only the changed fields are sent, and an empty day clears the target", () => {
  const saved = goalDraft(profile);
  assert.deepEqual(goalPatch(saved, saved), {});
  assert.deepEqual(goalPatch(saved, { ...saved, minutesPerDay: 45 }), { minutesPerDay: 45 });
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
