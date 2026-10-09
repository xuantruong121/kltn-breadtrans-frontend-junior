import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "..");
const speakingPage = readFileSync(
  join(root, "app", "(student)", "speaking", "[id]", "page.tsx"),
  "utf8",
);
const dictionaryPopup = readFileSync(
  join(root, "components", "speaking", "WordDictionaryPopup.tsx"),
  "utf8",
);

test("missing reference audio is represented as a truthful disabled control", () => {
  assert.match(speakingPage, /disabled=\{!hasReferenceAudio\}/);
  assert.match(speakingPage, /Audio mẫu chưa khả dụng/);
  assert.match(speakingPage, /never synthesize reference audio at runtime/);
});

test("dictionary pronunciation preserves the selected playback rate", () => {
  assert.match(dictionaryPopup, /playbackRate\?: number/);
  assert.match(dictionaryPopup, /audio\.playbackRate = playbackRate/);
  assert.match(dictionaryPopup, /utterance\.rate = playbackRate/);
  assert.match(speakingPage, /playbackRate=\{ttsRate\}/);
});

test("speaking does not reintroduce runtime TTS for sentence reference audio", () => {
  assert.doesNotMatch(speakingPage, /speakingService\.generateTts\(/);
  assert.match(speakingPage, /const source = exercise\?\.audioUrl/);
});

test("sentence words remain connected to normalized dictionary lookup", () => {
  assert.match(speakingPage, /onClick=\{\(\) => openDictionary\(cleanLookupWord\)\}/);
  assert.ok(
    speakingPage.includes('.replace(/^[^\\p{L}\\p{N}]+|[^\\p{L}\\p{N}]+$/gu, "")'),
    "word lookup must normalize punctuation at the token boundary",
  );
});
