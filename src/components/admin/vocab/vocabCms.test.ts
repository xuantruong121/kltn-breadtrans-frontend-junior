import test from "node:test";
import assert from "node:assert/strict";
import { parseVocabPaste, vocabDeckChecklist, wordStageReadiness } from "./vocabCms.ts";

test("parseVocabPaste reads spreadsheet rows, pipes, dashes and commas", () => {
  const rows = parseVocabPaste(
    [
      "agenda\tchương trình họp\tnoun\tLet's follow the agenda.\tHãy theo chương trình.",
      "postpone | hoãn lại | verb",
      "minutes - biên bản cuộc họp",
      "attendee, người tham dự, khách mời",
    ].join("\n"),
  );
  assert.deepEqual(
    rows.map((r) => [r.word, r.meaning, r.pos, r.exampleEn, r.error]),
    [
      ["agenda", "chương trình họp", "noun", "Let's follow the agenda.", undefined],
      ["postpone", "hoãn lại", "verb", "", undefined],
      ["minutes", "biên bản cuộc họp", "noun", "", undefined],
      ["attendee", "người tham dự, khách mời", "noun", "", undefined],
    ],
  );
});

test("parseVocabPaste flags missing meanings, unknown parts of speech and duplicates", () => {
  const rows = parseVocabPaste("agenda\nfoo | bar | thingy\nAgenda | chương trình", ["agenda"]);
  assert.equal(rows[0].error, "Thiếu từ hoặc nghĩa");
  assert.match(rows[1].error ?? "", /thingy/);
  assert.equal(rows[2].duplicate, true);
});

test("vocabDeckChecklist counts IPA, examples and distinct meanings", () => {
  const items = vocabDeckChecklist({
    title: "Họp",
    words: [
      { id: 1, word: "agenda", meaning: "chương trình", ipaUs: "/əˈdʒendə/", exampleEn: "x" },
      { id: 2, word: "minutes", meaning: "biên bản" },
    ],
  });
  const done = Object.fromEntries(items.map((i) => [i.label, i.done]));
  assert.equal(done["Phiên âm 1/2 từ"], false);
  assert.equal(done["Ít nhất 4 nghĩa khác nhau cho bước Trắc nghiệm"], false);
});

test("wordStageReadiness explains each learner step", () => {
  const words = [
    { id: 1, word: "follow up", meaning: "theo dõi tiếp" },
    { id: 2, word: "agenda", meaning: "chương trình" },
  ];
  const stages = wordStageReadiness(words[0], words);
  assert.deepEqual(stages.map((s) => [s.stage, s.ready]), [
    ["FLASHCARD", true],
    ["QUIZ", false],
    ["TYPING", true],
    ["SPEAKING", true],
  ]);
  assert.match(stages[2].note ?? "", /cả cụm/);
  assert.match(stages[3].note ?? "", /giọng máy/);
});
