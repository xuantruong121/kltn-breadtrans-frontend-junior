import axiosClient from "../axiosClient";

export interface Badge {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  criteria: any;
  points: number;
}

export interface UserBadge {
  id: number;
  badgeId: number;
  userId: number;
  earnedAt: string;
  badge: Badge;
}

export interface LeaderboardEntry {
  rank: number;
  userId: number;
  displayName: string;
  avatarUrl: string | null;
  weeklyExp: number;
  totalPoints: number;
  tier: string;
  isCurrentUser?: boolean;
}

export interface LeaderboardCurrentUserRank {
  rank: number;
  userId: number;
  displayName: string;
  avatarUrl: string | null;
  tier: string;
  totalPoints: number;
  weeklyExp: number;
  isCurrentUser: boolean;
}

export interface LeaderboardResponse {
  tier: string;
  scope: string;
  entries: LeaderboardEntry[];
  currentUserRank: LeaderboardCurrentUserRank | null;
}

export interface Pet {
  id: number;
  name: string;
  health: number;
  happiness: number;
  level: number;
  exp: number;
  lastFedAt: string | null;
  roster?: Record<
    string,
    {
      level: number;
      exp: number;
      health: number;
      happiness: number;
      lastFedAt: string | null;
    }
  > | null;
}

export interface DailyQuest {
  id: number;
  title: string;
  description: string | null;
  targetValue: number;
  type: string;
  rewardXP: number;
  rewardBanh: number;
}

export interface QuestProgress {
  id: number;
  questId: number;
  currentValue: number;
  isCompleted: boolean;
  quest: DailyQuest;
}

export interface TodayQuestItem {
  id: number;
  questId: number;
  title?: string;
  description?: string | null;
  type?: string;
  currentValue: number;
  targetValue?: number;
  rewardXP?: number;
  rewardBanh?: number;
  isCompleted: boolean;
  progressPercent?: number;
  actionLabel?: string;
  actionUrl?: string;
  quest?: DailyQuest;
}

export interface LearningActivityItem {
  id: number;
  userId: number;
  type: string;
  targetId?: number | null;
  metadata?: any;
  occurredAt: string;
  createdAt?: string;
}

export interface DashboardTodayResponse {
  dateKey: string;
  timezone: string;
  timeZone?: string;
  quests: TodayQuestItem[];
  activities: LearningActivityItem[];
  summary: {
    completedCount: number;
    totalCount: number;
    progressPercent: number;
    earnedXp: number;
    earnedBanh: number;
  };
}

export interface ArenaSnippet {
  rank: number | null;
  tier: string;
  message: string;
}

export const gamificationService = {
  getMyBadges: async (): Promise<UserBadge[]> => {
    return await axiosClient.get("/gamification/badges/me");
  },
  
  getLeaderboard: async (tier?: string, scope?: string): Promise<LeaderboardResponse> => {
    return await axiosClient.get("/gamification/leaderboard", {
      params: { tier, scope },
    });
  },

  getDashboardToday: async (): Promise<DashboardTodayResponse> => {
    return await axiosClient.get("/gamification/dashboard/today");
  },

  getMyPet: async (): Promise<Pet> => {
    return await axiosClient.get("/gamification/pet");
  },

  feedPet: async (): Promise<Pet> => {
    return await axiosClient.post("/gamification/pet/feed");
  },

  changePetType: async (petName: string): Promise<Pet> => {
    return await axiosClient.post("/gamification/pet/change-type", { petName });
  },

  getMyDailyQuests: async (): Promise<QuestProgress[]> => {
    return await axiosClient.get("/gamification/quests");
  },

  getArenaSnippet: async (): Promise<ArenaSnippet> => {
    return await axiosClient.get("/gamification/arena/snippet");
  },
};
