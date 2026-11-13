/**
 * Grammar practice graded one question at a time (owner 2026-11-13: pick an
 * option, see right or wrong and the explanation at once). Pure: no React.
 */

/** POST /grammar/topics/:id/questions/:questionId/check */
export type GrammarCheck = {
  questionId: number;
  selectedOption: number | undefined;
  correctOption: number;
  isCorrect: boolean;
  explanation: string | null;
  optionExplanations?: Array<string | null> | null;
};

export type GrammarChecks = Record<number, GrammarCheck>;

type Q = { id: number };

export function grammarTally(questions: Q[], checks: GrammarChecks) {
  let correct = 0;
  let wrong = 0;
  for (const q of questions) {
    const check = checks[q.id];
    if (!check) continue;
    if (check.isCorrect) correct += 1;
    else wrong += 1;
  }
  return { total: questions.length, answered: correct + wrong, correct, wrong };
}

export function wrongQuestionIds(questions: Q[], checks: GrammarChecks): number[] {
  return questions.filter((q) => checks[q.id] && !checks[q.id].isCorrect).map((q) => q.id);
}

export function allAnswered(questions: Q[], checks: GrammarChecks): boolean {
  return questions.length > 0 && questions.every((q) => checks[q.id] !== undefined);
}

/** The next question without an answer after `from`, wrapping round; null when none is left. */
export function nextUnanswered(questions: Q[], checks: GrammarChecks, from: number): number | null {
  for (let step = 1; step <= questions.length; step += 1) {
    const index = (from + step) % questions.length;
    if (!checks[questions[index].id]) return index;
  }
  return null;
}

/** "Làm lại câu sai": the wrong answers are cleared, the right ones kept. */
export function clearWrong(checks: GrammarChecks): GrammarChecks {
  return Object.fromEntries(Object.entries(checks).filter(([, check]) => check.isCorrect));
}

/** The attempt body: question id -> chosen option. */
export function answersOf(checks: GrammarChecks): Record<string, number> {
  const answers: Record<string, number> = {};
  for (const check of Object.values(checks)) {
    if (check.selectedOption !== undefined) answers[String(check.questionId)] = check.selectedOption;
  }
  return answers;
}

/** Keyboard choice: "1"-"4" or "a"-"d" -> option index; null for any other key. */
export function optionFromKey(key: string, optionCount: number): number | null {
  const k = key.toLowerCase();
  const index = /^[1-9]$/.test(k) ? Number(k) - 1 : /^[a-z]$/.test(k) ? k.charCodeAt(0) - 97 : -1;
  return index >= 0 && index < optionCount ? index : null;
}

export type OptionState = "idle" | "pending" | "correct" | "wrong" | "faded";

/** How an option looks once its question is checked (or while it is being checked). */
export function optionState(
  optionIndex: number,
  check: GrammarCheck | undefined,
  pendingOption: number | null,
): OptionState {
  if (!check) return pendingOption === optionIndex ? "pending" : "idle";
  if (optionIndex === check.correctOption) return "correct";
  if (optionIndex === check.selectedOption) return "wrong";
  return "faded";
}
