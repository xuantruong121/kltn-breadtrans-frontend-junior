import assert from "node:assert/strict";
import { test } from "node:test";
import { formatXp, levelStartXp, xpLevel, xpLevelProgress } from "./xpLevel.ts";

test("the level thresholds are the server's: 50 · L · (L − 1) XP in total", () => {
  // Same table as ranking.logic.ts on the backend (the ranking page shows its level).
  assert.deepEqual(
    [2, 3, 4, 5, 6, 7].map(levelStartXp),
    [100, 300, 600, 1000, 1500, 2100],
  );
  assert.equal(xpLevel(99), 1);
  assert.equal(xpLevel(100), 2);
  assert.equal(xpLevel(299), 2);
  assert.equal(xpLevel(300), 3);
  assert.equal(xpLevel(1436), 5);
  assert.equal(xpLevel(1500), 6);
});

test("progress runs from the current level's start to the next one's", () => {
  assert.deepEqual(xpLevelProgress(1436), {
    level: 5,
    nextLevel: 6,
    levelStartXp: 1000,
    nextLevelXp: 1500,
    earned: 436,
    span: 500,
    remaining: 64,
    ratio: 0.872,
  });
});

test("a new learner is level 1 with 100 XP to go; a level reached starts empty", () => {
  assert.equal(xpLevelProgress(0).level, 1);
  assert.equal(xpLevelProgress(0).remaining, 100);
  assert.equal(xpLevelProgress(0).ratio, 0);
  assert.deepEqual(
    [xpLevelProgress(100).level, xpLevelProgress(100).earned, xpLevelProgress(100).span],
    [2, 0, 200],
  );
});

test("a broken total counts as nothing", () => {
  for (const bad of [-50, Number.NaN, Number.POSITIVE_INFINITY]) {
    const p = xpLevelProgress(bad);
    assert.equal(p.level, 1);
    assert.equal(p.earned, 0);
  }
});

test("XP is written the Vietnamese way", () => {
  assert.equal(formatXp(1436), "1.436");
  assert.equal(formatXp(64), "64");
  assert.equal(formatXp(1500000), "1.500.000");
});
