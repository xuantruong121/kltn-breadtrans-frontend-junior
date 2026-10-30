import axiosClient from "../axiosClient";
import type { LearnerProfile } from "@/lib/learning-path/onboarding";

export const learningPathService = {
  getProfile: (): Promise<LearnerProfile> => axiosClient.get("/learning-path/profile"),
  updateProfile: (body: Record<string, unknown>): Promise<LearnerProfile> =>
    axiosClient.put("/learning-path/profile", body),
};
