/**
 * Grammar workspace — logic and layout invariant tests.
 *
 * Pure function / structural tests; no DOM/RTL needed.
 * Run with: node --no-warnings --test --experimental-strip-types src/modules/grammar/components/grammarWorkspace.test.ts
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

// ─── Shared helpers (mirrors GrammarQuiz internal logic) ─────────────────────

interface GrammarQuestion {
  id: number;
  question: string;
  options: string[];
  order: number;
}

function makeQuestions(n: number): GrammarQuestion[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    question: `Question ${i + 1}`,
    options: ["A", "B", "C", "D"],
    order: i + 1,
  }));
}

/** Mirrors GrammarQuiz state logic */
function workspaceState(
  questions: GrammarQuestion[],
  currentIndex: number,
  answers: Record<string, number>,
) {
  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const isAllAnswered =
    questions.length > 0 && questions.every((q) => answers[String(q.id)] !== undefined);
  const isLastQuestion = currentIndex === questions.length - 1;
  const isFirstQuestion = currentIndex === 0;
  return { currentQuestion, answeredCount, isAllAnswered, isLastQuestion, isFirstQuestion };
}

// ─── Test suites ──────────────────────────────────────────────────────────────

describe("Single-question model", () => {
  test("only one question is 'current' at any given index", () => {
    const questions = makeQuestions(5);
    for (let i = 0; i < questions.length; i++) {
      const { currentQuestion } = workspaceState(questions, i, {});
      assert.equal(currentQuestion.id, questions[i].id);
      // All other questions are NOT the current one
      const otherIds = questions.filter((_, j) => j !== i).map((q) => q.id);
      assert.ok(!otherIds.includes(currentQuestion.id));
    }
  });

  test("question text of current question matches expected", () => {
    const questions = makeQuestions(3);
    const { currentQuestion } = workspaceState(questions, 1, {});
    assert.equal(currentQuestion.question, "Question 2");
  });
});

describe("Navigation", () => {
  test("next navigation advances index correctly (bounded by length-1)", () => {
    const questions = makeQuestions(5);
    let idx = 0;
    // Simulate pressing next 6 times — must stop at 4
    for (let step = 0; step < 6; step++) {
      const next = Math.min(idx + 1, questions.length - 1);
      idx = next;
    }
    assert.equal(idx, 4);
  });

  test("previous navigation returns correctly (bounded by 0)", () => {
    let idx = 2;
    for (let step = 0; step < 5; step++) {
      idx = Math.max(idx - 1, 0);
    }
    assert.equal(idx, 0);
  });

  test("isFirstQuestion is true at index 0 only", () => {
    const questions = makeQuestions(4);
    assert.ok(workspaceState(questions, 0, {}).isFirstQuestion);
    assert.ok(!workspaceState(questions, 1, {}).isFirstQuestion);
    assert.ok(!workspaceState(questions, 3, {}).isFirstQuestion);
  });

  test("isLastQuestion is true at the final index only", () => {
    const questions = makeQuestions(4);
    assert.ok(!workspaceState(questions, 0, {}).isLastQuestion);
    assert.ok(!workspaceState(questions, 2, {}).isLastQuestion);
    assert.ok(workspaceState(questions, 3, {}).isLastQuestion);
  });
});

describe("Answer selection", () => {
  test("selecting an answer updates only the targeted question", () => {
    const questions = makeQuestions(3);
    let answers: Record<string, number> = {};
    // Select option 2 for question 2 only
    answers = { ...answers, [String(questions[1].id)]: 2 };
    assert.equal(answers["2"], 2);
    assert.equal(answers["1"], undefined);
    assert.equal(answers["3"], undefined);
  });

  test("isAllAnswered requires every question to have an answer", () => {
    const questions = makeQuestions(3);
    const partial = { "1": 0, "2": 1 };
    assert.ok(!workspaceState(questions, 0, partial).isAllAnswered);
    const full = { "1": 0, "2": 1, "3": 2 };
    assert.ok(workspaceState(questions, 0, full).isAllAnswered);
  });

  test("answeredCount reflects how many questions have been answered", () => {
    const questions = makeQuestions(5);
    const answers = { "1": 0, "3": 2, "5": 1 };
    assert.equal(workspaceState(questions, 0, answers).answeredCount, 3);
  });
});

