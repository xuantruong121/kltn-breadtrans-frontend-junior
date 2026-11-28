import assert from "node:assert/strict";
import { test } from "node:test";
import { HARD_WORD_LABEL, hardWordsLine } from "./hardWords.ts";

test("the result line counts the hard words, in each game's own verb", () => {
  assert.equal(hardWordsLine("Trúng", { hit: 3, total: 4 }), "Trúng 3/4 từ bạn hay quên.");
  assert.equal(hardWordsLine("Đúng", { hit: 0, total: 2 }), "Đúng 0/2 từ bạn hay quên.");
});

test("no line when the game asked none, or the result is an old one", () => {
  assert.equal(hardWordsLine("Trúng", { hit: 0, total: 0 }), null);
  assert.equal(hardWordsLine("Đúng", undefined), null);
  assert.equal(hardWordsLine("Đúng", null), null);
});

test("a count never runs past the words asked", () => {
  assert.equal(hardWordsLine("Trúng", { hit: 9, total: 4 }), "Trúng 4/4 từ bạn hay quên.");
});

test("the label on a block or a question", () => {
  assert.equal(HARD_WORD_LABEL, "Từ bạn hay quên");
});
