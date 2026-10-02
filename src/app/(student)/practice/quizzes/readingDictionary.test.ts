import test from "node:test";
import assert from "node:assert/strict";
import { extractReadingDictionaryWord } from "./readingDictionary.ts";

test("extracts a simple word and surrounding punctuation", () => {
  assert.equal(extractReadingDictionaryWord("word"), "word");
  assert.equal(extractReadingDictionaryWord("“word”"), "word");
  assert.equal(extractReadingDictionaryWord("(word)"), "word");
  assert.equal(extractReadingDictionaryWord("word—"), "word");
  assert.equal(extractReadingDictionaryWord("—word–"), "word");
});

test("preserves internal apostrophes, curly apostrophes, and hyphens", () => {
  assert.equal(extractReadingDictionaryWord("don't"), "don't");
  assert.equal(extractReadingDictionaryWord("don’t"), "don't");
  assert.equal(extractReadingDictionaryWord("well-known"), "well-known");
  assert.equal(
    extractReadingDictionaryWord("state-of-the-art"),
    "state-of-the-art",
  );
});

test("rejects whitespace, punctuation-only, and multi-word selections", () => {
  assert.equal(extractReadingDictionaryWord("   "), null);
  assert.equal(extractReadingDictionaryWord("...!?"), null);
  assert.equal(extractReadingDictionaryWord("word phrase"), null);
  assert.equal(extractReadingDictionaryWord("word, phrase"), null);
});

test("rejects oversized selections rather than sending passage text", () => {
  assert.equal(extractReadingDictionaryWord("a".repeat(65)), null);
  assert.equal(extractReadingDictionaryWord("123"), null);
});
