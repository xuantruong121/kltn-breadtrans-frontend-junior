import assert from "node:assert/strict";
import test from "node:test";

import {
  choiceText,
  groupMistakes,
  mistakeGroupPosition,
  mistakeRedoLink,
  mistakeRowLabel,
  mistakeSourceTitle,
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
  // A "Dịch câu" sentence opens on its own sentence.
  assert.deepEqual(
    mistakeRedoLink({ skill: "WRITING", sourceType: "TRANSLATION_SENTENCE", detail: { ref: { quizId: 91, questionId: 501 } } }),
    { href: "/writing/91?q=501", label: "Làm lại câu" },
  );
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

test("a mistake shows its source with the catalog's Vietnamese title", () => {
  assert.equal(
    mistakeSourceTitle("LISTENING", "Listening B2 — Inference & Intent", { quizId: 12 }),
    "Suy luận ý định người nói",
  );
  // Grammar is named by its topic, not by a quiz.
  assert.equal(mistakeSourceTitle("GRAMMAR", "Relative clauses", { topicId: 10 }), "Mệnh đề quan hệ");
  // Without an id, the stored title loses its level tag.
  assert.equal(mistakeSourceTitle("SPEAKING", "Custom set", undefined), "Custom set");
  // A review question passes null for the id it does not have.
  assert.equal(mistakeSourceTitle("READING", "Reading — x", { quizId: 999_999, topicId: null }), "Reading — x");
});

test("the notebook list groups mistakes by exercise and gives each one line", () => {
  const item = (id: number, skill: "LISTENING" | "GRAMMAR" | "SPEAKING", detail: Record<string, unknown>) =>
    ({
      id,
      skill,
      sourceType: "QUIZ_QUESTION",
      tag: null,
      wrongCount: 1,
      correctStreak: 0,
      firstSeenAt: "2026-11-12",
      lastSeenAt: "2026-11-12",
      resolvedAt: null,
      detail: { kind: "CHOICE", answerable: false, ref: {}, title: "t", ...detail },
    }) as never;
  const items = [
    item(1, "LISTENING", { title: "Listening B2 — Inference & Intent", question: "Why Tuesday?", ref: { quizId: 12 } }),
    item(2, "GRAMMAR", { title: "Relative clauses", question: "Which?", ref: { topicId: 10 } }),
    item(3, "LISTENING", { title: "Listening B2 — Inference & Intent", question: "What favor?", ref: { quizId: 12 } }),
    item(4, "SPEAKING", { kind: "WORD", title: "Set", correctAnswer: "schedule", ref: { exerciseId: 5 } }),
  ];
  const groups = groupMistakes(items);
  assert.deepEqual(
    groups.map((g) => [g.title, g.items.map((i: { id: number }) => i.id)]),
    [
      ["Suy luận ý định người nói", [1, 3]],
      ["Mệnh đề quan hệ", [2]],
      ["Set", [4]],
    ],
  );
  assert.equal(mistakeRowLabel(items[0]), "Why Tuesday?");
  assert.equal(mistakeRowLabel(items[3]), "schedule");
});

test("the detail pane names the mistake's place in its exercise", () => {
  const row = (id: number, quizId: number) =>
    ({
      id,
      skill: "LISTENING",
      sourceType: "QUIZ_QUESTION",
      tag: null,
      wrongCount: 1,
      correctStreak: 0,
      firstSeenAt: "2026-11-12",
      lastSeenAt: "2026-11-12",
      resolvedAt: null,
      detail: { kind: "CHOICE", answerable: false, title: "t", ref: { quizId } },
    }) as never;
  const groups = groupMistakes([row(1, 47), row(2, 12), row(3, 47)]);
  const where = mistakeGroupPosition(groups, 3);
  assert.equal(where?.index, 2);
  assert.equal(where?.total, 2);
  assert.equal(where?.group.items.length, 2);
  assert.equal(mistakeGroupPosition(groups, 99), null);
});
