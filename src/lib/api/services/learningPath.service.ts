import axiosClient from "../axiosClient";
import type { LearnerProfile } from "@/lib/learning-path/onboarding";
import type { PracticeSkill } from "@/lib/learning-path/practiceLevel";
import type { LearningContentType, RecommendationItem, TodayPlan } from "@/lib/learning-path/recommendation";

export const learningPathService = {
  getProfile: (): Promise<LearnerProfile> => axiosClient.get("/learning-path/profile"),
  updateProfile: (body: Record<string, unknown>): Promise<LearnerProfile> =>
    axiosClient.put("/learning-path/profile", body),
  getToday: (): Promise<TodayPlan> => axiosClient.get("/learning-path/today"),
  getRecommended: (skill: PracticeSkill): Promise<RecommendationItem[]> =>
    axiosClient.get(`/learning-path/skills/${skill}/recommended`),
  save: (contentType: LearningContentType, contentId: number): Promise<{ saved: boolean }> =>
    axiosClient.post("/learning-path/items/save", { contentType, contentId }),
  unsave: (contentType: LearningContentType, contentId: number): Promise<{ saved: boolean }> =>
    axiosClient.delete(`/learning-path/items/${contentType}/${contentId}`),
};
