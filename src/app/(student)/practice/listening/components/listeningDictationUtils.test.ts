import assert from "node:assert/strict";
import test from "node:test";
import {
  buildProgressiveAnswer,
  canonicalizeSubmittedDictation,
  diffDictationAnswer,
  normalizeDictationText,
} from "./listeningDictationUtils.ts";

test("normalizes whitespace and curly apostrophes", () => {
  assert.equal(normalizeDictationText("  Don’t   worry! "), "don't worry!");
});

test("canonicalizeSubmittedDictation normalizes case and adds trailing space when prefix matches", () => {
  const expected = "The museum is located near the park.";
  assert.equal(canonicalizeSubmittedDictation(expected, "the"), "The ");
  assert.equal(canonicalizeSubmittedDictation(expected, "the museum"), "The museum ");
  assert.equal(canonicalizeSubmittedDictation(expected, "the musuem"), "The musuem");
  assert.equal(canonicalizeSubmittedDictation(expected, "the museum is located near the park."), "The museum is located near the park.");
  assert.equal(canonicalizeSubmittedDictation("Well, I don't know.", "well i dont"), "Well, I don't ");
  assert.equal(canonicalizeSubmittedDictation(expected, ""), "");
  assert.equal(canonicalizeSubmittedDictation(null, "the"), "the");
});

test("returns useful missing and extra word feedback", () => {
  assert.deepEqual(
    diffDictationAnswer("The price per pint has tripled", "The price for pint has triple"),
    [
      { kind: "same", text: "the" },
      { kind: "same", text: "price" },
      { kind: "extra", text: "for" },
      { kind: "missing", text: "per" },
      { kind: "same", text: "pint" },
      { kind: "same", text: "has" },
      { kind: "extra", text: "triple" },
      { kind: "missing", text: "tripled" },
    ],
  );
});

test("handles null or undefined input safely without throwing", () => {
  assert.equal(normalizeDictationText(undefined), "");
  assert.equal(normalizeDictationText(null), "");
  assert.deepEqual(diffDictationAnswer(undefined, undefined), []);
  assert.deepEqual(diffDictationAnswer("Hello world", undefined), [
    { kind: "missing", text: "hello" },
    { kind: "missing", text: "world" },
  ]);
});

test("buildProgressiveAnswer stops at first mismatch, shows correct word as hint, and masks all words after it", () => {
  const expected = "The museum is across the street from the train station";
  const submitted = "The museum is accross the";

  const result = buildProgressiveAnswer(expected, submitted);

  assert.equal(result.length, 10);
  assert.deepEqual(result[0], { text: "The", state: "correct" });
  assert.deepEqual(result[1], { text: "museum", state: "correct" });
  assert.deepEqual(result[2], { text: "is", state: "correct" });
  // Word 3 is the mismatch position: shows the correct expected word as 'hint' (yellow highlight)
  assert.deepEqual(result[3], { text: "across", state: "hint" });
  // Word 4 was typed as 'the', but because it is AFTER the first mismatch, it is NOT evaluated and stays masked as '*'
  assert.deepEqual(result[4], { text: "***", state: "masked" });
  assert.deepEqual(result[5], { text: "******", state: "masked" });
  assert.deepEqual(result[6], { text: "****", state: "masked" });
  assert.deepEqual(result[7], { text: "***", state: "masked" });
  assert.deepEqual(result[8], { text: "*****", state: "masked" });
  assert.deepEqual(result[9], { text: "*******", state: "masked" });
});

test("buildProgressiveAnswer highlights the next untyped word when prefix is completely correct", () => {
  const expected = "The museum is across";
  const submitted = "The museum is";

  const result = buildProgressiveAnswer(expected, submitted);

  assert.deepEqual(result, [
    { text: "The", state: "correct" },
    { text: "museum", state: "correct" },
    { text: "is", state: "correct" },
    { text: "across", state: "hint" },
  ]);
});

test("buildProgressiveAnswer reveals all words when showFullAnswer is true", () => {
  const expected = "The museum is across";
  const submitted = "The musuem";

  const result = buildProgressiveAnswer(expected, submitted, true);

  assert.deepEqual(result, [
    { text: "The", state: "answer" },
    { text: "museum", state: "answer" },
    { text: "is", state: "answer" },
    { text: "across", state: "answer" },
  ]);
});

