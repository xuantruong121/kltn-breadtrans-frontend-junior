import axiosClient from "../axiosClient";

export interface Question {
  id: number;
  quizId: number;
  type: string; // "MULTIPLE_CHOICE", "WRITING", etc.
  content: any; // { text: string, options?: string[], correct?: string, category?: string }
  order: number;
}

export interface Quiz {
  id: number;
  title: string;
  description: string;
  type: string; // e.g. "LISTENING_PRACTICE"
  questions?: Question[];
  _count?: {
    questions: number;
  };
}

export interface AnswerDto {
  questionId: number;
  answer: string;
}

export interface SubmissionResult {
  id: number;
  score: number;
  aiFeedback?: string;
  results?: any[];
}

export interface SubmissionAnalytics {
  submissionId: number;
  quizTitle: string;
  overallScore: number;
  totalQuestions: number;
  totalCorrect: number;
  overallAccuracyPercent: number;
  categoriesBreakdown: {
    category: string;
    correct: number;
    total: number;
    accuracyPercent: number;
  }[];
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
}

export const quizService = {
  getListeningPractices: async (): Promise<Quiz[]> => {
    return await axiosClient.get("/quizzes/listening-practice");
  },

  getQuizById: async (id: number): Promise<Quiz> => {
    return await axiosClient.get(`/quizzes/${id}`);
  },

  submitQuiz: async (id: number, answers: AnswerDto[]): Promise<SubmissionResult> => {
    return await axiosClient.post(`/quizzes/${id}/submit`, { answers });
  },

  getAnalytics: async (submissionId: number): Promise<SubmissionAnalytics> => {
    return await axiosClient.get(`/quizzes/submissions/${submissionId}/analytics`);
  },
};
