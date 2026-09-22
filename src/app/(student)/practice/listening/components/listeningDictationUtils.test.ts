import assert from "node:assert/strict";
import test from "node:test";
import {
  buildProgressiveAnswer,
  canonicalizeSubmittedDictation,
  clampTranscriptIndex,
  diffDictationAnswer,
  moveTranscriptIndex,
  normalizeDictationText,
  resolveActiveTranscriptIndex,
} from "./listeningDictationUtils.ts";

test("normalizes whitespace and curly apostrophes", () => {
  assert.equal(normalizeDictationText("  Don’t   worry! "), "don't worry!");
});

test("canonicalizeSubmittedDictation normalizes case and adds trailing space when prefix matches", () => {
  const expected = "The museum is located near the park.";
  assert.equal(canonicalizeSubmittedDictation(expected, "the"), "The ");
  assert.equal(
    canonicalizeSubmittedDictation(expected, "the museum"),
    "The museum ",
  );
  assert.equal(
    canonicalizeSubmittedDictation(expected, "the musuem"),
    "The musuem",
  );
  assert.equal(
    canonicalizeSubmittedDictation(
      expected,
      "the museum is located near the park.",
    ),
    "The museum is located near the park.",
  );
  assert.equal(
    canonicalizeSubmittedDictation("Well, I don't know.", "well i dont"),
    "Well, I don't ",
  );
  assert.equal(canonicalizeSubmittedDictation(expected, ""), "");
  assert.equal(canonicalizeSubmittedDictation(null, "the"), "the");
});

test("returns useful missing and extra word feedback", () => {
  assert.deepEqual(
    diffDictationAnswer(
      "The price per pint has tripled",
      "The price for pint has triple",
    ),
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

test("STANDARD word diff ignores punctuation and capitalization", () => {
  assert.deepEqual(
    diffDictationAnswer(
      "Well, let me think. It's about ten minutes.",
      "well let me think its about ten minutes",
    ),
    [
      { kind: "same", text: "well" },
      { kind: "same", text: "let" },
      { kind: "same", text: "me" },
      { kind: "same", text: "think" },
      { kind: "same", text: "it" },
      { kind: "same", text: "is" },
      { kind: "same", text: "about" },
      { kind: "same", text: "ten" },
      { kind: "same", text: "minutes" },
    ],
  );

  const changedWordDiff = diffDictationAnswer(
    "Well, let me think. It's about ten minutes.",
    "well let me think its about twenty minutes",
  );
  assert.ok(
    changedWordDiff.some(
      (token) => token.kind === "missing" || token.kind === "extra",
    ),
  );
});

test("STANDARD word diff treats canonical contractions and full forms as equivalent", () => {
  assert.deepEqual(diffDictationAnswer("We're going.", "we are going"), [
    { kind: "same", text: "we" },
    { kind: "same", text: "are" },
    { kind: "same", text: "going" },
  ]);
  assert.notDeepEqual(
    diffDictationAnswer("We'd like help.", "we had like help"),
    [
      { kind: "same", text: "we" },
      { kind: "same", text: "would" },
      { kind: "same", text: "like" },
      { kind: "same", text: "help" },
    ],
  );
  assert.ok(
    diffDictationAnswer("We’re ready.", "were ready").some(
      (token) => token.kind !== "same",
    ),
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

test("buildProgressiveAnswer reveals only the masked suffix without turning the hint into a full skip", () => {
  const result = buildProgressiveAnswer(
    "The museum is across the street",
    "The museum is accross",
    false,
    true,
  );

  assert.deepEqual(result, [
    { text: "The", state: "correct" },
    { text: "museum", state: "correct" },
    { text: "is", state: "correct" },
    { text: "across", state: "hint" },
    { text: "the", state: "answer" },
    { text: "street", state: "answer" },
  ]);
});

test("transcript cursor moves independently and never changes the dictation cursor", () => {
  const currentDictationQuestionIndex = 6;
  let selectedTranscriptIndex = clampTranscriptIndex(14, 20);
  selectedTranscriptIndex = moveTranscriptIndex(
    selectedTranscriptIndex,
    -1,
    20,
  );

  assert.equal(selectedTranscriptIndex, 13);
  assert.equal(currentDictationQuestionIndex, 6);
  assert.equal(clampTranscriptIndex(99, 20), 19);
  assert.equal(clampTranscriptIndex(-4, 20), 0);
});

test("active transcript highlight is empty during authoritative pause gaps", () => {
  const timeline = [
    { startMs: 0, endMs: 5000 },
    { startMs: 5260, endMs: 10000 },
    { startMs: 10260, endMs: 15000 },
  ];
  assert.equal(resolveActiveTranscriptIndex(4900, timeline), 0);
  assert.equal(resolveActiveTranscriptIndex(5100, timeline), -1);
  assert.equal(resolveActiveTranscriptIndex(5300, timeline), 1);
  assert.equal(resolveActiveTranscriptIndex(10100, timeline), -1);
});
