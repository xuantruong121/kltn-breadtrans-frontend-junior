import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { STORY, chapterFor, monsterLine, saysOnHit } from "./dungeonStory.ts";

describe("chapterFor", () => {
  test("five floors a chapter, the fifth a boss", () => {
    assert.deepEqual(chapterFor(1), { number: 1, name: "Lò Ủ Bột", first: 1, bossFloor: 5, step: 0, starts: true });
    assert.equal(chapterFor(5).step, 4);
    assert.equal(chapterFor(5).starts, false);
    assert.deepEqual(chapterFor(6), { number: 2, name: "Kho Đường", first: 6, bossFloor: 10, step: 0, starts: true });
    assert.equal(chapterFor(13).name, "Hầm Men");
  });
  test("after the fourth chapter the names come round with a number", () => {
    assert.equal(chapterFor(20).name, "Lò Than");
    assert.equal(chapterFor(21).name, "Lò Ủ Bột II");
    assert.equal(chapterFor(41).name, "Lò Ủ Bột III");
  });
});

describe("monsterLine", () => {
  test("the same floor gets the same line; every kind and moment has one", () => {
    assert.equal(monsterLine("moldy", 3, "appear"), monsterLine("moldy", 3, "appear"));
    for (const kind of ["moldy", "mouse", "ant", "snail", "sourdough_king", "flour_dragon"] as const)
      for (const moment of ["appear", "hit", "defeat"] as const) assert.ok(monsterLine(kind, 7, moment, 2).length > 3);
  });
  test("hit lines only now and then", () => {
    assert.deepEqual([0, 1, 2, 3, 4].map(saysOnHit), [false, true, false, false, true]);
  });
});

describe("story", () => {
  test("four panels, each with words", () => {
    assert.equal(STORY.length, 4);
    assert.ok(STORY.every((p) => p.text.length > 20));
  });
});
