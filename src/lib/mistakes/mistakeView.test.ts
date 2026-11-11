import assert from "node:assert/strict";
import test from "node:test";

import {
  choiceText,
  mistakeRedoLink,
  mistakeTagLabel,
  parseMistakeSkill,
  progressLabel,
} from "./mistakeView.ts";

test("a skill is read from the address bar, anything else means all skills", () => {
  assert.equal(parseMistakeSkill("reading"), "READING");
  assert.equal(parseMistakeSkill(" Grammar "), "GRAMMAR");
  // TOEIC exam questions are not in the notebook.
  assert.equal(parseMistakeSkill("toeic"), undefined);
  assert.equal(parseMistakeSkill("vocab"), undefined);
  assert.equal(parseMistakeSkill(null), undefined);
});

test("a reading tag code is shown in Vietnamese, an unknown code is not shown", () => {
  assert.equal(mistakeTagLabel({ skill: "READING", tag: "DETAIL" }), "Chi tiết");
  assert.equal(mistakeTagLabel({ skill: "READING", tag: "SOME_CODE" }), null);
  assert.equal(mistakeTagLabel({ skill: "GRAMMAR", tag: "Giới từ" }), "Giới từ");
  assert.equal(mistakeTagLabel({ skill: "WRITING", tag: null }), null);
});

test("each kind of mistake links to where it can be done again", () => {
  assert.deepEqual(
    mistakeRedoLink({ skill: "READING", sourceType: "QUIZ_QUESTION", detail: { ref: { quizId: 3 } } }),
    { href: "/reading/3", label: "Làm lại bài đọc" },
  );
  assert.equal(
    mistakeRedoLink({ skill: "LISTENING", sourceType: "QUIZ_QUESTION", detail: { ref: { quizId: 4 } } })?.href,
    "/listening/4",
  );
  assert.equal(
    mistakeRedoLink({ skill: "WRITING", sourceType: "WRITING_CORRECTION", detail: { ref: { submissionId: 12 } } })?.href,
    "/writing/submissions/12",
  );
  assert.equal(
    mistakeRedoLink({ skill: "SPEAKING", sourceType: "SPEAKING_WORD", detail: { ref: { exerciseId: 8 } } })?.href,
    "/speaking/8",
  );
  assert.equal(mistakeRedoLink({ skill: "READING", sourceType: "QUIZ_QUESTION", detail: { ref: {} } }), null);
});

test("a choice is written with its letter, a blank one is null", () => {
  assert.equal(choiceText(["at", "in"], 1), "B. in");
  assert.equal(choiceText(["at", "in"], null), null);
  assert.equal(choiceText(["at", "in"], 5), null);
});

test("only an item that can be answered again shows a count of right answers", () => {
  const detail = { kind: "CHOICE" as const, title: "t", answerable: true, ref: {} };
  assert.equal(progressLabel({ correctStreak: 1, detail }, 2), "Đã trả lời đúng 1/2 lần");
  assert.equal(progressLabel({ correctStreak: 0, detail: { ...detail, answerable: false } }, 2), null);
});
