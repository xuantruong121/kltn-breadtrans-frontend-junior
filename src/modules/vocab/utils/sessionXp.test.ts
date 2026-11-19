import assert from "node:assert/strict";
import { test } from "node:test";
import { addSessionXp, completionXpNote } from "./sessionXp.ts";

test("a study session adds the XP each word reply reports", () => {
  let total = 0;
  total = addSessionXp(total, { xpEarned: 2 });
  total = addSessionXp(total, { xpEarned: 2 });
  total = addSessionXp(total, { xpEarned: 0 });
  assert.equal(total, 4);
});

test("a reply without XP, or a broken one, adds nothing", () => {
  assert.equal(addSessionXp(6, undefined), 6);
  assert.equal(addSessionXp(6, {}), 6);
  assert.equal(addSessionXp(6, { xpEarned: Number.NaN }), 6);
  assert.equal(addSessionXp(6, { xpEarned: -2 }), 6);
  assert.equal(addSessionXp(6, { xpEarned: "4" }), 6);
});

test("the completion note names the XP, and never promises a daily quest", () => {
  assert.equal(completionXpNote(20), "+20 XP cho các từ bạn thuộc lần đầu");
  assert.equal(completionXpNote(0), "Tiến độ học từ của bạn đã được lưu");
  assert.doesNotMatch(completionXpNote(0), /nhiệm vụ/);
});
