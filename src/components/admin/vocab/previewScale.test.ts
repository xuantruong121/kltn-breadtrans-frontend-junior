import assert from "node:assert/strict";
import test from "node:test";

import { SCALE_STEP, STUDY_WIDTH, nextScale } from "./previewScale.ts";

test("a rail as wide as the study room is drawn at full size, never larger", () => {
  assert.equal(nextScale(0.5, 560), 1);
  assert.equal(nextScale(0.5, 900), 1);
});

test("a narrower rail scales the study room down to fit", () => {
  assert.equal(nextScale(1, 332), 332 / STUDY_WIDTH);
});

test("a wobble of a few pixels in the rail's width does not move the scale", () => {
  const fitted = 332 / STUDY_WIDTH;
  assert.equal(nextScale(fitted, 332 - 8), fitted);
  assert.equal(nextScale(fitted, 332 + 8), fitted);
});

test("a real change of the rail's width is followed", () => {
  const fitted = 332 / STUDY_WIDTH;
  // A scrollbar's 15px is 0.027, over the step: only the reserved gutter
  // (scrollbar-gutter: stable on the rail) keeps that from looping.
  assert.equal(nextScale(fitted, 317), 317 / STUDY_WIDTH);
});

test("the step is the smallest change that is followed", () => {
  const base = 0.6;
  assert.equal(nextScale(base, (base + SCALE_STEP / 2) * STUDY_WIDTH), base);
  assert.notEqual(nextScale(base, (base + SCALE_STEP * 2) * STUDY_WIDTH), base);
});

test("a rail that has no width yet keeps the previous scale", () => {
  assert.equal(nextScale(0.6, 0), 0.6);
  assert.equal(nextScale(0.6, -5), 0.6);
  assert.equal(nextScale(0.6, Number.NaN), 0.6);
});
