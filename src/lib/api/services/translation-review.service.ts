import axiosClient from "../axiosClient";

/** A learner translation the AI judged right that is not an accepted answer yet. */
export interface TranslationReviewRow {
  questionId: number;
  quizId: number;
  quizTitle: string;
  /** The Vietnamese sentence. */
  prompt: string;
  /** The spelling learners used most. */
  answer: string;
  key: string;
  count: number;
  learners: number;
  lastAt: string;
  explanation: string | null;
  acceptedAnswers: string[];
}

export interface TranslationReviewPage {
  data: TranslationReviewRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** How many translations wait, in all and per "Dịch câu" exercise (owner 2026-11-19). */
export interface TranslationReviewSummary {
  total: number;
  byQuiz: Record<string, number>;
}

export const translationReviewService = {
  list: async (page: number, limit = 20, quizId?: number): Promise<TranslationReviewPage> =>
    axiosClient.get("/admin/translation-answers", {
      params: { page, limit, ...(quizId ? { quizId } : {}) },
    }) as unknown as Promise<TranslationReviewPage>,

  summary: async (): Promise<TranslationReviewSummary> =>
    axiosClient.get("/admin/translation-answers/summary") as unknown as Promise<TranslationReviewSummary>,

  approve: async (questionId: number, answer: string): Promise<{ questionId: number; acceptedAnswers: string[] }> =>
    axiosClient.post("/admin/translation-answers/approve", { questionId, answer }) as unknown as Promise<{
      questionId: number;
      acceptedAnswers: string[];
    }>,

  dismiss: async (questionId: number, answer: string): Promise<{ questionId: number; dismissed: true }> =>
    axiosClient.post("/admin/translation-answers/dismiss", { questionId, answer }) as unknown as Promise<{
      questionId: number;
      dismissed: true;
    }>,
};
