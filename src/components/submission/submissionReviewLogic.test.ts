import test from "node:test";
import assert from "node:assert/strict";
import {
  answerText,
  filterRows,
  reviewButtonLabel,
  resultKind,
  resultLabels,
  resultTitle,
  reviewCounts,
  reviewRows,
} from "./submissionReviewLogic.ts";

const listening = {
  quizId: 12,
  quizTitle: "Listening B2 — Inference & Intent",
  questions: [
    {
      id: 101,
      content: {
        text: "What will the speaker probably do?",
        audioText: "I'd rather delay the presentation.",
        options: ["Change the client", "Postpone the presentation"],
        correctIndex: 1,
        explanation: {
          vi: "Người nói thà hoãn buổi thuyết trình.",
          en: "The speaker would rather delay it.",
          evidence: "I'd rather delay the presentation",
          vocabularyNote: "postpone = hoãn lại",
        },
      },
    },
    {
      id: 102,
      content: {
        text: "What does the speaker suggest?",
        options: ["Inspect another office", "Move"],
        correctIndex: 0,
        explanation: "Plain legacy explanation.",
      },
    },
    { id: 103, content: { options: ["A", "B"] } },
  ],
  results: [
    { questionId: 101, answer: "Change the client", isCorrect: false },
    { questionId: 102, answer: "Inspect another office", isCorrect: true },
  ],
};

test("the result page shows the Vietnamese title the catalog shows", () => {
  assert.equal(resultTitle(listening), "Suy luận ý định người nói");
  // A quiz without a Vietnamese entry keeps its stored title.
  assert.equal(resultTitle({ quizId: 999_999, quizTitle: "Custom quiz" }), "Custom quiz");
});

test("rows carry the answer, the key and the parsed explanation", () => {
  const [first, second, third] = reviewRows(listening);
  assert.equal(first.number, 1);
  assert.equal(first.answer, "Change the client");
  assert.equal(first.correctAnswer, "Postpone the presentation");
  assert.equal(first.isCorrect, false);
  assert.equal(first.explanation?.type, "structured");
  if (first.explanation?.type === "structured") {
    assert.equal(first.explanation.vi, "Người nói thà hoãn buổi thuyết trình.");
    assert.equal(first.explanation.evidence, "I'd rather delay the presentation");
  }
  assert.equal(second.isCorrect, true);
  assert.equal(second.explanation?.type, "legacy");
  // A question left blank has no result: it is not correct, and it is marked blank, not wrong.
  assert.equal(third.isCorrect, false);
  assert.equal(third.status, "blank");
  assert.equal(third.answer, null);
  assert.equal(first.status, "wrong");
  assert.equal(third.prompt, "Nghe đoạn âm thanh và chọn đáp án");
  assert.equal(third.explanation, null);
});

test("a missing or broken answer key is shown as unavailable, not guessed", () => {
  const rows = reviewRows({ quizId: 1, quizTitle: "x", questions: [{ id: 1, content: { options: ["A"], correctIndex: 4 } }] });
  assert.equal(rows[0].correctAnswer, null);
});

test("counts and filters agree with the rows", () => {
  const rows = reviewRows(listening);
  assert.deepEqual(reviewCounts(rows), { all: 3, right: 1, wrong: 1, blank: 1 });
  assert.equal(reviewButtonLabel(reviewCounts(rows)), "Ôn lại 2 câu chưa đúng");
  assert.equal(reviewButtonLabel({ all: 2, right: 0, wrong: 2, blank: 0 }), "Ôn lại 2 câu sai");
  assert.deepEqual(filterRows(rows, "wrong").map((row) => row.number), [1, 3]);
  assert.deepEqual(filterRows(rows, "right").map((row) => row.number), [2]);
  assert.equal(filterRows(rows, "all").length, 3);
});

test("the kind of result decides its words", () => {
  assert.equal(resultKind(listening), "listening");
  assert.equal(resultKind({ ...listening, quizType: "BILINGUAL_READING" }), "reading");
  assert.equal(resultKind({ quizId: 1, quizTitle: "x", questions: [{ id: 1, content: {} }] }), "exam");
  assert.equal(resultLabels("listening").evidence, "Câu nghe được");
  assert.equal(resultLabels("reading").back, "Danh sách bài đọc");
});

test("reading rows name their sub-skill in Vietnamese", () => {
  const rows = reviewRows({
    quizId: 1,
    quizTitle: "x",
    quizType: "BILINGUAL_READING",
    questions: [{ id: 1, content: { text: "Q", options: ["A"], correctIndex: 0, questionType: "INFERENCE" } }],
  });
  assert.equal(rows[0].skill, "Suy luận");
});

test("an older submission storing the option index shows the option text", () => {
  assert.equal(answerText({ selectedIndex: 2 }, ["A", "B", "Thursday at 2:30"]), "Thursday at 2:30");
  assert.equal(answerText({ selectedIndex: 9 }, ["A"]), null);
  assert.equal(answerText("Postpone", ["Postpone"]), "Postpone");
  assert.equal(answerText(undefined, ["A"]), null);
  const rows = reviewRows({
    quizId: 1,
    quizTitle: "x",
    questions: [{ id: 1, content: { text: "Q", options: ["A", "B", "C"], correctIndex: 2 } }],
    results: [{ questionId: 1, answer: { selectedIndex: 2 }, isCorrect: true }],
  });
  assert.equal(rows[0].answer, "C");
  assert.equal(rows[0].status, "right");
});
