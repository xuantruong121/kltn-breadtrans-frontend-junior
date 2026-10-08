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
    targetScore?: string;
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
  totalToeicTestsDone?: number;
  hasCompletedPlacementTest?: boolean;
  latestDiagnostic?: {
    level: string;
    percentage: number;
    submittedAt: string;
  } | null;
}

export interface LearningActivity {
  id: number;
  type: string;
  title: string;
  detail: string | null;
  score: number | null;
  durationSec: number | null;
  sourceType?: string | null;
  sourceId?: string | null;
  occurredAt: string;
}

export interface LearningHistoryResponse {
  activities: LearningActivity[];
  summary: {
    completedCount: number;
    streakCount: number;
    latestDiagnostic: {
      level: string;
      percentage: number;
      submittedAt: string;
    } | null;
    byType: Array<{ type: string; count: number; averageScore: number | null }>;
  };
}

export interface SkillProgressSummary {
  skill: "LISTENING" | "READING" | "SPEAKING" | "WRITING";
  title: string;
  categoryLabel: string;
  totalItems: number;
  completedItems: number;
  progressPercent: number;
  levelRange: string;
  badge: string;
  unitLabel: string;
  totalExercises?: number;
  completedExercises?: number;
  completedAttempts?: number;
  normalizedScore?: number | null;
  recentAverage?: number | null;
  trend?: "IMPROVING" | "DECLINING" | "STABLE" | "INSUFFICIENT_DATA";
  strongestDimension?: string | null;
  weakestDimension?: string | null;
  lastPracticedAt?: string | null;
  status?: "INSUFFICIENT_DATA" | "NEEDS_IMPROVEMENT" | "PROGRESSING" | "GOOD";
  statusLabel?: string;
  hasEnoughData?: boolean;
  dimensions?: Array<{
    key: string;
    sampleCount: number;
    averageScore: number | null;
    status: string;
    statusLabel: string;
  }>;
}

export interface OverallSkillsProgress {
  completedItems: number;
  totalItems: number;
  progressPercent: number;
  normalizedScore?: number | null;
  recentAverage?: number | null;
  trend?: "IMPROVING" | "DECLINING" | "STABLE" | "INSUFFICIENT_DATA";
  currentStreak?: number;
}

export interface UserSkillsSummaryResponse {
  skills: SkillProgressSummary[];
  overall: OverallSkillsProgress;
}

export type DailyPracticeSkill = "LISTENING" | "READING" | "SPEAKING" | "WRITING";
export type DailyPracticeReasonCode =
  | "BALANCED_START"
  | "WEAKEST_SKILL"
  | "WEAKEST_DIMENSION"
  | "NEEDS_MORE_DATA"
  | "NOT_PRACTICED_RECENTLY"
  | "DECLINING_TREND"
  | "MAINTENANCE"
  | "ACCESS_LOCKED";

export interface DailyPracticeItem {
  skill: DailyPracticeSkill;
  exerciseId: number;
  title: string;
  route: string;
  estimatedMinutes: number;
  reasonCode: DailyPracticeReasonCode;
  reasonLabel: string;
  isLocked: boolean;
  isCompleted: boolean;
  priority: number;
  dimension: string | null;
}

export interface DailyPracticeResponse {
  dateKey: string;
  generatedAt: string;
  estimatedMinutes: number;
  targetActivities: number;
  completedCount: number;
  reasonSummary: string;
  items: DailyPracticeItem[];
}

export const userService = {
  getProfile: async (): Promise<UserProfile> => {
    return await axiosClient.get("/users/profile");
  },

  getStats: async (): Promise<UserLearningStats> => {
    return await axiosClient.get("/users/stats");
  },

  getSkillsSummary: async (): Promise<UserSkillsSummaryResponse> => {
    return await axiosClient.get("/users/skills-summary");
  },

  getSkillProgress: async (): Promise<UserSkillsSummaryResponse> => {
    return await axiosClient.get("/users/me/skill-progress");
  },

  getDailyPractice: async (): Promise<DailyPracticeResponse> => {
    return await axiosClient.get("/users/me/daily-practice");
  },

  getLearningHistory: async (type?: string): Promise<LearningHistoryResponse> =>
    axiosClient.get(
      `/users/learning-history${type && type !== "ALL" ? `?type=${encodeURIComponent(type)}` : ""}`,
    ),
};
