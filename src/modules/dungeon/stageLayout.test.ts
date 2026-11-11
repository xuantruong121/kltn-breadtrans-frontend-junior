import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { overlayArea, stageMode } from "./stageLayout.ts";

describe("stageMode", () => {
  test("tall phones and laptops keep the big monster and stacked answers", () => {
    assert.deepEqual(stageMode(390, 844), { landscape: false, compact: false, monsterSize: 210 });
    assert.deepEqual(stageMode(1366, 900), { landscape: false, compact: false, monsterSize: 210 });
  });
  test("short screens get a smaller monster and answers two by two", () => {
    assert.deepEqual(stageMode(375, 667), { landscape: false, compact: true, monsterSize: 132 });
    assert.deepEqual(stageMode(320, 568), { landscape: false, compact: true, monsterSize: 96 });
  });
  test("a phone on its side puts the monster beside the question", () => {
    assert.deepEqual(stageMode(844, 390), { landscape: true, compact: true, monsterSize: 104 });
  });
});

describe("overlayArea", () => {
  test("wide screens: a column at the right edge, under the HUD", () => {
    assert.deepEqual(overlayArea(1366, 900, 96, { top: 521, left: 347, right: 1019, bottom: 763 }), {
      top: 104,
      left: 1062,
      width: 288,
      maxHeight: 780,
    });
  });
  test("phones: the strip between the HUD and the answers", () => {
    const a = overlayArea(390, 844, 92, { top: 442, left: 12, right: 378, bottom: 769 });
    assert.deepEqual(a, { top: 100, left: 8, width: 374, maxHeight: 334 });
    assert.ok(a.top + a.maxHeight <= 442);
  });
  test("a phone on its side: the column left of the answers", () => {
    assert.deepEqual(overlayArea(844, 390, 76, { top: 84, left: 324, right: 832, bottom: 380 }), {
      top: 84,
      left: 8,
      width: 308,
      maxHeight: 298,
    });
  });
  test("no answers on screen (choosing a topping): down to the bottom", () => {
    assert.equal(overlayArea(390, 844, 92, null).maxHeight, 844 - 100 - 8);
  });
});
