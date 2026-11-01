import test from "node:test";
import assert from "node:assert/strict";
import {
  estimateText,
  filterBySkill,
  lockLabel,
  otherSuggestions,
  progressLine,
  skillsWithItems,
  totalMinutes,
  visibleReasons,
  weekPercent,
} from "./recommendation.ts";

test("lock badges name the reason; open items have none", () => {
  assert.equal(lockLabel("OPEN"), null);
  assert.equal(lockLabel("LOCKED_LEVEL"), "Chưa mở mức");
  assert.equal(lockLabel("LOCKED_PLAN", "PLUS"), "Cần gói PLUS");
  assert.equal(lockLabel("LOCKED_PLAN", "PRO"), "Cần gói PRO");
});

test("reasons drop the lock line and keep at most two", () => {
  assert.deepEqual(
    visibleReasons({ reasons: ["Vừa sức mức Cơ bản của bạn", "Chủ đề Công nghệ thông tin", "Ôn lại bài chưa đạt", "Cần gói PLUS hoặc PRO"] }),
    ["Vừa sức mức Cơ bản của bạn", "Chủ đề Công nghệ thông tin"],
  );
  assert.equal(totalMinutes([{ minutes: 10 }, { minutes: 15 }]), 25);
});

test("the skill filter keeps only that skill; ALL keeps everything", () => {
  const items = [{ skill: "READING" as const }, { skill: "WRITING" as const }, { skill: "READING" as const }];
  assert.equal(filterBySkill(items, "ALL").length, 3);
  assert.equal(filterBySkill(items, "READING").length, 2);
  assert.equal(filterBySkill(items, "SPEAKING").length, 0);
});

test("filter chips list only skills that have items, in the given order", () => {
  const items = [{ skill: "WRITING" as const }, { skill: "LISTENING" as const }];
  assert.deepEqual(skillsWithItems(items, ["LISTENING", "READING", "SPEAKING", "WRITING"]), ["LISTENING", "WRITING"]);
});

test("suggestions skip the authored links and put open items first", () => {
  const items = [
    { route: "/speaking/1", status: "LOCKED_PLAN" as const },
    { route: "/speaking/2", status: "OPEN" as const },
    { route: "/speaking/3", status: "OPEN" as const },
  ];
  assert.deepEqual(otherSuggestions(items, ["/speaking/3"], 4).map((i) => i.route), ["/speaking/2", "/speaking/1"]);
  assert.equal(otherSuggestions(items, [], 1).length, 1);
});

test("the week bar is capped at 100", () => {
  assert.equal(weekPercent(1, 4), 25);
  assert.equal(weekPercent(9, 4), 100);
  assert.equal(weekPercent(1, 0), 0);
});

test("the estimate says it is an estimate and what a late target needs", () => {
  const date = (iso: string) => iso;
  const base = { items: 3, days: 2, date: "D", targetDate: null, onTrack: null, minutesNeeded: null };
  assert.match(estimateText(base, date), /ước tính khoảng 2 ngày/);
  assert.match(estimateText({ ...base, onTrack: true }, date), /Kịp ngày mục tiêu/);
  assert.match(estimateText({ ...base, onTrack: false, minutesNeeded: 20 }, date), /khoảng 20 phút mỗi ngày/);
  assert.match(estimateText({ ...base, onTrack: false }, date), /đã qua/);
  assert.match(estimateText({ ...base, items: 0 }, date), /đủ số bài/);
});

test("a progress line shows a trend only when there is one", () => {
  const row = { skill: "READING" as const, attempts: 6, average: 72, trend: 8, startLevel: null, currentLevel: "BASIC" as const, levelsGained: 0 };
  assert.equal(progressLine(row), "6 bài, trung bình 72%, tăng 8 điểm gần đây");
  assert.equal(progressLine({ ...row, trend: -5 }), "6 bài, trung bình 72%, giảm 5 điểm gần đây");
  assert.equal(progressLine({ ...row, trend: null }), "6 bài, trung bình 72%");
  assert.equal(progressLine({ ...row, attempts: 0, average: null }), "Chưa có bài nào");
});
