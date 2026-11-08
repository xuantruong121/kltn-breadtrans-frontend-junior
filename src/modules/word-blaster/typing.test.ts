import { describe, test } from "node:test";
import assert from "node:assert/strict";

import type { ClientBlock } from "./blasterLogic.ts";
import { fitsBlock, isComplete, letters, pickTarget, shotCell, stepInput } from "./typing.ts";

const block = (id: number, kind: ClientBlock["kind"], prompt: string, hint: string | null = null, fallMs = 8000): ClientBlock => ({
  id,
  kind,
  prompt,
  hint,
  spawnAtMs: 0,
  fallMs,
  lane: 0.5,
});

describe("letters", () => {
  test("Vietnamese letters count as one each", () => {
    assert.equal(letters("đàm phán").length, 8);
    assert.equal(letters("đàm").length, 3);
  });
});

describe("fitsBlock", () => {
  test("copy: the next letter must be right, any case", () => {
    const b = block(1, "copy", "Negotiate");
    assert.equal(fitsBlock(b, "neg"), true);
    assert.equal(fitsBlock(b, "nex"), false);
  });
  test("missing: shown letters must match, a gap takes any letter", () => {
    const b = block(1, "missing", "neg_ti_te");
    assert.equal(fitsBlock(b, "nego"), true);
    assert.equal(fitsBlock(b, "negx"), true);
    assert.equal(fitsBlock(b, "nego5"), false);
    assert.equal(fitsBlock(b, "nef"), false);
    assert.equal(fitsBlock(b, "negotiatex"), false);
  });
  test("meanings: words no longer than the hint's, a space between them", () => {
    const b = block(1, "en_to_vi", "negotiate", "___ ____");
    assert.equal(fitsBlock(b, "đàm"), true);
    assert.equal(fitsBlock(b, "đàm "), true);
    assert.equal(fitsBlock(b, "đàm phá"), true);
    assert.equal(fitsBlock(b, "đàmm"), false);
    assert.equal(fitsBlock(b, "đàm  p"), false);
    assert.equal(fitsBlock(b, "a b c"), false);
  });
});

describe("isComplete", () => {
  test("each mode knows when it has all its letters", () => {
    assert.equal(isComplete(block(1, "copy", "budget"), "Budget"), true);
    assert.equal(isComplete(block(1, "copy", "budget"), "budge"), false);
    assert.equal(isComplete(block(1, "missing", "b_dg_t"), "budget"), true);
    assert.equal(isComplete(block(1, "vi_to_en", "ngân sách", "______"), "budget"), true);
    assert.equal(isComplete(block(1, "en_to_vi", "negotiate", "___ ____"), "đàm phán"), true);
    assert.equal(isComplete(block(1, "en_to_vi", "negotiate", "___ ____"), "dam phan"), true);
    assert.equal(isComplete(block(1, "en_to_vi", "negotiate", "___ ____"), "đàm"), false);
  });
});

describe("pickTarget and stepInput", () => {
  const live = [block(1, "copy", "budget", null, 9000), block(2, "copy", "bread", null, 5000), block(3, "copy", "renewal")];
  test("the first letter locks the block closest to landing that fits", () => {
    assert.equal(pickTarget(live, "b", null)?.id, 2);
    assert.equal(pickTarget(live, "bu", null)?.id, 1);
    assert.equal(pickTarget(live, "", 2), null);
  });
  test("a lock holds while the text still fits it", () => {
    assert.equal(pickTarget(live, "b", 1)?.id, 1);
  });
  test("a wrong letter is refused and the box keeps its text", () => {
    const step = stepInput(live, "bud", "budx", 1);
    assert.deepEqual(step, { accepted: false, typed: "bud", targetId: 1 });
  });
  test("a right letter is one shot; the last one completes the word", () => {
    const mid = stepInput(live, "budg", "budge", 1);
    assert.equal(mid.accepted && mid.shots, 1);
    const end = stepInput(live, "budge", "budget", 1);
    assert.equal(end.accepted && end.complete, true);
  });
  test("deleting is always accepted; clearing drops the lock", () => {
    const del = stepInput(live, "bud", "bu", 1);
    assert.equal(del.accepted, true);
    const clear = stepInput(live, "b", "", 1);
    assert.deepEqual(clear, { accepted: true, typed: "", targetId: null, shots: 0, complete: false });
  });
  test("an input method rewriting a letter (dam → đàm) is no new shot", () => {
    const meaning = [block(4, "en_to_vi", "negotiate", "___ ____")];
    const step = stepInput(meaning, "dam", "đàm", 4);
    assert.equal(step.accepted && step.shots, 0);
  });
});

describe("shotCell", () => {
  test("the bullet goes to the letter just typed", () => {
    assert.equal(shotCell(block(1, "copy", "budget"), "bud"), 2);
    assert.equal(shotCell(block(1, "missing", "b_dg_t"), "b"), 0);
    assert.equal(shotCell(block(1, "vi_to_en", "ngân sách", "______"), "bu"), 1);
    assert.equal(shotCell(block(1, "en_to_vi", "negotiate", "___ ____"), "đàm p"), 3);
    assert.equal(shotCell(block(1, "en_to_vi", "negotiate", "___ ____"), "đàm "), 2);
  });
});
