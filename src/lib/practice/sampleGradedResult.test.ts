import assert from "node:assert/strict";
import { test } from "node:test";
import { SAMPLE_SPEAKING, SAMPLE_WRITING } from "./sampleGradedResult.ts";

const words = (text: string) => text.trim().split(/\s+/).length;

test("the writing sample's word count matches its text and range", () => {
  const { detail, answer } = SAMPLE_WRITING;
  assert.equal(detail.wordCount, words(answer));
  const [min, max] = detail.wordRange!;
  assert.ok(detail.wordCount! >= min && detail.wordCount! <= max);
});

test("the writing sample's criteria add up to its score", () => {
  const { detail, score, maxScore } = SAMPLE_WRITING;
  assert.equal(detail.criteria.reduce((s, c) => s + c.score, 0), score);
  assert.equal(detail.criteria.reduce((s, c) => s + c.max, 0), maxScore);
});

test("the writing sample's corrections quote its own text and keywords are present", () => {
  for (const c of SAMPLE_WRITING.detail.corrections) assert.ok(SAMPLE_WRITING.answer.includes(c.original));
  for (const k of SAMPLE_WRITING.detail.keywords) assert.equal(SAMPLE_WRITING.answer.includes(k.keyword), k.present);
});

test("the speaking sample's highlighted words appear in its transcript", () => {
  for (const w of SAMPLE_SPEAKING.words) assert.ok(SAMPLE_SPEAKING.transcript.toLowerCase().includes(w.word));
});

test("no sample claims an official or CEFR result", () => {
  const text = JSON.stringify({ SAMPLE_SPEAKING, SAMPLE_WRITING });
  assert.doesNotMatch(text, /ETS|CEFR|IELTS|\b[ABC][12]\b/);
});
