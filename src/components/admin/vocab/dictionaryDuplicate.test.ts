import assert from "node:assert/strict";
import test from "node:test";

import { findTakenEntry, headwordKey, takenMessage, type StoreEntryLike } from "./dictionaryDuplicate.ts";

const entry = (over: Partial<StoreEntryLike> = {}): StoreEntryLike => ({
  id: 1,
  headword: "far",
  displayWord: "far",
  pos: "adverb",
  status: "APPROVED",
  ...over,
});

test("the key ignores case, outer and inner spaces, like the server's", () => {
  assert.equal(headwordKey("  Far "), "far");
  assert.equal(headwordKey("Phrasal   VERB"), "phrasal verb");
  assert.equal(headwordKey("   "), "");
});

test("a word that is in the store with the same part of speech is taken", () => {
  const items = [entry({ id: 1 }), entry({ id: 2, headword: "farm", displayWord: "farm", pos: "noun" })];
  assert.equal(findTakenEntry(items, " FAR ", "adverb")?.id, 1);
});

test("the same word as another part of speech is a different entry", () => {
  const items = [entry({ id: 1, pos: "adverb" })];
  assert.equal(findTakenEntry(items, "far", "adjective"), null);
});

test("a word that only starts the same is not taken", () => {
  assert.equal(findTakenEntry([entry({ headword: "farm", displayWord: "farm", pos: "noun" })], "far", "noun"), null);
});

test("no part of speech means noun, like the server", () => {
  const items = [entry({ headword: "agenda", displayWord: "agenda", pos: "noun" })];
  assert.equal(findTakenEntry(items, "agenda", "")?.id, 1);
});

test("an empty word is never taken", () => {
  assert.equal(findTakenEntry([entry()], "   ", "adverb"), null);
});

test("a rejected entry still holds the word, and the message says so", () => {
  const rejected = entry({ status: "REJECTED" });
  assert.equal(findTakenEntry([rejected], "far", "adverb")?.status, "REJECTED");
  assert.equal(takenMessage(rejected), '"far" (adverb) đã có trong kho từ điển (đã loại).');
});

test("the message names the word as stored and its status when not approved", () => {
  assert.equal(takenMessage(entry({ displayWord: "Far" })), '"Far" (adverb) đã có trong kho từ điển.');
  assert.equal(takenMessage(entry({ status: "PENDING_REVIEW" })), '"far" (adverb) đã có trong kho từ điển (đang chờ duyệt).');
});
