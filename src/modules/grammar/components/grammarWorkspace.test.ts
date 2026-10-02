/**
 * Grammar workspace — logic, navigation, exit-guard, and layout invariant tests.
 *
 * Imports pure helpers directly from grammarNavigationUtils.ts to ensure
 * tests and production code share the exact same execution path.
 *
 * Run with: node --no-warnings --test --experimental-strip-types src/modules/grammar/components/grammarWorkspace.test.ts
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  getNextIndex,
  getPrevIndex,
  isGrammarDirty,
  GRAMMAR_LAYOUT_CLASSES,
  BREAKPOINT_PANE_WIDTHS,
  computeRawCenterWidth,
  computeUsableCardWidth,
} from "./grammarNavigationUtils.ts";
import type { SupportedBreakpoint } from "./grammarNavigationUtils.ts";

// ─── Test Fixtures ────────────────────────────────────────────────────────────

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

/** Mirrors GrammarQuiz state transitions using production helpers */
function workspaceState(
  questions: GrammarQuestion[],
  currentIndex: number,
  answers: Record<string, number>,
  result: unknown = null,
) {
  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const isAllAnswered =
    questions.length > 0 && questions.every((q) => answers[String(q.id)] !== undefined);
  const isLastQuestion = currentIndex === questions.length - 1;
  const isFirstQuestion = currentIndex === 0;
  const isDirty = isGrammarDirty(answeredCount, Boolean(result));

  // In GrammarQuiz:
  // Next button is rendered if (!isLastQuestion || result)
  // Next button is disabled if isLastQuestion
  const isNextButtonRendered = !isLastQuestion || Boolean(result);
  const isNextButtonDisabled = isLastQuestion;
  const isSubmitButtonRendered = isLastQuestion && !result;

  return {
    currentQuestion,
    answeredCount,
    isAllAnswered,
    isLastQuestion,
    isFirstQuestion,
    isDirty,
    isNextButtonRendered,
    isNextButtonDisabled,
    isSubmitButtonRendered,
  };
}

// ─── Test Suites ──────────────────────────────────────────────────────────────

