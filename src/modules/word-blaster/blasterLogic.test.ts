import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { blasterResultCopy } from "./blasterResult.ts";
import { blockMarks, easeAngle, fillHint, fitsHint } from "./blasterLogic.ts";
import { aimTarget, clockOffset, fallProgress, gameProgress, gameTime, liveBlocks, localState, type ClientBlock } from "./blasterLogic.ts";

const block = (id: number, spawnAtMs: number, fallMs: number, kind: ClientBlock["kind"] = "copy", prompt = `w${id}`): ClientBlock => ({
  id,
  kind,
  prompt,
  spawnAtMs,
  fallMs,
  lane: 0.5,
});

describe("clock", () => {
  test("game time follows the server's clock", () => {
    const offset = clockOffset(10_500, 10_000);
    assert.equal(offset, 500);
    assert.equal(gameTime(12_000, offset, 9_000), 3_500);
  });
});

describe("blocks on screen", () => {
  const blocks = [block(1, 0, 4000), block(2, 2000, 4000), block(3, 9000, 4000)];
  test("fall progress runs from 0 to 1, null before the block appears", () => {
    assert.equal(fallProgress(blocks[0], 2000), 0.5);
    assert.equal(fallProgress(blocks[2], 1000), null);
    assert.equal(fallProgress(blocks[0], 9999), 1);
  });
  test("live blocks are the appeared, unbroken, unlanded ones", () => {
    assert.deepEqual(liveBlocks(blocks, { 2: 2500 }, 3000).map((b) => b.id), [1]);
    assert.deepEqual(liveBlocks(blocks, {}, 4500).map((b) => b.id), [2]);
  });
  test("progress counts the blocks that have appeared", () => {
    assert.equal(gameProgress(blocks, 2500), 2 / 3);
  });
});

describe("localState", () => {
  test("three landings lose; everything gone with a life left wins", () => {
    const three = [block(1, 0, 1000), block(2, 0, 2000), block(3, 0, 3000)];
    assert.deepEqual(localState(three, {}, 5000), { destroyed: 0, landed: 3, livesLeft: 0, over: true });
    assert.deepEqual(localState(three, { 1: 500, 2: 600 }, 5000), { destroyed: 2, landed: 1, livesLeft: 2, over: true });
    assert.equal(localState(three, {}, 1200).over, false, "a landing within the grace is not counted yet");
  });
});

describe("aimTarget", () => {
  const live = [
    block(1, 0, 8000, "copy", "negotiate"),
    block(2, 0, 5000, "missing", "r_n_wal"),
    block(3, 0, 6000, "en_to_vi", "budget"),
  ];
  test("aims at the word that fits what is typed", () => {
    assert.equal(aimTarget(live, "neg")?.id, 1);
    assert.equal(aimTarget(live, "ren")?.id, 2);
    assert.equal(aimTarget(live, "zzz")?.id, 2, "nothing fits: the block closest to landing");
  });
  test("with nothing typed, the block closest to landing", () => {
    assert.equal(aimTarget(live, "")?.id, 2);
    assert.equal(aimTarget([], "a"), null);
  });
});

describe("blasterResultCopy", () => {
  const base = { forfeit: false, destroyed: 18, landed: 2, stake: 50, bonusCapped: 0 };
  test("a win, a loss and leaving", () => {
    assert.deepEqual(blasterResultCopy({ ...base, outcome: "win", net: 25 }), {
      title: "Bạn thắng!",
      line: "Bắn vỡ 18 khối, chỉ để lọt 2.",
      banh: "+25",
      note: null,
    });
    const lose = blasterResultCopy({ ...base, outcome: "lose", destroyed: 9, landed: 3, net: -50 });
    assert.equal(lose.title, "Hết mạng");
    assert.equal(lose.banh, "−50");
    assert.equal(blasterResultCopy({ ...base, outcome: "lose", forfeit: true, net: -50 }).title, "Đã thoát ván");
  });
  test("a win whose bonus met the daily cap says so", () => {
    const capped = blasterResultCopy({ ...base, outcome: "win", net: 0, bonusCapped: 25 });
    assert.equal(capped.banh, "±0");
    assert.match(capped.note ?? "", /đủ 150 Bánh Mì/);
  });
});

describe("letter hints (word-to-meaning mode)", () => {
  test("typed words must fit the hint's words", () => {
    assert.equal(fitsHint("___ ____", "đàm"), true);
    assert.equal(fitsHint("___ ____", "dam ph"), true);
    assert.equal(fitsHint("___ ____", "đàmm"), false);
    assert.equal(fitsHint("___ ____", "a b c"), false);
    assert.equal(fitsHint("___ ____", " "), false);
  });
  test("typed letters fill the underscores word by word", () => {
    const rows = fillHint("___ ____", "đàm ph");
    assert.deepEqual(rows.map((w) => w.map((c) => c.char).join("")), ["đàm", "ph__"]);
    assert.equal(rows[1][2].filled, false);
  });
  test("the cannon aims at the meaning block whose hint fits", () => {
    const live = [
      { ...block(1, 0, 5000, "en_to_vi", "rent"), hint: "__ __" },
      { ...block(2, 0, 9000, "en_to_vi", "negotiate"), hint: "___ ____" },
    ];
    assert.equal(aimTarget(live, "dam")?.id, 2, "three letters do not fit a two-letter word");
    assert.equal(aimTarget(live, "di t")?.id, 1, "both fit: the block closest to landing");
  });
});

describe("blockMarks", () => {
  const b = (id: number, spawnAtMs: number, fallMs: number): ClientBlock => ({ id, kind: "copy", prompt: "x", spawnAtMs, fallMs, lane: 0.5 });
  const blocks = [b(1, 0, 1000), b(2, 500, 1000), b(3, 1000, 1000)];
  test("each block keeps its own place: a red mark does not move when a later block breaks", () => {
    assert.equal(blockMarks(blocks, {}, 1500), "lpp");
    assert.equal(blockMarks(blocks, { 2: 1200 }, 1500), "lhp");
    assert.equal(blockMarks(blocks, { 2: 1200, 3: 1300 }, 1500), "lhh");
  });
  test("a landing counts only after the grace, like the server", () => {
    assert.equal(blockMarks(blocks, {}, 1000 + 400), "ppp");
    assert.equal(blockMarks(blocks, {}, 1000 + 401), "lpp");
  });
});

describe("easeAngle", () => {
  test("moves toward the target and settles on it", () => {
    const one = easeAngle(0, 40, 16);
    assert.ok(one > 0 && one < 40);
    let a = 0;
    for (let i = 0; i < 60; i += 1) a = easeAngle(a, 40, 16);
    assert.equal(a, 40);
    assert.equal(easeAngle(10, 10, 16), 10);
  });
});
