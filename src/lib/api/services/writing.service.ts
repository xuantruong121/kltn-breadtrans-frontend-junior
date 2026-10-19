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

export interface WritingEvaluation {
  submissionId: number;
  status?: "COMPLETED";
  score: number;
  maxScore: number;
  feedback: string;
  suggestions: string[];
  taskType?: string | null;
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
