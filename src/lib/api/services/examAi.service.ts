import axiosClient from "../axiosClient";

export type ExamAiCandidateQuestion = {
  questionNumber: number;
  text: string | null;
  options: string[];
  correctIndex: number;
  explanation: string | null;
  issues: string[];
};

export type ExamAiCandidateGroup = {
  candidateKey: string;
  part: number;
  groupOrder: number;
  transcript: string | null;
  passageText: string | null;
  imageBrief: string | null;
  issues: string[];
  questions: ExamAiCandidateQuestion[];
  applied: boolean;
};

export type ExamAiCandidateTask = {
  candidateKey: string;
  taskNumber: number;
  title: string | null;
  targetText?: string | null;
  prompt?: string | null;
  issues: string[];
  applied: boolean;
};

export type ExamAiCandidate = {
  lrGroups: ExamAiCandidateGroup[];
  speaking: ExamAiCandidateTask[];
  writing: ExamAiCandidateTask[];
  flaggedCount: number;
  appliedCandidateKeys: string[];
};

export type ExamAiJobStatus = {
  id: string;
  status:
    | "QUEUED"
    | "PROCESSING"
    | "GENERATED"
    | "FAILED"
    | "APPROVED"
    | "PUBLISHING"
    | "PUBLISHED"
    | "CANCELLED";
  examId?: number | null;
  progress?: unknown;
  error?: string | null;
};

export const examAiService = {
  async status(jobId: string): Promise<ExamAiJobStatus> {
    return (await axiosClient.get(
      `/admin/exams/ai/jobs/${jobId}`,
    )) as unknown as ExamAiJobStatus;
  },

  async getCandidate(jobId: string): Promise<ExamAiCandidate> {
    return (await axiosClient.get(
      `/admin/exams/ai/jobs/${jobId}/candidate`,
    )) as unknown as ExamAiCandidate;
  },

  async updateCandidate(
    jobId: string,
    candidateKey: string,
    patch: Record<string, unknown>,
  ): Promise<ExamAiCandidate> {
    return (await axiosClient.patch(
      `/admin/exams/ai/jobs/${jobId}/candidate`,
      { candidateKey, patch },
    )) as unknown as ExamAiCandidate;
  },

  async apply(
    jobId: string,
    selectedCandidateKeys?: string[],
  ): Promise<ExamAiJobStatus> {
    return (await axiosClient.post(
      `/admin/exams/ai/jobs/${jobId}/apply`,
      selectedCandidateKeys ? { selectedCandidateKeys } : {},
    )) as unknown as ExamAiJobStatus;
  },

  async regenerateGroup(
    jobId: string,
    candidateKey: string,
  ): Promise<ExamAiCandidate> {
    return (await axiosClient.post(
      `/admin/exams/ai/jobs/${jobId}/candidate/${candidateKey}/regenerate`,
    )) as unknown as ExamAiCandidate;
  },

  async regeneratePart(jobId: string, part: number): Promise<ExamAiCandidate> {
    return (await axiosClient.post(
      `/admin/exams/ai/jobs/${jobId}/candidate/parts/${part}/regenerate`,
    )) as unknown as ExamAiCandidate;
  },

  async retry(jobId: string): Promise<ExamAiJobStatus> {
    return (await axiosClient.post(
      `/admin/exams/ai/jobs/${jobId}/retry`,
    )) as unknown as ExamAiJobStatus;
  },

  async cancel(jobId: string): Promise<ExamAiJobStatus> {
    return (await axiosClient.post(
      `/admin/exams/ai/jobs/${jobId}/cancel`,
    )) as unknown as ExamAiJobStatus;
  },
};