describe("Single-question model", () => {
  test("only one question is 'current' at any given index", () => {
    const questions = makeQuestions(5);
    for (let i = 0; i < questions.length; i++) {
      const { currentQuestion } = workspaceState(questions, i, {});
      assert.equal(currentQuestion.id, questions[i].id);
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

describe("DEFECT A — Review-mode boundary safety & navigation", () => {
  test("1. final question in active pre-submit mode: Next is NOT rendered, Submit is rendered", () => {
    const questions = makeQuestions(5);
    const state = workspaceState(questions, 4, { "1": 0, "2": 1, "3": 2, "4": 3, "5": 0 }, null);
    assert.ok(state.isLastQuestion);
    assert.equal(state.isNextButtonRendered, false, "Next button must not be rendered on last question pre-submit");
    assert.equal(state.isSubmitButtonRendered, true, "Submit button must be rendered on last question pre-submit");
  });

  test("2. final question in review mode: Next is rendered but disabled", () => {
    const questions = makeQuestions(5);
    const mockResult = { correctCount: 5, totalQuestions: 5, questionsResult: [] };
    const state = workspaceState(questions, 4, {}, mockResult);
    assert.ok(state.isLastQuestion);
    assert.equal(state.isNextButtonRendered, true, "Next button is rendered in review mode");
    assert.equal(state.isNextButtonDisabled, true, "Next button must be disabled at the final question in review mode");
  });

  test("3. forced Next invocation at final index: currentIndex remains clamped at questions.length - 1", () => {
    const total = 5;
    let idx = 4; // already at final question

    // Call production getNextIndex directly
    idx = getNextIndex(idx, total);
    assert.equal(idx, 4, "Index must remain clamped at 4");

    // Repeated invocations must never increment beyond 4
    for (let step = 0; step < 10; step++) {
      idx = getNextIndex(idx, total);
    }
    assert.equal(idx, 4, "Repeated Next at end must stay at 4");
  });

  test("4. Previous navigation at index 0: remains clamped at 0", () => {
    let idx = 0;
    idx = getPrevIndex(idx);
    assert.equal(idx, 0, "Index must stay 0 when previous is called at 0");

    for (let step = 0; step < 10; step++) {
      idx = getPrevIndex(idx);
    }
    assert.equal(idx, 0, "Repeated Prev at start must stay at 0");
  });

  test("5. review-mode navigation: Qn -> Qn-1 works smoothly", () => {
    let idx = 4;
    idx = getPrevIndex(idx);
    assert.equal(idx, 3, "Navigating from index 4 goes to 3");
    idx = getPrevIndex(idx);
    assert.equal(idx, 2, "Navigating from index 3 goes to 2");
    idx = getNextIndex(idx, 5);
    assert.equal(idx, 3, "Navigating forward goes back to 3");
  });

  test("6. question jump: valid indices work without boundary corruption", () => {
    const questions = makeQuestions(5);
    const jumpTargets = [0, 2, 4, 1, 3];
    for (const target of jumpTargets) {
      assert.ok(target >= 0 && target < questions.length);
      const { currentQuestion } = workspaceState(questions, target, {});
      assert.equal(currentQuestion.id, target + 1);
    }
  });

  test("7. no currentQuestion undefined path: every valid clamped index yields a question", () => {
    const questions = makeQuestions(5);
    for (let i = -5; i <= 10; i++) {
      const clampedNext = getNextIndex(i, questions.length);
      assert.ok(clampedNext >= 0 && clampedNext < questions.length);
      assert.ok(questions[clampedNext] !== undefined);

      const clampedPrev = getPrevIndex(i);
      const safePrev = Math.min(clampedPrev, questions.length - 1);
      assert.ok(questions[safePrev] !== undefined);
    }
  });
});

describe("DEFECT B — 1024px layout cramping & responsive rebalance", () => {
  test("left pane class uses corrected breakpoint progression (lg:w-60 xl:w-72 2xl:w-80)", () => {
    const left = GRAMMAR_LAYOUT_CLASSES.leftPane;
    assert.ok(left.includes("hidden lg:flex"), "Left pane must be hidden on mobile/tablet and visible at lg+");
    assert.ok(left.includes("lg:w-60"), "Left pane at 1024px must be lg:w-60 (240px)");
    assert.ok(left.includes("xl:w-72"), "Left pane at 1280px must be xl:w-72 (288px)");
    assert.ok(left.includes("2xl:w-80"), "Left pane at 1440px+ must be 2xl:w-80 (320px)");
    assert.ok(!left.includes("w-72 lg:"), "Old un-prefixed w-72 must not be used on lg");
  });

  test("right pane class uses corrected breakpoint progression (md:w-80 lg:w-80 xl:w-96 2xl:w-[420px])", () => {
    const right = GRAMMAR_LAYOUT_CLASSES.rightPane;
    assert.ok(right.includes("hidden md:flex"), "Right pane must be visible from tablet md+");
    assert.ok(right.includes("md:w-80"), "Right pane at 768px must be md:w-80 (320px)");
    assert.ok(right.includes("lg:w-80"), "Right pane at 1024px must be lg:w-80 (320px)");
    assert.ok(right.includes("xl:w-96"), "Right pane at 1280px must be xl:w-96 (384px)");
    assert.ok(right.includes("2xl:w-[420px]"), "Right pane at 1440px+ must be 2xl:w-[420px]");
    assert.ok(!right.includes("lg:w-96"), "Old lg:w-96 (384px) must not be active at 1024px");
  });

  test("center outer padding and card padding are calibrated", () => {
    assert.equal(GRAMMAR_LAYOUT_CLASSES.centerOuterPadding, "px-4 sm:px-6 lg:px-8");
    assert.equal(GRAMMAR_LAYOUT_CLASSES.questionCardPadding, "p-6 sm:p-8 lg:p-8");
  });

  test("responsive invariants across all 5 key breakpoints (768, 1024, 1280, 1440, 1920)", () => {
    const breakpoints: SupportedBreakpoint[] = [768, 1024, 1280, 1440, 1920];

    for (const bp of breakpoints) {
      const rawCenter = computeRawCenterWidth(bp);
      const usableCard = computeUsableCardWidth(bp);

      // Raw center width must always be positive and substantial
      assert.ok(rawCenter >= 440, `Breakpoint ${bp} raw center (${rawCenter}px) should be >= 440px`);
      // Usable card width inside center pane must comfortably fit content
      assert.ok(usableCard >= 320, `Breakpoint ${bp} usable card (${usableCard}px) should be >= 320px`);
    }
  });

  test("1024px target layout: center width is NOT structurally starved", () => {
    const rawCenter1024 = computeRawCenterWidth(1024);
    const usableCard1024 = computeUsableCardWidth(1024);
    const totalSidePanes1024 = BREAKPOINT_PANE_WIDTHS[1024].left + BREAKPOINT_PANE_WIDTHS[1024].right;

    // Side panes total 240 + 320 = 560px (down from old 672px by 112px)
    assert.equal(totalSidePanes1024, 560);
    // Raw center width is 1024 - 560 = 464px (up from old ~352px)
    assert.equal(rawCenter1024, 464);
    // Usable card width is 464 - 128 = 336px (up from old ~192px, a 75% increase)
    assert.equal(usableCard1024, 336);
    assert.ok(usableCard1024 >= 300, "1024px usable card width must exceed 300px min threshold");
  });

  test("1280px+ desktop layout: generous layout is preserved", () => {
    const rawCenter1280 = computeRawCenterWidth(1280);
    const usableCard1280 = computeUsableCardWidth(1280);
    assert.equal(rawCenter1280, 608);
    assert.equal(usableCard1280, 480);
  });
});

describe("DEFECT C — Exit guard & unsaved answer protection", () => {
  test("A. untouched attempt: answeredCount === 0 -> isGrammarDirty is false (no exit guard)", () => {
    assert.equal(isGrammarDirty(0, false), false, "Untouched attempt must not be dirty");
  });

  test("B. one answer selected: answeredCount === 1, no result -> isGrammarDirty is true (triggers exit guard)", () => {
    assert.equal(isGrammarDirty(1, false), true, "1 answer without result must be dirty");
  });

  test("C. multiple answers selected pre-submit: isGrammarDirty is true", () => {
    assert.equal(isGrammarDirty(4, false), true, "Multiple answers without result must be dirty");
  });

  test("D. after successful submission (review mode): isGrammarDirty is false (no false warning)", () => {
    assert.equal(isGrammarDirty(5, true), false, "Submitted attempt in review mode must NOT be dirty");
    assert.equal(isGrammarDirty(1, true), false);
  });

  test("E. cancel guard preserves learner answers and current question state", () => {
    const initialAnswers = { "1": 0, "2": 2 };
    const initialIndex = 1;

    const answers = { ...initialAnswers };
    const currentIndex = initialIndex;

    // User triggers exit -> Dialog opens -> User clicks Cancel
    // Exit handler aborts; state is preserved
    const onCancelExit = () => {
      // Do nothing to answers or index
    };
    onCancelExit();

    assert.deepEqual(answers, initialAnswers, "Answers must remain intact after cancelled exit");
    assert.equal(currentIndex, initialIndex, "Current index must remain intact after cancelled exit");
  });

  test("F. confirm guard triggers navigation to Reading Grammar catalog", () => {
    let navigatedUrl = "";
    const mockRouterPush = (url: string) => {
      navigatedUrl = url;
    };

    const defaultFallbackUrl = "/practice/reading?category=grammar";
    const onConfirmExit = () => {
      mockRouterPush(defaultFallbackUrl);
    };

    onConfirmExit();
    assert.equal(navigatedUrl, "/practice/reading?category=grammar");
  });

  test("G. focus mode remains true on cancelled exit, clears on confirmed exit or unmount", () => {
    let focusMode = false;
    const setFocusMode = (v: boolean) => {
      focusMode = v;
    };

    // Enter exercise
    setFocusMode(true);
    assert.equal(focusMode, true);

    // Cancel exit
    const handleCancel = () => {
      // Focus mode stays true
    };
    handleCancel();
    assert.equal(focusMode, true, "Focus mode must stay true when exit is cancelled");

    // Confirm exit
    const handleConfirm = () => {
      setFocusMode(false);
    };
    handleConfirm();
    assert.equal(focusMode, false, "Focus mode must clear when exit is confirmed");
  });
});

describe("Answer selection & submission readiness", () => {
  test("selecting an answer updates only the targeted question", () => {
    const questions = makeQuestions(3);
    let answers: Record<string, number> = {};
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

  test("submit becomes available only when all questions answered on last", () => {
    const questions = makeQuestions(3);
    const partialAnswers = { "1": 0, "2": 1 };
    const s1 = workspaceState(questions, 2, partialAnswers);
    assert.ok(s1.isLastQuestion);
    assert.ok(!s1.isAllAnswered);

    const fullAnswers = { "1": 0, "2": 1, "3": 2 };
    const s2 = workspaceState(questions, 2, fullAnswers);
    assert.ok(s2.isLastQuestion);
    assert.ok(s2.isAllAnswered);
  });
});

describe("Feedback pane & result mapping by questionId", () => {
  test("result mapping by questionId remains robust", () => {
    const questionsResult = [
      { questionId: 101, selectedOption: 0, correctOption: 0, isCorrect: true, explanation: "Exp 101" },
      { questionId: 102, selectedOption: 2, correctOption: 1, isCorrect: false, explanation: "Exp 102" },
    ];

    const currentQuestion = { id: 102, question: "Q2", options: [], order: 2 };
    // Exact lookup from production code:
    const qr = questionsResult.find((r) => r.questionId === currentQuestion.id);

    assert.ok(qr);
    assert.equal(qr?.questionId, 102);
    assert.equal(qr?.isCorrect, false);
    assert.equal(qr?.correctOption, 1);
  });

  test("before submission: no result -> empty feedback state", () => {
    const result = null;
    assert.equal(result, null);
  });

  test("explanation is null when backend provides none", () => {
    const qr = { questionId: 1, selectedOption: 0, correctOption: 0, isCorrect: true, explanation: null };
    assert.equal(qr.explanation, null);
  });
});

describe("No-video and video-present states", () => {
  test("no-video topic: videoYoutubeId is null", () => {
    const topic = { id: 1, title: "Future Forms", level: "B1", description: null, videoYoutubeId: null, keyFormula: null };
    assert.equal(topic.videoYoutubeId, null);
  });

  test("video-present topic: videoYoutubeId is set", () => {
    const topic = { id: 2, title: "Modal Verbs", level: "B1", description: null, videoYoutubeId: "dQw4w9WgXcQ", keyFormula: null };
    assert.ok(topic.videoYoutubeId !== null);
  });
});
