import { test } from "node:test";
import assert from "node:assert/strict";

import { cueWordPairs, isPictureQuiz, pictureCards } from "./pictureWriting.ts";

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
