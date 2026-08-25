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
  userId: number;
  fullName: string;
  avatarUrl: string | null;
  totalPoints: number;
  rank: number;
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

export interface ArenaSnippet {
  rank: number | null;
  tier: string;
  message: string;
}

export const gamificationService = {
  getMyBadges: async (): Promise<UserBadge[]> => {
    return await axiosClient.get("/gamification/badges/me");
  },
  
  getLeaderboard: async (): Promise<LeaderboardEntry[]> => {
    return await axiosClient.get("/gamification/leaderboard");
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

  recordVocabLearned: async (count: number = 1): Promise<{ success: boolean; count: number }> => {
    return await axiosClient.post("/gamification/vocab-learned", { count });
  },

  getArenaSnippet: async (): Promise<ArenaSnippet> => {
    return await axiosClient.get("/gamification/arena/snippet");
  },
};
