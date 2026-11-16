import assert from "node:assert/strict";
import test from "node:test";

import type { SavedWord } from "../api/services/vocab.service.ts";
import {
  answerCard,
  filterSavedWords,
  findSavedWord,
  flipCard,
  reviewDone,
  reviewForgotten,
  shuffled,
  sortSavedWords,
  startReview,
} from "./savedWords.ts";

const word = (id: number, w: string, meaning: string, savedAt: string, canonical = w.toLowerCase()): SavedWord => ({
  id,
  word: w,
  canonicalWord: canonical,
  savedAt,
  pos: "noun",
  meaning,
});

const words = [
  word(1, "appointment", "cuộc hẹn", "2026-11-14T10:00:00Z"),
  word(2, "opens", "mở", "2026-11-16T10:00:00Z", "open"),
  word(3, "Library", "thư viện", "2026-11-15T10:00:00Z"),
];

test("search finds a word by itself, its dictionary form or its meaning, marks ignored", () => {
  assert.deepEqual(filterSavedWords(words, "APPOINT").map((w) => w.id), [1]);
  assert.deepEqual(filterSavedWords(words, "open").map((w) => w.id), [2]);
  assert.deepEqual(filterSavedWords(words, "thu vien").map((w) => w.id), [3]);
  assert.deepEqual(filterSavedWords(words, "hẹn").map((w) => w.id), [1]);
  assert.equal(filterSavedWords(words, "  ").length, 3);
  assert.equal(filterSavedWords(words, "zebra").length, 0);
});

test("newest first by default, or A–Z ignoring case", () => {
  assert.deepEqual(sortSavedWords(words, "newest").map((w) => w.id), [2, 3, 1]);
  assert.deepEqual(sortSavedWords(words, "az").map((w) => w.word), ["appointment", "Library", "opens"]);
  // The input is left as it was.
  assert.deepEqual(words.map((w) => w.id), [1, 2, 3]);
});

test("a flashcard word is matched on the dictionary form or as saved", () => {
  assert.equal(findSavedWord(words, "open")?.id, 2);
  assert.equal(findSavedWord(words, "Opens")?.id, 2);
  assert.equal(findSavedWord(words, "library")?.id, 3);
  assert.equal(findSavedWord(words, "book"), undefined);
  assert.equal(findSavedWord(words, " "), undefined);
});

test("shuffle keeps every item once", () => {
  const out = shuffled([1, 2, 3, 4, 5], () => 0.42);
  assert.deepEqual([...out].sort(), [1, 2, 3, 4, 5]);
});

test("a review round: flip, answer, finish, then go again over the words not remembered", () => {
  const keep = () => 0.999; // Fisher–Yates with this source keeps the order
  let s = startReview([1, 2, 3], keep);
  assert.deepEqual(s.order, [1, 2, 3]);
  assert.equal(s.flipped, false);
  s = flipCard(s);
  assert.equal(s.flipped, true);
  s = answerCard(s, true);
  assert.equal(s.index, 1);
  assert.equal(s.flipped, false, "the next card starts face up");
  s = answerCard(s, false);
  s = answerCard(s, false);
  assert.equal(reviewDone(s), true);
  assert.deepEqual(s.remembered, [1]);
  assert.deepEqual(s.forgotten, [2, 3]);
  // Answering after the end changes nothing.
  assert.deepEqual(answerCard(s, true), s);
  assert.deepEqual(flipCard(s), s);
  const again = reviewForgotten(s, keep);
  assert.deepEqual(again.order, [2, 3]);
  assert.deepEqual(again.remembered, []);
});
