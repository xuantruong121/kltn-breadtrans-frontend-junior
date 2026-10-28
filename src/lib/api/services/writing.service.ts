import axiosClient from "../axiosClient";

export interface WritingTopic {
  id: number;
  title?: string;
  description?: string | null;
  type?: "WRITING_PICTURE" | "WRITING_EMAIL" | "WRITING_OPINION";
  topicId?: number | null;
  topicName?: string;
  level?: string;
  taskType?: string;
  prompt?: string;
  imageUrl?: string | null;
  keywords?: string[];
  wordRange?: number[] | null;
  isCompleted?: boolean;
  isPremiumContent?: boolean;
  isLocked?: boolean;
  /** Lowest plan that opens this item: FREE, PLUS or PRO. */
  requiredPlan?: string;
  /** Authored CEFR level the required plan is decided from ("B1", "B2-C1"). */
  cefrLevel?: string | null;
  /** Graded tasks out of all tasks: none, some, all. */
  completionStatus?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  /** "Viết câu theo tranh" exercises: each picture with its two cue words. */
  pictureTasks?: Array<{
    questionId: number;
    position: number;
    imageUrl: string | null;
    keywords: string[];
    isGraded: boolean;
  }>;
}

export interface WritingCatalogResponse {
  categories: Array<{
    id: number;
    name: string;
    vietnameseName?: string | null;
  }>;
  quizzes: WritingTopic[];
}

/** Progress through a catalog exercise of 1-5 independent Writing tasks. */
export interface WritingExerciseSummary {
  total: number;
  answered: number;
  complete: boolean;
  /** Mean of the latest grade of every task, only once all are graded. */
  percent: number | null;
  nextQuestionId: number | null;
}

export interface WritingExerciseTask {
  id: number;
  position: number;
  taskType: string | null;
  prompt: string | null;
  imageUrl: string | null;
  keywords: string[];
  requirements: string[];
  wordRange: [number, number] | null;
  maxScore: number | null;
  latest: { submissionId: number; score: number; maxScore: number } | null;
}

export interface WritingQuizDetails extends WritingTopic {
  exercise?: WritingExerciseSummary & { questions: WritingExerciseTask[] };
  quizId: number;
  title: string;
  description?: string | null;
  maxScore: number;
  sampleSentences?: string[];
  /** The e-mail a written-request task answers (TOEIC Writing Q6-7). */
  email?: string | null;
}

/** Present on catalog practice tasks graded with their own rubric. */
export interface PracticeWritingDetail {
  rubricVersion: "PRACTICE_WRITING_V1";
  criteria: Array<{ key: string; label: string; score: number; max: number; comment: string }>;
  strengths: string[];
  corrections: Array<{ original: string; corrected: string; explanation: string }>;
  wordCount: number | null;
  wordRange: [number, number] | null;
  keywords: Array<{ keyword: string; present: boolean }>;
  /** B1 picture tasks: the connector found and the sentence count. */
  linking?: { required: true; found: string | null; sentences: number };
}

export interface WritingEvaluation extends Partial<PracticeWritingDetail> {
  submissionId: number;
  status?: "COMPLETED";
  score: number;
  maxScore: number;
  feedback: string;
  suggestions: string[];
  taskType?: string | null;
  exercise?: WritingExerciseSummary & { questionId: number; position: number };
}

export function practiceDetailOf(value: Partial<PracticeWritingDetail> | null | undefined): PracticeWritingDetail | null {
  return value?.rubricVersion === "PRACTICE_WRITING_V1" && Array.isArray(value.criteria)
    ? {
        rubricVersion: value.rubricVersion,
        criteria: value.criteria,
        strengths: value.strengths ?? [],
        corrections: value.corrections ?? [],
        wordCount: value.wordCount ?? null,
        wordRange: value.wordRange ?? null,
        keywords: value.keywords ?? [],
        ...(value.linking ? { linking: value.linking } : {}),
      }
    : null;
}

export type WritingExamParentContext = {
  attemptId: number;
  componentId: number;
};

function withExamParentContext(
  path: string,
  context?: WritingExamParentContext,
) {
  if (!context) return path;
  return `${path}?parentAttemptId=${context.attemptId}&parentComponentId=${context.componentId}`;
}

export const writingService = {
  getTopics: async (): Promise<WritingCatalogResponse> => {
    return await axiosClient.get("/writing/topics");
  },

  getQuizDetails: async (
    id: number,
    context?: WritingExamParentContext,
  ): Promise<WritingQuizDetails> => {
    return await axiosClient.get(
      withExamParentContext(`/writing/quizzes/${id}`, context),
    );
  },

  submit: async (
    id: number,
    answer: string,
    clientAttemptId: string,
    context?: WritingExamParentContext,
    questionId?: number,
  ): Promise<WritingEvaluation> => {
    return await axiosClient.post(withExamParentContext(`/writing/quizzes/${id}/submit`, context), {
      answer,
      clientAttemptId,
      ...(questionId ? { questionId } : {}),
    });
  },

  submitPart2: async (
    quizId: number,
    userResponse: string,
    clientAttemptId: string,
    context?: WritingExamParentContext,
  ): Promise<WritingEvaluation> => {
    return await axiosClient.post(withExamParentContext("/writing/part2/submit", context), {
      quizId,
      userResponse,
      clientAttemptId,
    });
  },

  submitPart3: async (
    quizId: number,
    userEssay: string,
    clientAttemptId: string,
    context?: WritingExamParentContext,
  ): Promise<WritingEvaluation> => {
    return await axiosClient.post(withExamParentContext("/writing/part3/submit", context), {
      quizId,
      userEssay,
      clientAttemptId,
    });
  },
};
