import axiosClient from "../axiosClient";
import type { GateAttempt, GateResult, GateStatus } from "@/lib/learning-path/levelLock";
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
  getGate: (skill: PracticeSkill): Promise<GateStatus> => axiosClient.get(`/learning-path/gates/${skill}`),
  startGate: (skill: PracticeSkill): Promise<GateAttempt> => axiosClient.post(`/learning-path/gates/${skill}/start`),
  submitGate: (attemptId: number, answers: Record<string, string>): Promise<GateResult> =>
    axiosClient.post(`/learning-path/gates/attempts/${attemptId}/submit`, { answers }),
  getGateAudio: (attemptId: number, questionId: number): Promise<Blob> =>
    axiosClient.get(`/quizzes/gate-attempts/${attemptId}/questions/${questionId}/audio`, { responseType: "blob" }),
  save: (contentType: LearningContentType, contentId: number): Promise<{ saved: boolean }> =>
    axiosClient.post("/learning-path/items/save", { contentType, contentId }),
  unsave: (contentType: LearningContentType, contentId: number): Promise<{ saved: boolean }> =>
    axiosClient.delete(`/learning-path/items/${contentType}/${contentId}`),
};
