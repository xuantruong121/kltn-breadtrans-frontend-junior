import axiosClient from "../axiosClient";

export type IssueReportArea =
  | "LISTENING"
  | "SPEAKING"
  | "READING"
  | "WRITING"
  | "VOCABULARY"
  | "GRAMMAR"
  | "TOEIC"
  | "COURSE"
  | "DASHBOARD"
  | "MARKET"
  | "PET"
  | "AUTH"
  | "ADMIN"
  | "OTHER";
export type IssueReportCategory =
  | "CONTENT_ERROR"
  | "ANSWER_ERROR"
  | "EXPLANATION_ERROR"
  | "AUDIO_ERROR"
  | "IMAGE_ERROR"
  | "SCORING_ERROR"
  | "TECHNICAL_ERROR"
  | "ACCESSIBILITY"
  | "OTHER";
export type IssueReportImpact = "NON_BLOCKING" | "BLOCKING";
export type IssueReportStatus =
  "NEW" | "IN_REVIEW" | "RESOLVED" | "REJECTED" | "DUPLICATE";

export interface CreateIssueReportInput {
  area: IssueReportArea;
  category: IssueReportCategory;
  impact: IssueReportImpact;
  description: string;
  route?: string;
  sourceType?: string;
  sourceId?: string | number;
  questionId?: number;
  context?: Record<string, unknown>;
}

export interface IssueReportItem {
  id: number;
  reportCode: string;
  area: IssueReportArea;
  category: IssueReportCategory;
  impact: IssueReportImpact;
  status: IssueReportStatus;
  description: string;
  route?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  questionId?: number | null;
  context?: Record<string, unknown> | null;
  resolutionNote?: string | null;
  createdAt: string;
  updatedAt: string;
  reporter?: {
    id: number;
    email: string;
    profile?: { fullName: string; avatar?: string | null } | null;
  };
  assignedAdmin?: {
    id: number;
    email: string;
    profile?: { fullName: string } | null;
  } | null;
}

export interface IssueReportListResponse {
  data: IssueReportItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  counts: Partial<Record<IssueReportStatus, number>>;
}

export const issueReportService = {
  create: async (input: CreateIssueReportInput) =>
    (await axiosClient.post<{
      reportCode: string;
      status: IssueReportStatus;
      message: string;
    }>("/issue-reports", input)) as unknown as {
      reportCode: string;
      status: IssueReportStatus;
      message: string;
    },
  list: async (params?: {
    page?: number;
    limit?: number;
    status?: IssueReportStatus;
    area?: IssueReportArea;
    category?: IssueReportCategory;
    search?: string;
  }) =>
    (await axiosClient.get<IssueReportListResponse>("/admin/issue-reports", {
      params,
    })) as unknown as IssueReportListResponse,
  get: async (id: number) =>
    (await axiosClient.get<IssueReportItem>(
      `/admin/issue-reports/${id}`,
    )) as unknown as IssueReportItem,
  update: async (
    id: number,
    input: {
      status?: IssueReportStatus;
      resolutionNote?: string;
      assignedAdminId?: number;
    },
  ) =>
    (await axiosClient.patch<IssueReportItem>(
      `/admin/issue-reports/${id}`,
      input,
    )) as unknown as IssueReportItem,
};
