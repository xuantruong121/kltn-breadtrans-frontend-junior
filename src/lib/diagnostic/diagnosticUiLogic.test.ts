import test from "node:test";
import assert from "node:assert/strict";
import {
  getUnansweredQuestionIndexes,
  resolveReviewAnswer,
  parseClozeQuestionSegments,
  formatSkillName,
  groupQuestionsBySection,
  formatPlacementLevel,
} from "./diagnosticUiLogic.ts";

test("diagnostic submit guard identifies the first unanswered question", () => {
  assert.deepEqual(
    getUnansweredQuestionIndexes([{ id: 11 }, { id: 12 }, { id: 13 }], {
      "11": 1,
    }),
    [1, 2],
  );
});

test("diagnostic review resolves a valid correctIndex and safely rejects corrupt history", () => {
  assert.equal(resolveReviewAnswer(["A", "B"], 1), "B");
  assert.equal(resolveReviewAnswer(["A"], 3), null);
  assert.equal(resolveReviewAnswer({ answer: "B" }, 0), null);
});

test("diagnostic submit guard treats blank productive answers as unanswered", () => {
  assert.deepEqual(
    getUnansweredQuestionIndexes([{ id: 21 }, { id: 22 }], {
      "21": "   ",
      "22": "ok",
    }),
    [0],
  );
});

test("parseClozeQuestionSegments splits text and blanks without leaking length", () => {
  const segments = parseClozeQuestionSegments("Please ____ a reservation before Friday.");
  assert.deepEqual(segments, [
    { type: "text", text: "Please " },
    { type: "blank" },
    { type: "text", text: " a reservation before Friday." },
  ]);

  const multipleBlanks = parseClozeQuestionSegments("My name ___ Linh and I live ___ Hanoi.");
  assert.equal(multipleBlanks.filter((s) => s.type === "blank").length, 2);
});

test("formatSkillName normalizes English and internal codes to learner-friendly Vietnamese", () => {
  assert.equal(formatSkillName("Grammar"), "Ngữ pháp");
  assert.equal(formatSkillName("Vocabulary"), "Từ vựng");
  assert.equal(formatSkillName("Reading"), "Đọc hiểu");
  assert.equal(formatSkillName("Listening"), "Nghe hiểu");
  assert.equal(formatSkillName("Speaking"), "Nói");
  assert.equal(formatSkillName("Writing"), "Viết");
  assert.equal(formatSkillName("LANGUAGE_USE"), "Ngữ pháp & Từ vựng");
});

test("groupQuestionsBySection organizes 52 questions into canonical 5 sections", () => {
  const questions = [
    ...Array.from({ length: 16 }, (_, i) => ({ id: i + 1, section: "LANGUAGE_USE" })),
    ...Array.from({ length: 16 }, (_, i) => ({ id: i + 17, section: "READING" })),
    ...Array.from({ length: 16 }, (_, i) => ({ id: i + 33, section: "LISTENING" })),
    { id: 49, section: "SPEAKING" },
    { id: 50, section: "SPEAKING" },
    { id: 51, section: "WRITING" },
    { id: 52, section: "WRITING" },
  ];
  const groups = groupQuestionsBySection(questions);
  assert.equal(groups.length, 5);
  assert.equal(groups[0].key, "LANGUAGE_USE");
  assert.equal(groups[0].questions.length, 16);
  assert.equal(groups[1].key, "READING");
  assert.equal(groups[1].questions.length, 16);
  assert.equal(groups[2].key, "LISTENING");
  assert.equal(groups[2].questions.length, 16);
  assert.equal(groups[3].key, "SPEAKING");
  assert.equal(groups[3].questions.length, 2);
  assert.equal(groups[4].key, "WRITING");
  assert.equal(groups[4].questions.length, 2);
});

test("formatPlacementLevel converts CEFR codes and legacy labels to natural Vietnamese", () => {
  assert.equal(
    formatPlacementLevel("Pre-A1 / Beginner foundation needed"),
    "Pre-A1 – Cần củng cố nền tảng",
  );
  assert.equal(formatPlacementLevel("A1"), "A1 – Sơ cấp");
  assert.equal(formatPlacementLevel("A2"), "A2 – Sơ trung cấp");
  assert.equal(formatPlacementLevel("B1"), "B1 – Trung cấp");
  assert.equal(formatPlacementLevel("B2"), "B2 – Trung cấp trên");
  assert.equal(formatPlacementLevel("A1 — đang tiến tới A2"), "A1 – Đang tiến tới A2");
  assert.equal(formatPlacementLevel("A2 — đang tiến tới B1"), "A2 – Đang tiến tới B1");
  assert.equal(formatPlacementLevel("B1 — đang tiến tới B2"), "B1 – Đang tiến tới B2");
  assert.equal(formatPlacementLevel(""), "Pre-A1 – Cần củng cố nền tảng");
});