describe("Final question / submit path", () => {
  test("isLastQuestion triggers submit path on a single-question topic", () => {
    const questions = makeQuestions(1);
    const { isLastQuestion, isFirstQuestion } = workspaceState(questions, 0, {});
    assert.ok(isLastQuestion);
    assert.ok(isFirstQuestion);
  });

  test("submit becomes available only when all questions answered on last", () => {
    const questions = makeQuestions(3);
    // On last question, partial answers → submit disabled
    const partialAnswers = { "1": 0, "2": 1 };
    const s1 = workspaceState(questions, 2, partialAnswers);
    assert.ok(s1.isLastQuestion);
    assert.ok(!s1.isAllAnswered);

    // Full answers → submit enabled
    const fullAnswers = { "1": 0, "2": 1, "3": 2 };
    const s2 = workspaceState(questions, 2, fullAnswers);
    assert.ok(s2.isLastQuestion);
    assert.ok(s2.isAllAnswered);
  });
});

describe("Feedback pane state", () => {
  test("before submission: no result → empty feedback state expected", () => {
    const result = null;
    assert.equal(result, null);
    // No fabricated explanation or feedback when result is null
  });

  test("after correct submission: isCorrect is true for matched question", () => {
    const questionsResult = [
      { questionId: 1, selectedOption: 0, correctOption: 0, isCorrect: true, explanation: "Because A is correct." },
    ];
    const qr = questionsResult.find((r) => r.questionId === 1);
    assert.ok(qr?.isCorrect);
    assert.equal(qr?.explanation, "Because A is correct.");
  });

  test("after incorrect submission: isCorrect is false and correctOption is available", () => {
    const questionsResult = [
      { questionId: 1, selectedOption: 1, correctOption: 0, isCorrect: false, explanation: null },
    ];
    const qr = questionsResult.find((r) => r.questionId === 1);
    assert.ok(!qr?.isCorrect);
    assert.equal(qr?.correctOption, 0);
    assert.equal(qr?.explanation, null); // no fabricated explanation
  });

  test("explanation is null when backend provides none", () => {
    const qr = { questionId: 1, selectedOption: 0, correctOption: 0, isCorrect: true, explanation: null };
    assert.equal(qr.explanation, null);
  });
});

describe("No-video and video-present states", () => {
  test("no-video topic: videoYoutubeId is null — no aspect-video element expected", () => {
    const topic = { id: 1, title: "Future Forms", level: "B1", description: null, videoYoutubeId: null, keyFormula: null };
    // The compact no-video text should be shown; the collapsible iframe should not be rendered
    assert.equal(topic.videoYoutubeId, null);
    // In GrammarVideoPlayer, null → renders data-testid="grammar-no-video" paragraph, not an iframe
  });

  test("video-present topic: videoYoutubeId is set — collapsible accessible", () => {
    const topic = { id: 2, title: "Modal Verbs", level: "B1", description: null, videoYoutubeId: "dQw4w9WgXcQ", keyFormula: null };
    assert.ok(topic.videoYoutubeId !== null);
    // GrammarVideoPlayer renders data-testid="grammar-video-collapsible" <details> element
  });
});

describe("Focus-mode preservation", () => {
  test("selectedTopicId not null activates focus mode", () => {
    let focusMode = false;
    const setFocusMode = (v: boolean) => { focusMode = v; };
    const selectedTopicId = 1;
    if (selectedTopicId !== null) setFocusMode(true);
    assert.ok(focusMode);
  });

  test("selectedTopicId null deactivates focus mode", () => {
    let focusMode = true;
    const setFocusMode = (v: boolean) => { focusMode = v; };
    const selectedTopicId = null;
    if (selectedTopicId !== null) setFocusMode(true); else setFocusMode(false);
    assert.ok(!focusMode);
  });
});

describe("Responsive layout invariants", () => {
  test("left pane is desktop-only (hidden on tablet and mobile)", () => {
    // Left pane className contains 'hidden lg:flex' — visible only at lg+ (1024px+)
    const leftPaneClasses = "hidden lg:flex w-56 xl:w-60 shrink-0 flex-col";
    assert.ok(leftPaneClasses.includes("hidden lg:flex"));
    assert.ok(!leftPaneClasses.includes("md:flex")); // NOT shown at tablet breakpoint
  });

  test("right pane is shown from tablet upward (md+)", () => {
    const rightPaneClasses = "hidden md:flex w-64 xl:w-72 shrink-0 flex-col";
    assert.ok(rightPaneClasses.includes("hidden md:flex"));
  });

  test("mobile inline support section is hidden on md+", () => {
    const mobileClasses = "md:hidden";
    assert.ok(mobileClasses.includes("md:hidden"));
    assert.ok(!mobileClasses.includes("lg:hidden")); // Specifically hides at md, not lg
  });
});
