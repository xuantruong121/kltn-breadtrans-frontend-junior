import { test } from "node:test";
import assert from "node:assert/strict";

import {
  correctedAnswer,
  cueWordPairs,
  isPictureQuiz,
  pictureCards,
  pictureNeighbours,
  pictureTitle,
  submitsOnEnter,
} from "./pictureWriting.ts";

const task = (questionId: number, keywords: string[], imageUrl: string | null = "https://x/a.png") => ({
  questionId,
  position: 1,
  imageUrl,
  keywords,
  isGraded: false,
});

test("only picture tasks become picture cards; the keyword sentence quiz does not", () => {
  const quizzes = [
    { id: 3, taskType: "SENTENCE" },
    {
      id: 45,
      taskType: "PICTURE_SENTENCE",
      pictureTasks: [task(201, ["cashier", "scan"]), task(202, ["order", "counter"])],
    },
  ];
  assert.equal(isPictureQuiz(quizzes[0]), false);
  const cards = pictureCards(quizzes);
  assert.deepEqual(
    cards.map((c) => [c.href, c.pair]),
    [
      ["/writing/45?q=201", "cashier / scan"],
      ["/writing/45?q=202", "order / counter"],
    ],
  );
});

test("a task without a picture or without two cue words is never shown", () => {
  const cards = pictureCards([
    {
      id: 46,
      taskType: "PICTURE_SENTENCE",
      pictureTasks: [task(1, ["a", "b"], null), task(2, ["only"]), task(3, ["file", "shelf"])],
    },
  ]);
  assert.deepEqual(cards.map((c) => c.task.questionId), [3]);
});

test("the pair filter lists only pairs that exist", () => {
  assert.deepEqual(cueWordPairs([{ pair: "order / counter" }, { pair: "cashier / scan" }, { pair: "order / counter" }]), [
    "cashier / scan",
    "order / counter",
  ]);
});

test("Enter grades the answer; Shift+Enter and a key still being composed do not", () => {
  assert.equal(submitsOnEnter({ key: "Enter", shiftKey: false, isComposing: false }), true);
  assert.equal(submitsOnEnter({ key: "Enter", shiftKey: true, isComposing: false }), false);
  assert.equal(submitsOnEnter({ key: "Enter", shiftKey: false, isComposing: true }), false);
  assert.equal(submitsOnEnter({ key: "a", shiftKey: false, isComposing: false }), false);
});

test("the right answer is the learner's text with every correction applied", () => {
  assert.equal(
    correctedAnswer("the cashier is scanning the items", [
      { original: "the cashier is scanning the items", corrected: "The cashier is scanning the items." },
    ]),
    "The cashier is scanning the items.",
  );
  assert.equal(
    correctedAnswer("The man is using the order\nnear the counter.", [
      { original: "using the order", corrected: "placing an order" },
    ]),
    "The man is placing an order\nnear the counter.",
  );
});

test("a correction is matched without case when the exact text is not there, and skipped when it is missing", () => {
  assert.equal(
    correctedAnswer("A woman Pays at the counter.", [{ original: "a woman pays", corrected: "A woman is paying" }]),
    "A woman is paying at the counter.",
  );
  assert.equal(
    correctedAnswer("The cashier scans the milk.", [{ original: "scanning the bread", corrected: "scans the bread" }]),
    "The cashier scans the milk.",
  );
  assert.equal(correctedAnswer("Already right.", []), "Already right.");
});

test("a picture moves to the pictures next to it in the list, not in its set (owner 2026-11-24)", () => {
  const task = (questionId: number) => ({ questionId, position: 1, imageUrl: "https://x/p.jpg", keywords: ["a", "b"], isGraded: false });
  const quizzes = [
    { id: 126, taskType: "PICTURE_SENTENCE", cefrLevel: "B1", isLocked: true, pictureTasks: [task(481), task(482)] },
    { id: 124, taskType: "PICTURE_SENTENCE", cefrLevel: "A2", pictureTasks: [task(466), task(470)] },
    { id: 123, taskType: "PICTURE_SENTENCE", cefrLevel: "A2", pictureTasks: [task(461)] },
  ];
  // A2 first (Dễ → Khó), then the locked B1 set, which is skipped.
  assert.deepEqual(pictureNeighbours(quizzes, 124, 466), { prev: null, next: "/writing/124?q=470" });
  assert.deepEqual(pictureNeighbours(quizzes, 124, 470), { prev: "/writing/124?q=466", next: "/writing/123?q=461" });
  assert.deepEqual(pictureNeighbours(quizzes, 123, 461), { prev: "/writing/124?q=470", next: null });
  // Opened directly, a locked picture still finds its neighbours.
  assert.deepEqual(pictureNeighbours(quizzes, 126, 481), { prev: "/writing/123?q=461", next: null });
  assert.deepEqual(pictureNeighbours(quizzes, 999, 1), { prev: null, next: null });
});

test("a picture is titled by its cue words", () => {
  assert.equal(pictureTitle(["ride", "street"]), "ride · street");
  assert.equal(pictureTitle([]), "Viết câu theo tranh");
});
