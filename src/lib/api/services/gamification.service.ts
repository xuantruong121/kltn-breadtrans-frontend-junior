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

export const gamificationService = {
  getMyBadges: async (): Promise<UserBadge[]> => {
    return await axiosClient.get("/gamification/badges/me");
  },
  
  getLeaderboard: async (): Promise<LeaderboardEntry[]> => {
    return await axiosClient.get("/gamification/leaderboard");
  },
};
