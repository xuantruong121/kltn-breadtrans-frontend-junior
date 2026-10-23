import axiosClient from "../axiosClient";

export type AdminExamDetail = {
  id: number;
  title: string;
  description?: string | null;
  familyCode?: string;
  variantCode?: string;
  publicationStatus: "DRAFT" | "PUBLISHED";
  durationSeconds?: number;
  totalQuestions?: number;
  totalGroups?: number;
  attemptsCount?: number;
  learnerReady?: boolean;
  aiGenerationJobId?: string | null;
  groups: Array<{
    id: number;
    part: number;
    questions: Array<{ id: number }>;
  }>;
  validation?: {
    issues: Array<{ groupId?: number; questionId?: number; humanMessage?: string; message?: string }>;
  };
  readiness?: {
    listeningReading?: boolean;
    speaking?: boolean;
    writing?: boolean;
    speakingCount?: number;
    speakingExpected?: number;
    writingCount?: number;
    writingExpected?: number;
  };
  readinessSummary?: Array<{
    key: string;
    label: string;
    state: "READY" | "WARNING" | "INCOMPLETE";
    issueCount: number;
  }>;
  assessment?: {
    id: number;
    productFamily: string;
    components: Array<{ id: number; kind: string; order: number; sourceId: number | string | null }>;
  } | null;
};

export const adminExamService = {
  async getById(id: number): Promise<AdminExamDetail> {
    return (await axiosClient.get(
      `/admin/exams/${id}`,
    )) as unknown as AdminExamDetail;
  },

  async publish(id: number) {
    return axiosClient.post(`/admin/exams/${id}/publish`);
  },

  async unpublish(id: number) {
    return axiosClient.post(`/admin/exams/${id}/unpublish`);
  },

  async duplicate(id: number) {
    return axiosClient.post(`/admin/exams/${id}/duplicate`);
  },
};
