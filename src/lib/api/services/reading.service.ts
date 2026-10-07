import axiosClient from "../axiosClient";

export interface ReadingTopicQuiz {
  id: number;
  title: string;
  description?: string;
  type?: string;
  timeLimit?: number;
  questionCount?: number;
  courseId?: number | null;
  isPremiumContent?: boolean;
  isLocked?: boolean;
  _count?: {
    questions: number;
  };
}

export interface ReadingTopic {
  id: number;
  title: string;
  description: string;
  imageUrl?: string;
  isPremiumContent?: boolean;
  isLocked?: boolean;
  quizzes?: ReadingTopicQuiz[];
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
  getTopics: async (): Promise<ReadingTopic[]> => {
    return await axiosClient.get("/reading/topics?category=BILINGUAL_LEVEL");
  },

  getTopicById: async (id: number): Promise<ReadingTopic> => {
    return await axiosClient.get(`/reading/topics/${id}`);
  },

  getTheory: async (quizId: number): Promise<any> => {
    return await axiosClient.get(`/reading/quizzes/${quizId}/theory`);
  },

  getTracking: async (): Promise<ReadingTracking> => {
    return await axiosClient.get("/reading/tracking");
  },
};
