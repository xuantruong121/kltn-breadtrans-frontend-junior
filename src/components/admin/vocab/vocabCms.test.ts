import test from "node:test";
import assert from "node:assert/strict";
import {
  entryToWord,
  parseVocabPaste,
  sharedEntryNote,
  vocabDeckChecklist,
  wordStageReadiness,
} from "./vocabCms.ts";

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

test("vocabDeckChecklist reads the server counts", () => {
  const items = vocabDeckChecklist({
    title: "Họp",
    stats: { total: 2, withIpa: 1, withExample: 2, distinctMeanings: 2 },
  });
  const done = Object.fromEntries(items.map((i) => [i.label, i.done]));
  assert.equal(done["Phiên âm 1/2 từ"], false);
  assert.equal(done["Câu ví dụ 2/2 từ"], true);
  assert.equal(done["Ít nhất 4 nghĩa khác nhau cho bước Trắc nghiệm"], false);
});

test("parseVocabPaste refuses numbers", () => {
  assert.equal(parseVocabPaste("10 | số mười")[0].error, "Số không dùng làm từ vựng");
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

test("sharedEntryNote warns only when another deck shares the entry", () => {
  assert.equal(sharedEntryNote(undefined), null);
  assert.equal(sharedEntryNote(1), null);
  assert.match(sharedEntryNote(3) ?? "", /nằm trong 3 bộ/);
});

test("entryToWord gives the word form a store entry in its own shape", () => {
  const word = entryToWord({
    id: 9,
    headword: "agenda",
    displayWord: "Agenda",
    pos: "noun",
    meaningVi: "chương trình họp",
    ipaUs: "/əˈdʒendə/",
    source: "EXTERNAL",
    status: "PENDING_REVIEW",
    usedInDecks: 2,
  });
  assert.equal(word.word, "Agenda");
  assert.equal(word.meaning, "chương trình họp");
  assert.equal(word.ipaUs, "/əˈdʒendə/");
  assert.equal(word.usedInDecks, 2);
});
