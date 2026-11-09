import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { clockAt, fitsHint, floorLabel, hpTone, typedCells } from "./dungeonLogic.ts";

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
