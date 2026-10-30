import test from "node:test";
import assert from "node:assert/strict";
import { buildQuizOptions } from "./quizOptions.ts";

const keep = <T,>(arr: T[]) => arr;

test("buildQuizOptions takes 3 distinct meanings from the deck", () => {
  const words = [
    { id: 1, meaning: "chương trình họp" },
    { id: 2, meaning: "biên bản" },
    { id: 3, meaning: "biên bản" },
    { id: 4, meaning: "người tham dự" },
    { id: 5, meaning: "hoãn lại" },
  ];
  const { options, fallbackCount } = buildQuizOptions(words[0], words, keep);
  assert.deepEqual(
    options.map((o) => [o.key, o.text, o.isCorrect]),
    [
      ["1", "chương trình họp", true],
      ["2", "biên bản", false],
      ["3", "người tham dự", false],
      ["4", "hoãn lại", false],
    ],
  );
  assert.equal(fallbackCount, 0);
});

test("buildQuizOptions fills a small deck with generic meanings and says how many", () => {
  const words = [
    { id: 1, meaning: "chương trình họp" },
    { id: 2, meaning: "biên bản" },
  ];
  const { options, fallbackCount } = buildQuizOptions(words[0], words, keep);
  assert.equal(options.length, 4);
  assert.equal(fallbackCount, 2);
});
