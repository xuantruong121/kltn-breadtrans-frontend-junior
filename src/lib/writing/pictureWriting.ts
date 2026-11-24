/**
 * "Viết câu theo tranh": picture tasks are identified by their task type
 * (the older keyword sentence quiz shares the WRITING_PICTURE quiz type but
 * has no picture). The API enforces the same 40-word limit.
 */
export const PICTURE_TASK_TYPE = "PICTURE_SENTENCE";
export const PICTURE_MAX_WORDS = 40;

export type PictureTaskSummary = {
  questionId: number;
  position: number;
  imageUrl: string | null;
  keywords: string[];
  isGraded: boolean;
};

type PictureQuizLike = {
  id: number;
  title?: string;
  taskType?: string | null;
  cefrLevel?: string | null;
  isLocked?: boolean;
  isLevelLocked?: boolean;
  requiredPlan?: string;
  pictureTasks?: PictureTaskSummary[];
};

export function isPictureQuiz(quiz: { taskType?: string | null }): boolean {
  return quiz.taskType === PICTURE_TASK_TYPE;
}

/** One catalog card per picture, in exercise then task order. */
export function pictureCards<T extends PictureQuizLike>(quizzes: T[]) {
  return quizzes.filter(isPictureQuiz).flatMap((quiz) =>
    (quiz.pictureTasks ?? [])
      .filter((task) => task.imageUrl && task.keywords.length === 2)
      .map((task) => ({
        key: `${quiz.id}-${task.questionId}`,
        quiz,
        task,
        pair: task.keywords.join(" / "),
        href: `/writing/${quiz.id}?q=${task.questionId}`,
      })),
  );
}

/** Cue-word pairs that actually exist, for the pair filter. */
export function cueWordPairs(cards: Array<{ pair: string }>): string[] {
  return [...new Set(cards.map((card) => card.pair))].sort((a, b) =>
    a.localeCompare(b),
  );
}

/**
 * Whether a key press in the picture answer box grades the answer (owner
 * 2026-11-24): Enter grades, Shift+Enter starts a new line, and an Enter that
 * still belongs to an IME composition (Vietnamese input) does nothing.
 */
export function submitsOnEnter(event: { key: string; shiftKey: boolean; isComposing: boolean }): boolean {
  return event.key === "Enter" && !event.shiftKey && !event.isComposing;
}
