import assert from "node:assert/strict";
import { test } from "node:test";
import {
  REVIEW_STAGES,
  dueDoneBody,
  dueDoneHeading,
  dueLeftLine,
  dueReviewHref,
  dueWordsOf,
  nextDeckLabel,
  nextDueDeck,
  stageCounter,
} from "./dueReview.ts";

test("a review asks only the due words, in deck order", () => {
  const words = [
    { id: 1, isDue: false },
    { id: 2, isDue: true },
    { id: 3 },
    { id: 4, isDue: true },
  ];
  assert.deepEqual(dueWordsOf(words).map((w) => w.id), [2, 4]);
  assert.deepEqual(dueWordsOf([{ id: 1 }, { id: 2, isDue: false }]), []);
});

test("a due word is asked by the quiz then the typing, never shown first", () => {
  assert.deepEqual([...REVIEW_STAGES], ["QUIZ", "TYPING"]);
});

test("the review of a deck has its own address", () => {
  assert.equal(dueReviewHref(12), "/flashcard/12?due=1");
});

test("the next deck is the one with the most due words, not the current one", () => {
  const topics = [
    { id: 1, title: "A", dueCount: 9 },
    { id: 2, title: "B", dueCount: 3 },
    { id: 3, title: "C", dueCount: 5 },
    { id: 4, title: "D", dueCount: 5 },
    { id: 5, title: "E" },
  ];
  assert.deepEqual(nextDueDeck(topics, 1), { id: 3, title: "C", dueCount: 5 });
  assert.deepEqual(nextDueDeck(topics, 3), { id: 1, title: "A", dueCount: 9 });
});

test("no next deck when nothing else is due", () => {
  assert.equal(nextDueDeck([{ id: 1, title: "A", dueCount: 4 }], 1), null);
  assert.equal(nextDueDeck([{ id: 2, title: "B", dueCount: 0 }, { id: 3, title: "C", dueCount: null }], 1), null);
  assert.equal(nextDueDeck([], 1), null);
});

test("the closing screen says what was reviewed, or that nothing was due", () => {
  assert.equal(dueDoneHeading(3), "Đã ôn xong 3 từ đến hạn");
  assert.equal(dueDoneHeading(0), "Bộ này chưa có từ nào đến hạn");
  assert.equal(dueDoneBody(3, "Office & Meetings"), "Bộ Office & Meetings. Mỗi từ đã có lịch ôn mới theo kết quả vừa rồi.");
  assert.equal(dueDoneBody(0, "Office & Meetings"), "Bộ Office & Meetings. Từ sẽ có ở đây khi đến lịch ôn.");
  assert.equal(nextDeckLabel({ id: 2, title: "Travel", dueCount: 4 }), "Ôn tiếp 4 từ của bộ Travel");
});

test("a step is counted among the steps the word goes through", () => {
  const all = ["FLASHCARD", "QUIZ", "TYPING", "SPEAKING"];
  assert.deepEqual(stageCounter("QUIZ", all), { step: 2, total: 4 });
  assert.deepEqual(stageCounter("QUIZ", [...REVIEW_STAGES]), { step: 1, total: 2 });
  assert.deepEqual(stageCounter("TYPING", [...REVIEW_STAGES]), { step: 2, total: 2 });
  assert.deepEqual(stageCounter("FLASHCARD", ["QUIZ", "TYPING"]), { step: 1, total: 2 });
});

test("words left to relearn are said on the closing screen", () => {
  assert.equal(dueLeftLine(0), null);
  assert.equal(dueLeftLine(2), "2 từ chưa nhớ, hệ thống sẽ nhắc lại sau 10 phút.");
  // Some known, some left: the heading counts the known ones.
  assert.equal(dueDoneHeading(3, 1), "Đã ôn xong 3 từ đến hạn");
  // None known: the review ended, the deck did have due words.
  assert.equal(dueDoneHeading(0, 1), "Phiên ôn đã kết thúc");
  assert.equal(dueDoneBody(0, "Travel", 1), "Bộ Travel.");
});
