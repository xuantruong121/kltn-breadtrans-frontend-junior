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
  variant?: string;
  totalGroups?: number;
  assessment?: {
    id: number;
    productFamily: string;
    components: Array<{
      id: number;
      kind: string;
      order: number;
      required: boolean;
      sourceId: number | string | null;
    }>;
  } | null;
};

export const examService = {
  async getPublished(): Promise<LearnerExamProduct[]> {
    return (await axiosClient.get("/exams")) as unknown as LearnerExamProduct[];
  },

  async getById(id: number): Promise<LearnerExamProduct> {
    return (await axiosClient.get(`/exams/${id}`)) as unknown as LearnerExamProduct;
  },
};
