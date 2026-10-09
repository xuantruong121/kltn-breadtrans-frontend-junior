import assert from "node:assert/strict";
import test from "node:test";
import { mergeDictionaryEntries, selectSpeechVoice } from "./dictionaryMerge.ts";

const entry = (overrides: Record<string, unknown> = {}) => ({
  word: "have", partOfSpeech: "verb", ipaUs: null, ipaUk: null,
  meaningVi: null, definitions: [], examples: [], collocations: [], synonyms: [], antonyms: [],
  audio: { us: null, uk: null }, ...overrides,
});

test("curated IPA, audio and order survive richer external entries", () => {
  const local = entry({ ipaUs: "/hæv/", ipaUk: "/hæv/", meaningVi: "có; sở hữu" });
  const expanded = [
    entry({ word: "have", partOfSpeech: "noun", meaningVi: "người giàu có" }),
    entry({ word: "have", partOfSpeech: "verb", audio: { us: "https://example.test/us.mp3", uk: "https://example.test/uk.mp3" } }),
  ];
  const merged = mergeDictionaryEntries([local], expanded);
  assert.equal(merged[0].partOfSpeech, "verb");
  assert.equal(merged[0].ipaUs, "/hæv/");
  assert.equal(merged[0].ipaUk, "/hæv/");
  assert.equal(merged[0].meaningVi, "có; sở hữu");
  assert.equal(merged[0].audio.us, "https://example.test/us.mp3");
  assert.equal(merged[1].partOfSpeech, "noun");
});

test("accent selection requires a matching browser locale", () => {
  const voices = [
    { lang: "en-US", name: "US", localService: true, default: true },
    { lang: "en-GB", name: "UK", localService: true, default: false },
  ] as SpeechSynthesisVoice[];
  assert.equal(selectSpeechVoice(voices, "US")?.lang, "en-US");
  assert.equal(selectSpeechVoice(voices, "UK")?.lang, "en-GB");
  assert.equal(selectSpeechVoice([], "UK"), null);
});

test("accent selection never treats a generic English voice as UK", () => {
  const voices = [
    { lang: "en-US", name: "US", localService: true, default: true },
    { lang: "en", name: "Generic", localService: true, default: false },
  ] as SpeechSynthesisVoice[];
  assert.equal(selectSpeechVoice(voices, "US")?.lang, "en-US");
  assert.equal(selectSpeechVoice(voices, "UK"), null);
});

test("identical provider audio is not exposed as two accent recordings", () => {
  const local = entry({ audio: { us: null, uk: null } });
  const expanded = [
    entry({ audio: { us: "https://example.test/generic.mp3", uk: "https://example.test/generic.mp3" } }),
  ];
  const [merged] = mergeDictionaryEntries([local], expanded);
  assert.equal(merged.audio.us, null);
  assert.equal(merged.audio.uk, null);
});
