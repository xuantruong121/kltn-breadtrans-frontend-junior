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
}

export interface WritingCatalogResponse {
  categories: Array<{
    id: number;
    name: string;
    vietnameseName?: string | null;
  }>;
  quizzes: WritingTopic[];
}

export interface WritingQuizDetails extends WritingTopic {
  quizId: number;
  title: string;
  description?: string | null;
  maxScore: number;
  sampleSentences?: string[];
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
}

export interface WritingEvaluation extends Partial<PracticeWritingDetail> {
  submissionId: number;
  status?: "COMPLETED";
  score: number;
  maxScore: number;
  feedback: string;
  suggestions: string[];
  taskType?: string | null;
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
  ): Promise<WritingEvaluation> => {
    return await axiosClient.post(withExamParentContext(`/writing/quizzes/${id}/submit`, context), {
      answer,
      clientAttemptId,
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
