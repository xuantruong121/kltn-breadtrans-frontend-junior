import axiosClient from "../axiosClient";

export interface GrammarTopicSummary {
  id: number;
  title: string;
  level: string;
  description: string | null;
  videoYoutubeId: string | null;
  keyFormula: string | null;
  totalQuestions: number;
  isCompleted: boolean;
  lastScore: number | null;
  attemptCount: number;
}

export interface GrammarQuestion {
  id: number;
  question: string;
  options: string[];
  order: number;
}

export interface GrammarTopicDetail extends Omit<GrammarTopicSummary, "totalQuestions" | "isCompleted" | "lastScore" | "attemptCount"> {
  questions: GrammarQuestion[];
}

export interface GrammarAttemptResult {
  attemptId: number;
  score: number;
  correctCount: number;
  totalQuestions: number;
  rewardBanh: number;
  rewardXP: number;
  isFirstCompletion: boolean;
  questionsResult: Array<{
    questionId: number;
    selectedOption: number | undefined;
    correctOption: number;
    isCorrect: boolean;
    explanation: string | null;
  }>;
}

export const grammarService = {
  getTopics: (): Promise<GrammarTopicSummary[]> => axiosClient.get("/grammar/topics"),
  getTopic: (id: number): Promise<GrammarTopicDetail> => axiosClient.get(`/grammar/topics/${id}`),
  submitAttempt: (id: number, answers: Record<string, number>): Promise<GrammarAttemptResult> =>
    axiosClient.post(`/grammar/topics/${id}/attempt`, { answers }),
};
