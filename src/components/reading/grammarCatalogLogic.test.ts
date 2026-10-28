import { test } from "node:test";
import assert from "node:assert/strict";

import {
  grammarTopicStatus,
  groupGrammarTopics,
  pickRandomGrammarTopic,
} from "./grammarCatalogLogic.ts";

const topic = (id: number, over: Partial<{ isCompleted: boolean; attemptCount: number }> = {}) => ({
  id,
  totalQuestions: 5,
  isCompleted: false,
  attemptCount: 0,
  ...over,
});

// The 12 published topics in the API's authored order (13/14 first).
const published = [13, 14, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((id) => topic(id));

test("sections count real topics and questions; 13/14 lead the verb section", () => {
  const sections = groupGrammarTopics(published);
  assert.deepEqual(
    sections.map((s) => [s.category, s.topics.length, s.questionCount]),
    [
      ["WORD_CLASS", 3, 15],
      ["VERB", 7, 35],
      ["OTHER", 2, 10],
    ],
  );
  assert.deepEqual(sections[1].topics.slice(0, 2).map((t) => t.id), [13, 14]);
  assert.equal(sections.reduce((n, s) => n + s.topics.length, 0), 12);
});

test("status comes from persisted completion and attempts", () => {
  assert.equal(grammarTopicStatus(topic(1)), "NOT_STARTED");
  assert.equal(grammarTopicStatus(topic(1, { attemptCount: 2 })), "IN_PROGRESS");
  assert.equal(grammarTopicStatus(topic(1, { isCompleted: true, attemptCount: 1 })), "COMPLETED");
});

test("random practice prefers unfinished topics and always returns a real one", () => {
  const list = [topic(3, { isCompleted: true }), topic(4), topic(5)];
  assert.equal(pickRandomGrammarTopic(list, () => 0)?.id, 4);
  assert.equal(pickRandomGrammarTopic(list, () => 0.99)?.id, 5);
  const allDone = [topic(3, { isCompleted: true }), topic(4, { isCompleted: true })];
  assert.equal(pickRandomGrammarTopic(allDone, () => 0.6)?.id, 4);
  assert.equal(pickRandomGrammarTopic([], () => 0), null);
});
