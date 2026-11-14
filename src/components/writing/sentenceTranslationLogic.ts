import type {
  TranslationCheck,
  TranslationVerdict,
  WritingExerciseTask,
} from "../../lib/api/services/writing.service";

/** "Dịch câu" sentence state: checked in this visit, else the learner's last grade. */
export type SentenceStatus = TranslationVerdict | "NONE";

export function sentenceStatus(
  task: Pick<WritingExerciseTask, "latest">,
  check: Pick<TranslationCheck, "verdict"> | undefined,
): SentenceStatus {
  if (check) return check.verdict;
  if (!task.latest) return "NONE";
  // A stored grade: 2 of 2 is right, 1 is nearly right, 0 is wrong.
  if (task.latest.score >= task.latest.maxScore) return "CORRECT";
  return task.latest.score > 0 ? "MINOR" : "WRONG";
}

export const isRight = (status: SentenceStatus) => status === "CORRECT";
export const isChecked = (status: SentenceStatus) => status !== "NONE";

export function translationTally(statuses: SentenceStatus[]) {
  const answered = statuses.filter(isChecked).length;
  const correct = statuses.filter(isRight).length;
  return { total: statuses.length, answered, correct, wrong: answered - correct };
}

/** Indexes of checked sentences that are not fully right. */
export function sentencesToRedo(statuses: SentenceStatus[]): number[] {
  return statuses.flatMap((s, i) => (isChecked(s) && !isRight(s) ? [i] : []));
}

/** The next unchecked sentence after `from`, wrapping round; null when all are checked. */
export function nextUnchecked(statuses: SentenceStatus[], from: number): number | null {
  for (let step = 1; step <= statuses.length; step += 1) {
    const i = (from + step) % statuses.length;
    if (!isChecked(statuses[i])) return i;
  }
  return null;
}

export const VERDICT_LABEL: Record<TranslationVerdict, string> = {
  CORRECT: "Đúng",
  MINOR: "Gần đúng",
  WRONG: "Chưa đúng",
  UNMATCHED: "Chưa khớp đáp án mẫu",
};

/** Keyboard: Enter checks an unchecked sentence and moves on from a checked one; Shift+Enter is a new line. */
export function enterAction(
  key: string,
  shiftKey: boolean,
  checked: boolean,
  answer: string,
): "check" | "next" | null {
  if (key !== "Enter" || shiftKey) return null;
  if (checked) return "next";
  return answer.trim() ? "check" : null;
}
