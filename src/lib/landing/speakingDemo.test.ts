import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  DEMO,
  SCORE_BAND_LABEL,
  chipBandLabel,
  chipText,
  chunkWords,
  litChunks,
  passesStandard,
  readingRun,
  runOfEachWord,
  scoreBand,
  SCORE_BAND_LEGEND,
} from "./speakingDemo.ts";
import { getAccuracyTier } from "../speaking/speakingPracticeLogic.ts";

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

test("the demo keeps the 18 words of submission 309 in order, with their scores and error types", () => {
  assert.equal(DEMO.words.length, 18);
  assert.deepEqual(
    DEMO.words.map((w) => [w.word, w.score]),
    EXPECTED_WORDS,
  );
  assert.equal(DEMO.words.map((w) => w.word).join(" "), DEMO.sentence);
  // Read from kltn_db (read-only) on 23/11/2026: every word of submission 309 has errorType "None".
  assert.deepEqual(
    DEMO.words.map((w) => w.errorType),
    Array.from({ length: 18 }, () => "None"),
  );
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

test("runOfEachWord maps each of the 18 words to its run, in order", () => {
  const chunks = chunkWords(DEMO.words, 6);
  const runs = runOfEachWord(chunks);
  assert.equal(runs.length, 18);
  assert.equal(runs[0], 0);
  assert.equal(runs[17], 5);
  for (let i = 1; i < runs.length; i++) assert.ok(runs[i] - runs[i - 1] === 0 || runs[i] - runs[i - 1] === 1);
  for (let run = 0; run < chunks.length; run++) {
    assert.deepEqual(
      DEMO.words.filter((_, i) => runs[i] === run),
      chunks[run].words,
    );
  }
  assert.deepEqual(runOfEachWord([]), []);
});

test("readingRun is the last lit run, and nothing before the first run lights", () => {
  assert.equal(readingRun(0, 6), -1);
  assert.equal(readingRun(1, 6), 0);
  assert.equal(readingRun(3, 6), 2);
  assert.equal(readingRun(6, 6), 5);
  assert.equal(readingRun(7, 6), -1);
  assert.equal(readingRun(-1, 6), -1);
  assert.equal(readingRun(2.5, 6), -1);
  assert.equal(readingRun(Number.NaN, 6), -1);
  assert.equal(readingRun(1, 0), -1);
});

test("the highlighted chips follow the clip: none while the duration is unknown, the last run at the end", () => {
  const chunks = chunkWords(DEMO.words, 6);
  const runs = runOfEachWord(chunks);
  const highlighted = (t: number, duration: number) => {
    const run = readingRun(litChunks(t, duration, chunks), chunks.length);
    return DEMO.words.filter((_, i) => runs[i] === run).map(chipText);
  };
  assert.deepEqual(highlighted(0, 9), []);
  assert.deepEqual(highlighted(5, 0), []);
  assert.deepEqual(highlighted(5, Number.NaN), []);
  assert.deepEqual(highlighted(Number.NaN, 9), []);
  assert.deepEqual(highlighted(0.001, 9), chunks[0].words.map(chipText));
  assert.deepEqual(highlighted(9, 9), ["until", "ten", "at", "night"]);
  assert.deepEqual(highlighted(12, 9), ["until", "ten", "at", "night"]);
  // While the clip plays, exactly one run's chips are highlighted at a time.
  for (let t = 0.05; t < 9; t += 0.25) {
    const run = readingRun(litChunks(t, 9, chunks), chunks.length);
    assert.ok(run >= 0 && run < 6, `run ${run} at ${t}`);
  }
});

test("a chip shows the word without closing punctuation; its title carries band and score", () => {
  assert.deepEqual(DEMO.words.map(chipText).slice(-2), ["at", "night"]);
  assert.equal(chipText({ word: "Monday", score: 100 }), "Monday");
  assert.ok(DEMO.words.map(chipText).every((t) => !/\d/.test(t)));
  assert.equal(chipBandLabel({ word: "night.", score: 91 }), "Đạt chuẩn (91%)");
  assert.equal(chipBandLabel({ word: "x", score: 79 }), "Cần chỉnh lại (79%)");
  assert.equal(chipBandLabel({ word: "x", score: 59 }), "Chưa đạt (59%)");
  assert.deepEqual(SCORE_BAND_LABEL, { pass: "Đạt chuẩn", fix: "Cần chỉnh lại", fail: "Chưa đạt" });
});

test("scoreBand follows the product's thresholds at every boundary", () => {
  assert.equal(scoreBand(0), "fail");
  assert.equal(scoreBand(59), "fail");
  assert.equal(scoreBand(60), "fix");
  assert.equal(scoreBand(79), "fix");
  assert.equal(scoreBand(80), "pass");
  assert.equal(scoreBand(100), "pass");
});

test("scoreBand and its labels agree with the app's getAccuracyTier at every boundary", () => {
  for (const score of [0, 59, 60, 79, 80, 100])
    assert.equal(SCORE_BAND_LABEL[scoreBand(score)], getAccuracyTier(score).label, `score ${score}`);
});

test("the legend reads as the result screen's: Đạt chuẩn (≥ 80%), Cần chỉnh lại (60-79%), Chưa đạt (< 60%)", () => {
  assert.deepEqual(SCORE_BAND_LEGEND, {
    pass: "Đạt chuẩn (≥ 80%)",
    fix: "Cần chỉnh lại (60-79%)",
    fail: "Chưa đạt (< 60%)",
  });
  // The result screen writes them with HTML entities.
  const page = fs.readFileSync(path.resolve(import.meta.dirname, "../../app/(student)/speaking/[id]/page.tsx"), "utf8");
  for (const item of ["Đạt chuẩn (&ge; 80%)", "Cần chỉnh lại (60-79%)", "Chưa đạt (&lt; 60%)"])
    assert.ok(page.includes(item), `the result screen's legend has ${item}`);
});

test("18/18 words of submission 309 pass under the result screen's rule: 80 or more and errorType None", () => {
  assert.equal(DEMO.words.filter(passesStandard).length, 18);
  // The rule needs both: a high score with an error, or a clean word under 80, does not pass.
  assert.equal(passesStandard({ score: 80, errorType: "None" }), true);
  assert.equal(passesStandard({ score: 79, errorType: "None" }), false);
  assert.equal(passesStandard({ score: 95, errorType: "Mispronunciation" }), false);
  assert.equal(passesStandard({ score: 100, errorType: "Omission" }), false);
});
