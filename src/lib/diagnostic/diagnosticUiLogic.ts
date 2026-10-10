export interface DiagnosticUiQuestion {
  id: number;
}

export function getUnansweredQuestionIndexes(
  questions: DiagnosticUiQuestion[],
  answers: Record<string, number | string>,
): number[] {
  return questions.reduce<number[]>((indexes, question, index) => {
    const answer = answers[question.id];
    if (answer === undefined || (typeof answer === "string" && !answer.trim()))
      indexes.push(index);
    return indexes;
  }, []);
}

export function resolveReviewAnswer(
  options: unknown,
  correctIndex: unknown,
): string | null {
  if (!Array.isArray(options) || !Number.isInteger(correctIndex)) return null;
  const index = correctIndex as number;
  const value = options[index];
  return index >= 0 && index < options.length && typeof value === "string"
    ? value
    : null;
}
