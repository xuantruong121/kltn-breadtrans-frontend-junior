import test from "node:test";
import assert from "node:assert/strict";
import { DEMO, chunkWords, litChunks } from "./speakingDemo.ts";

const EXPECTED_WORDS: [string, number][] = [
  ["The", 91],
  ["university", 100],
  ["library", 97],
  ["is", 97],
  ["open", 94],
  ["from", 100],
  ["Monday", 100],
  ["to", 97],
  ["Friday", 97],
  ["from", 97],
  ["eight", 97],
  ["in", 97],
  ["the", 94],
  ["morning", 97],
  ["until", 97],
  ["ten", 91],
  ["at", 97],
  ["night.", 91],
];

test("the demo keeps the 18 words of submission 309 in order, with their scores", () => {
  assert.equal(DEMO.words.length, 18);
  assert.deepEqual(
    DEMO.words.map((w) => [w.word, w.score]),
    EXPECTED_WORDS,
  );
  assert.equal(DEMO.words.map((w) => w.word).join(" "), DEMO.sentence);
});

test("the demo names its source and its overall scores", () => {
  assert.equal(DEMO.exerciseId, 137);
  assert.equal(DEMO.submissionId, 309);
  assert.equal(
    DEMO.audioSrc,
    "https://pub-ecd236c9754a4b7cb22ab82189e6ded2.r2.dev/catalog/speaking/reference/137.v2.mp3",
  );
  assert.equal(DEMO.overall, 9.6);
  assert.equal(DEMO.accuracy, 96);
  assert.equal(DEMO.fluency, 94);
  assert.equal(DEMO.completeness, 100);
});

test("chunkWords splits the sentence into 6 runs that keep every word in order", () => {
  const chunks = chunkWords(DEMO.words, 6);
  assert.equal(chunks.length, 6);
  for (const chunk of chunks) {
    assert.ok(chunk.words.length >= 1);
    assert.equal(
      chunk.weight,
      chunk.words.reduce((sum, w) => sum + w.word.length, 0),
    );
  }
  assert.deepEqual(
    chunks.flatMap((c) => c.words),
    DEMO.words,
  );
});

test("chunkWords keeps the runs close in length", () => {
  const chunks = chunkWords(DEMO.words, 6);
  const weights = chunks.map((c) => c.weight);
  const total = weights.reduce((a, b) => a + b, 0);
  const even = total / 6;
  for (const weight of weights) assert.ok(Math.abs(weight - even) <= 4, `weight ${weight} vs ${even}`);
});

test("chunkWords never makes an empty run", () => {
  const few = DEMO.words.slice(0, 3);
  assert.deepEqual(
    chunkWords(few, 6).map((c) => c.words.length),
    [1, 1, 1],
  );
  assert.deepEqual(chunkWords(DEMO.words, 0), []);
  assert.deepEqual(chunkWords([], 6), []);
  assert.equal(chunkWords(DEMO.words, 1)[0].words.length, 18);
});

test("litChunks lights nothing at the start and every run at the end", () => {
  const chunks = chunkWords(DEMO.words, 6);
  assert.equal(litChunks(0, 9, chunks), 0);
  assert.equal(litChunks(9, 9, chunks), 6);
  assert.equal(litChunks(12, 9, chunks), 6);
});

test("litChunks only grows while the clip plays", () => {
  const chunks = chunkWords(DEMO.words, 6);
  let previous = 0;
  const seen = new Set<number>();
  for (let t = 0; t <= 9; t += 0.05) {
    const lit = litChunks(t, 9, chunks);
    assert.ok(lit >= previous, `lit fell from ${previous} to ${lit} at ${t}`);
    assert.ok(lit >= 0 && lit <= 6);
    previous = lit;
    seen.add(lit);
  }
  assert.deepEqual([...seen].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6]);
});

test("litChunks lights a run as soon as its first word starts", () => {
  const chunks = chunkWords(DEMO.words, 6);
  const total = chunks.reduce((sum, c) => sum + c.weight, 0);
  // Just past the start of the second run: two runs are lit.
  const startOfSecond = chunks[0].weight / total;
  assert.equal(litChunks(startOfSecond * 9 + 0.001, 9, chunks), 2);
  assert.equal(litChunks(0.001, 9, chunks), 1);
});

test("litChunks lights nothing when the duration is unknown", () => {
  const chunks = chunkWords(DEMO.words, 6);
  assert.equal(litChunks(5, 0, chunks), 0);
  assert.equal(litChunks(5, Number.NaN, chunks), 0);
  assert.equal(litChunks(Number.NaN, 9, chunks), 0);
  assert.equal(litChunks(5, Number.POSITIVE_INFINITY, chunks), 0);
  assert.equal(litChunks(-1, 9, chunks), 0);
  assert.equal(litChunks(5, 9, []), 0);
});
