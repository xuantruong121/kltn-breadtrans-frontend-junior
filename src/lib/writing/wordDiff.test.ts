import assert from "node:assert/strict";
import test from "node:test";

import { diffCounts, wordDiff, WORD_DIFF_LIMIT } from "./wordDiff.ts";

test("an unchanged text is one same part", () => {
  assert.deepEqual(wordDiff("She asks for a refund.", "She  asks for a\nrefund."), [
    { kind: "same", text: "She asks for a refund." },
  ]);
});

test("a corrected word is removed then added, the rest stays", () => {
  const parts = wordDiff("She ask for a refund.", "She asks for a refund.");
  assert.deepEqual(parts, [
    { kind: "same", text: "She" },
    { kind: "removed", text: "ask" },
    { kind: "added", text: "asks" },
    { kind: "same", text: "for a refund." },
  ]);
  assert.deepEqual(diffCounts(parts), { removed: 1, added: 1 });
});

test("added and removed runs are grouped", () => {
  const parts = wordDiff("I want my money back now please", "I would like a refund please");
  assert.deepEqual(parts[0], { kind: "same", text: "I" });
  assert.deepEqual(parts[parts.length - 1], { kind: "same", text: "please" });
  assert.deepEqual(diffCounts(parts), { removed: 5, added: 4 });
});

test("an empty side gives only the other side", () => {
  assert.deepEqual(wordDiff("", "New text"), [{ kind: "added", text: "New text" }]);
  assert.deepEqual(wordDiff("Old text", "  "), [{ kind: "removed", text: "Old text" }]);
  assert.deepEqual(wordDiff("", ""), []);
});

test("a very long text is not compared word by word", () => {
  const long = Array.from({ length: WORD_DIFF_LIMIT + 1 }, (_, i) => `w${i}`).join(" ");
  const parts = wordDiff(long, "short");
  assert.deepEqual(
    parts.map((p) => p.kind),
    ["removed", "added"],
  );
});
