import axiosClient from "../axiosClient";

export interface StructuredExplanation {
  vi: string;
  evidence?: string;
  keyPhrase?: string;
  vocabularyNote?: string;
}

export type QuestionExplanation = string | StructuredExplanation;

export interface QuestionContent {
  text?: string;
  options?: string[];
  correct?: string;
  correctIndex?: number;
  explanation?: QuestionExplanation;
  translation?: string;
  audioText?: string;
  accent?: string;
  imageUrl?: string;
  imageAlt?: string;
  imagePurpose?: "TOPIC_CONTEXT";
  category?: string;
  section?: string;
}

export interface Question {
  id: number;
  quizId: number;
  type: string; // "MULTIPLE_CHOICE", "WRITING", etc.
  content: QuestionContent | any;
  order: number;
}

export interface Quiz {
  id: number;
  title: string;
  description: string;
  type: string; // e.g. "LISTENING_PRACTICE"
  bilingualContent?: {
    examFormat?: "TWO_SKILL" | "FOUR_SKILL";
    examSetId?: number;
    isBundle?: boolean;
    skillLabel?: string;
    sections?: string[];
    durationMinutes?: number;
  };
  questions?: Question[];
  _count?: {
    questions: number;
  };
  questionsCount?: number;
  isBundle?: boolean;
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
  results?: any[];
  questions?: any[];
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
}

export interface ListeningPracticeCatalogItem {
  id: number;
  title: string;
  description: string | null;
  mode: "COMPREHENSION" | "DICTATION";
  track?: string;
  levels?: string[];
  topics?: string[];
  accents?: string[];
  questionCount?: number;
  durationMinutes?: number | null;
  isCompleted?: boolean;
  _count?: {
    questions: number;
  };
  questionsCount?: number;
  bilingualContent?: any;
}

export interface CheckPracticeQuestionResult {
  questionId: number;
  isCorrect: boolean;
  submittedAnswer: string;
  correctAnswer: string;
  explanation: QuestionExplanation | null;
  translation: string | null;
}

export const quizService = {
  getListeningPractices: async (): Promise<ListeningPracticeCatalogItem[]> => {
    return await axiosClient.get("/quizzes/listening-practice");
  },

  getToeicPapers: async (): Promise<Quiz[]> => {
    return await axiosClient.get("/quizzes/toeic-papers");
  },

  getQuizById: async (id: number): Promise<Quiz> => {
    return await axiosClient.get(`/quizzes/${id}`);
  },

  getQuestionAudioBlob: async (
    quizId: number,
    questionId: number,
    signal?: AbortSignal,
  ): Promise<Blob> => {
    return await axiosClient.get(
      `/quizzes/${quizId}/questions/${questionId}/audio`,
      { responseType: "blob", signal },
    );
  },

  checkPracticeQuestion: async (
    quizId: number,
    questionId: number,
    answer: string,
  ): Promise<CheckPracticeQuestionResult> => {
    return await axiosClient.post(
      `/quizzes/${quizId}/questions/${questionId}/check`,
      { answer },
    );
  },

  submitQuiz: async (id: number, answers: AnswerDto[]): Promise<SubmissionResult> => {
    return await axiosClient.post(`/quizzes/${id}/submit`, { answers });
  },

  getAnalytics: async (submissionId: number): Promise<SubmissionAnalytics> => {
    return await axiosClient.get(`/quizzes/submissions/${submissionId}/analytics`);
  },
};
