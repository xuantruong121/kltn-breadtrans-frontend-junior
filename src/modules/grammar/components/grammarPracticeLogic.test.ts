import assert from "node:assert/strict";
import { test } from "node:test";

import {
  allAnswered,
  answersOf,
  clearWrong,
  grammarTally,
  nextUnanswered,
  optionFromKey,
  optionState,
  wrongQuestionIds,
  type GrammarCheck,
  type GrammarChecks,
} from "./grammarPracticeLogic.ts";

const questions = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
const check = (questionId: number, selectedOption: number, correctOption: number): GrammarCheck => ({
  questionId,
  selectedOption,
  correctOption,
  isCorrect: selectedOption === correctOption,
  explanation: null,
});

test("tally, wrong questions and completion follow the checks", () => {
  const checks: GrammarChecks = { 1: check(1, 0, 0), 3: check(3, 2, 1) };
  assert.deepEqual(grammarTally(questions, checks), { total: 4, answered: 2, correct: 1, wrong: 1 });
  assert.deepEqual(wrongQuestionIds(questions, checks), [3]);
  assert.equal(allAnswered(questions, checks), false);
  assert.equal(allAnswered(questions, { ...checks, 2: check(2, 1, 1), 4: check(4, 3, 3) }), true);
  assert.equal(allAnswered([], {}), false);
});

test("the next question without an answer wraps round", () => {
  const checks: GrammarChecks = { 1: check(1, 0, 0), 2: check(2, 0, 0), 4: check(4, 0, 0) };
  assert.equal(nextUnanswered(questions, checks, 3), 2);
  assert.equal(nextUnanswered(questions, { ...checks, 3: check(3, 0, 0) }, 0), null);
});

test("retrying the wrong ones keeps the right ones", () => {
  const checks: GrammarChecks = { 1: check(1, 0, 0), 3: check(3, 2, 1) };
  assert.deepEqual(Object.keys(clearWrong(checks)), ["1"]);
  assert.deepEqual(answersOf(checks), { "1": 0, "3": 2 });
});

test("keys choose an option", () => {
  assert.equal(optionFromKey("1", 4), 0);
  assert.equal(optionFromKey("D", 4), 3);
  assert.equal(optionFromKey("5", 4), null);
  assert.equal(optionFromKey("ArrowLeft", 4), null);
});

test("option look: correct in green, the wrong pick in red, the rest faded", () => {
  const wrong = check(1, 1, 3);
  assert.equal(optionState(3, wrong, null), "correct");
  assert.equal(optionState(1, wrong, null), "wrong");
  assert.equal(optionState(0, wrong, null), "faded");
  assert.equal(optionState(2, undefined, 2), "pending");
  assert.equal(optionState(0, undefined, 2), "idle");
});

test("support section switches: defaults, stored values and toggling", async () => {
  const { readSectionPrefs, toggleSection, DEFAULT_SECTION_PREFS } = await import("./grammarPracticeLogic.ts");
  assert.deepEqual(readSectionPrefs(null), { explanation: true, theory: false });
  assert.deepEqual(readSectionPrefs('{"theory":true}'), { explanation: true, theory: true });
  assert.deepEqual(readSectionPrefs("not json"), DEFAULT_SECTION_PREFS);
  assert.deepEqual(readSectionPrefs('{"explanation":"yes"}'), DEFAULT_SECTION_PREFS);
  assert.deepEqual(toggleSection(DEFAULT_SECTION_PREFS, "theory"), { explanation: true, theory: true });
});
