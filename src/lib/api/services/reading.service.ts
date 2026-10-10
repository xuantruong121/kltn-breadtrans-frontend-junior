import axiosClient from "../axiosClient";

export type ReadingExerciseCompletionStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "COMPLETED";

export interface ReadingExercise {
  quizId: number;
  title: string;
  description?: string | null;
  level: string;
  difficulty: "BASIC" | "INTERMEDIATE" | "ADVANCED";
  questionCount: number;
  estimatedMinutes?: number | null;
  parentTopicId?: number | null;
  topicName?: string | null;
  topicVietnameseName?: string | null;
  microSkills: string[];
  isPremiumContent: boolean;
  isLocked: boolean;
  completionStatus: ReadingExerciseCompletionStatus;
  completedQuestionCount: number;
}

export interface ReadingTracking {
  progress: {
    completedExercises: number;
    completedAttempts: number;
    accuracy: number;
    recentAverage: number;
    lastPracticedAt: string | null;
    currentStreak: number;
  };
  subskills: Array<{
    key: string;
    attempted: number;
    correct: number;
    accuracy: number;
    status: "INSUFFICIENT_DATA" | "NEEDS_IMPROVEMENT" | "PROGRESSING" | "GOOD";
    statusLabel: string;
  }>;
  recentAttempts: Array<{
    submissionId: number;
    quizId: number;
    quizTitle: string;
    correct: number;
    total: number;
    accuracy: number;
    submittedAt: string;
  }>;
  recentTrend: {
    direction: "INSUFFICIENT_DATA" | "IMPROVING" | "DECLINING" | "STABLE";
    delta: number | null;
    attempts: ReadingTracking["recentAttempts"];
  };
  mistakes: {
    total: number;
    bySubskill: Array<{ subskill: string; count: number }>;
    items: Array<{
      quizId?: number;
      topicId?: number | null;
      questionId?: number;
      question: string;
      yourAnswer: string;
      correctAnswer: string | null;
      answerAvailable: boolean;
      explanation: string | null;
      subskill: string;
      source: string;
      date: string;
      status: "NEEDS_REVIEW";
    }>;
  };
  recommendation: {
    subskill: string;
    reason: string;
    quizId: number;
    title: string;
    isLocked: boolean;
  } | null;
  sampleSize: number;
}

export const readingService = {
  getExercises: async (): Promise<ReadingExercise[]> => {
    return await axiosClient.get("/reading/exercises");
  },

  getTheory: async (quizId: number): Promise<any> => {
    return await axiosClient.get(`/reading/quizzes/${quizId}/theory`);
  },

  getTracking: async (): Promise<ReadingTracking> => {
    return await axiosClient.get("/reading/tracking");
  },
};
