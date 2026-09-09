import axiosClient from "../axiosClient";

export interface UserProfile {
  id: number;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  profile?: {
    id: number;
    fullName: string;
    avatar?: string;
    avatarUrl?: string;
    bio?: string;
    dateOfBirth?: string;
    phoneNumber?: string;
    address?: string;
  };
  stats?: {
    totalBanhRan: number;
    [key: string]: any;
  };
}

export interface UserLearningStats {
  streakCount: number;
  streakFreezes: number;
  totalBanhRan: number;
  quizAccuracy: number;
  speakingAccuracy: number;
  totalPoints: number;
  weeklyExp: number;
  tier: string;
  masteredVocabCount: number;
  totalQuizzesDone: number;
}

export interface LearningActivity {
  id: number;
  type: string;
  title: string;
  detail: string | null;
  score: number | null;
  durationSec: number | null;
  occurredAt: string;
}

export interface LearningHistoryResponse {
  activities: LearningActivity[];
  summary: {
    completedCount: number;
    streakCount: number;
    latestDiagnostic: { level: string; percentage: number; submittedAt: string } | null;
    byType: Array<{ type: string; count: number; averageScore: number | null }>;
  };
}

export const userService = {
  getProfile: async (): Promise<UserProfile> => {
    return await axiosClient.get("/users/profile");
  },

  getStats: async (): Promise<UserLearningStats> => {
    return await axiosClient.get("/users/stats");
  },
  getLearningHistory: async (type?: string): Promise<LearningHistoryResponse> =>
    axiosClient.get(`/users/learning-history${type && type !== "ALL" ? `?type=${encodeURIComponent(type)}` : ""}`),
};
