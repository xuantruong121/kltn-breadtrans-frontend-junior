import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { clockAt, fitsHint, floorLabel, heldLevelLabel, hpTone, MONSTER_NAME, offerLevelLabel, typedCells, DESPERATE_PERCENT, recordLine, recordPassedLine, strikeLabel } from "./dungeonLogic.ts";

describe("clockAt", () => {
  test("waits while the last outcome shows, then runs down", () => {
    assert.deepEqual(clockAt(1000, 11_000, 500), { started: false, share: 1, secondsLeft: 10, out: false });
    assert.deepEqual(clockAt(1000, 11_000, 6000), { started: true, share: 0.5, secondsLeft: 5, out: false });
    assert.equal(clockAt(1000, 11_000, 12_000).out, true);
    assert.equal(clockAt(null, null, 0).started, false);
  });
});

describe("boss letters", () => {
  test("typed text must fit the hint", () => {
    assert.equal(fitsHint("______", "budg"), true);
    assert.equal(fitsHint("______", "budgets"), false);
    assert.equal(fitsHint("____ ___", "take off"), true);
    assert.equal(fitsHint("____ ___", "take offs"), false);
    assert.equal(fitsHint("____ ___", "take of"), true);
    assert.equal(fitsHint("______", "bud9"), false);
    assert.equal(fitsHint("______", " b"), false);
  });
  test("cells show typed letters, else revealed ones, else empty", () => {
    const cells = typedCells("______", "bu", "");
    assert.deepEqual(cells[0].slice(0, 3), [
      { char: "b", state: "revealed" },
      { char: "u", state: "revealed" },
      { char: "", state: "empty" },
    ]);
    const typed = typedCells("______", "bu", "bud");
    assert.deepEqual(typed[0].slice(0, 4).map((c) => c.state), ["typed", "typed", "typed", "empty"]);
    assert.equal(typedCells("____ ___", "", "take o")[1][0].char, "o");
  });
});

describe("labels", () => {
  test("floor and health", () => {
    assert.equal(floorLabel(5, true), "Tầng 5 · Boss");
    assert.equal(floorLabel(3, false), "Tầng 3");
    assert.deepEqual(hpTone(100, 100), { share: 1, tone: "ok" });
    assert.equal(hpTone(40, 100).tone, "low");
    assert.equal(hpTone(20, 100).tone, "critical");
  });
});

test("the monsters, nine and five bosses, are named for their Kenney sprites (owner 2026-11-09)", () => {
  assert.equal(MONSTER_NAME.ant, "Bọ Rùa Đường");
  assert.equal(MONSTER_NAME.flour_dragon, "Slime Lửa Khổng Lồ");
  assert.equal(MONSTER_NAME.sourdough_king, "Vua Bột Chua");
  assert.equal(Object.keys(MONSTER_NAME).length, 14);
  assert.equal(MONSTER_NAME.yeast_frog, "Ếch Chúa Men");
});

describe("topping level labels", () => {
  test("an offer says whether it is new or what level it reaches", () => {
    assert.equal(offerLevelLabel({ level: 0, max: 3 }), "Mới");
    assert.equal(offerLevelLabel({ level: 1, max: 3 }), "Lên cấp 2/3");
    assert.equal(offerLevelLabel({ level: 2, max: 99 }), "Đã dùng 2 lần");
  });
  test("a held topping says its level, or its uses for Dưa leo", () => {
    assert.equal(heldLevelLabel({ level: 2, max: 3 }), "Cấp 2/3");
    assert.equal(heldLevelLabel({ level: 1, max: 1 }), "Cấp 1/1");
    assert.equal(heldLevelLabel({ level: 3, max: 99 }), "Đã dùng 3 lần");
  });
});

test("the boss's strike is counted down, then called", () => {
  assert.equal(strikeLabel(undefined), null);
  assert.deepEqual(strikeLabel(2), { text: "Boss ra đòn sau 2 câu", now: false });
  assert.deepEqual(strikeLabel(1), { text: "Boss ra đòn sau 1 câu", now: false });
  assert.deepEqual(strikeLabel(0), { text: "Boss ra đòn! Đúng thì phá đòn", now: true });
});

test("the record to beat is named, then said to be passed", () => {
  const today = { floor: 12, whose: "today" as const };
  const mine = { floor: 7, whose: "mine" as const };
  assert.equal(recordLine(null, 3), null);
  assert.equal(recordLine({ floor: 0, whose: "mine" }, 3), null);
  assert.equal(recordLine(today, 3), "Dẫn đầu hôm nay: tầng 12");
  assert.equal(recordLine(today, 12), "Dẫn đầu hôm nay: tầng 12");
  assert.equal(recordLine(today, 13), "Bạn đang dẫn đầu hôm nay");
  assert.equal(recordLine(mine, 7), "Kỷ lục của bạn: tầng 7");
  assert.equal(recordLine(mine, 8), "Kỷ lục mới của bạn");
});

test("passing the record is said once, on the floor that goes past it", () => {
  const today = { floor: 12, whose: "today" as const };
  assert.equal(recordPassedLine(today, 11, 12), null);
  assert.equal(recordPassedLine(today, 12, 13), "Vượt mốc dẫn đầu hôm nay!");
  assert.equal(recordPassedLine(today, 13, 14), null);
  assert.equal(recordPassedLine({ floor: 7, whose: "mine" }, 7, 8), "Vượt kỷ lục của bạn!");
  assert.equal(recordPassedLine(null, 7, 8), null);
});

test("low health says the same number the server applies", () => {
  assert.equal(DESPERATE_PERCENT, 30);
});
