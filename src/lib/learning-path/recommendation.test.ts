import test from "node:test";
import assert from "node:assert/strict";
import { lockLabel, totalMinutes, visibleReasons } from "./recommendation.ts";

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
