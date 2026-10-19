import axiosClient from "../axiosClient";

export type LearnerExamProduct = {
  id: number;
  title: string;
  description?: string | null;
  familyCode: string;
  variantCode: string;
  runtimeId?: number | null;
  publicationStatus: "PUBLISHED";
  learnerReady: boolean;
  totalQuestions?: number;
  durationSeconds?: number;
};

export const examService = {
  async getPublished(): Promise<LearnerExamProduct[]> {
    return (await axiosClient.get("/exams")) as unknown as LearnerExamProduct[];
  },
};
