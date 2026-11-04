import axiosClient from "../axiosClient";
import type {
  ConfirmationMethod,
  GroupReview,
  GroupReviewStatus,
} from "@/lib/examAi/answerReview";

export type ExamAiCandidateQuestion = {
  questionNumber: number;
  text: string | null;
  options: string[];
  correctIndex: number;
  explanation: string | null;
  issues: string[];
};

export type ExamAiCandidateGroup = {
  /** Written by the stand-in provider, so it deserves a closer look. */
  standIn?: boolean;
  candidateKey: string;
  part: number;
  groupOrder: number;
  transcript: string | null;
  passageText: string | null;
  imageBrief: string | null;
  issues: string[];
  questions: ExamAiCandidateQuestion[];
  applied: boolean;
  /** Null for Part 1: its photo, and so its review, come after Apply. */
  reviewStatus?: GroupReviewStatus | null;
  review?: GroupReview | null;
  contentHash?: string;
  /** Recomputed by the server from the current content. */
  applyDecision?: { ok: boolean; reason: string };
};

export type ExamAiSkipped = { candidateKey: string; reason: string };

export type ExamAiCandidateTask = {
  email?: string | null;
  candidateKey: string;
  taskNumber: number;
  title: string | null;
  targetText?: string | null;
  prompt?: string | null;
  issues: string[];
  applied: boolean;
};

export type ExamAiFailedUnit = {
  batchKey: string;
  part: number;
  offset: number;
  groupOrder: number;
  code: "CONTENT_CONTRACT_FAILURE" | "ANSWER_REVIEW_FAILED";
  message: string;
  attempts: number;
};

export type ExamAiCandidate = {
  standIn?: boolean;
  lrGroups: ExamAiCandidateGroup[];
  speaking: ExamAiCandidateTask[];
  writing: ExamAiCandidateTask[];
  failedUnits: ExamAiFailedUnit[];
  flaggedCount: number;
  appliedCandidateKeys: string[];
};

export type ExamAiJobStatus = {
  missingMedia?: Array<{ label: string; brief: string | null }>;
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
  ): Promise<ExamAiJobStatus & { skipped?: ExamAiSkipped[] }> {
    return (await axiosClient.post(
      `/admin/exams/ai/jobs/${jobId}/apply`,
      selectedCandidateKeys ? { selectedCandidateKeys } : {},
    )) as unknown as ExamAiJobStatus & { skipped?: ExamAiSkipped[] };
  },

  async confirmGroup(
    jobId: string,
    candidateKey: string,
    method: ConfirmationMethod,
  ): Promise<ExamAiCandidate> {
    return (await axiosClient.post(
      `/admin/exams/ai/jobs/${jobId}/candidates/${candidateKey}/confirm`,
      { method },
    )) as unknown as ExamAiCandidate;
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
