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
  transcriptSegments?: Array<{
    speaker: string;
    text: string;
    translation?: string;
    startMs?: number;
    endMs?: number;
  }>;
  category?: string;
  section?: string;
}

export interface Question {
  id: number;
  quizId: number;
  type: string; // "MULTIPLE_CHOICE", "WRITING", etc.
  content: QuestionContent | any;
  order: number;
  audioAssets?: Array<{
    id: number;
    version: number;
    url: string;
    mimeType: string;
    durationMs?: number | null;
    isActive: boolean;
  }>;
  diagnosticClips?: Array<{
    id: number;
    label: string;
    url: string;
    startMs?: number | null;
    endMs?: number | null;
  }>;
}

export interface Quiz {
  id: number;
  title: string;
  description: string;
  type: string; // e.g. "LISTENING_PRACTICE"
  bilingualContent?: {
    examFormat?: "TOEIC_LR" | "TOEIC_SW" | "TOEIC_4_SKILLS" | "TWO_SKILL" | "SPEAKING_WRITING" | "FOUR_SKILL";
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
  quizId: number;
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
  mode: "COMPREHENSION" | "DICTATION" | "DIALOGUE";
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
  evaluationMode?: "STANDARD" | "STRICT";
  wordAccuracy?: number;
  explanation: QuestionExplanation | null;
  translation: string | null;
}

export interface ListeningPracticeAttempt {
  id: number;
  quizId: number;
  currentQuestionId: number | null;
  answers: Record<string, string>;
  questionStates: Record<string, unknown>;
  status: "IN_PROGRESS" | "COMPLETED" | "ABANDONED";
  startedAt: string;
  updatedAt: string;
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
    audioVersion?: number,
  ): Promise<Blob> => {
    const versionQuery = Number.isFinite(audioVersion)
      ? `?v=${audioVersion}`
      : "";
    return await axiosClient.get(
      `/quizzes/${quizId}/questions/${questionId}/audio${versionQuery}`,
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

  getOrCreateListeningAttempt: async (
    quizId: number,
  ): Promise<ListeningPracticeAttempt> => {
    return await axiosClient.post(`/quizzes/${quizId}/listening-attempts`);
  },

  saveListeningAttempt: async (
    quizId: number,
    attemptId: number,
    payload: {
      currentQuestionId?: number;
      answers?: Record<string, string>;
      questionStates?: Record<string, unknown>;
    },
  ): Promise<ListeningPracticeAttempt> => {
    return await axiosClient.patch(
      `/quizzes/${quizId}/listening-attempts/${attemptId}`,
      payload,
    );
  },

  cancelListeningAttempt: async (
    quizId: number,
    attemptId: number,
  ): Promise<{ id: number; status: string; discarded: boolean }> => {
    return await axiosClient.post(
      `/quizzes/${quizId}/listening-attempts/${attemptId}/cancel`,
    );
  },

  submitQuiz: async (
    id: number,
    answers: AnswerDto[],
    attemptId?: number,
  ): Promise<SubmissionResult> => {
    return await axiosClient.post(`/quizzes/${id}/submit`, {
      answers,
      ...(attemptId ? { attemptId } : {}),
    });
  },

  getAnalytics: async (submissionId: number): Promise<SubmissionAnalytics> => {
    return await axiosClient.get(`/quizzes/submissions/${submissionId}/analytics`);
  },
};
