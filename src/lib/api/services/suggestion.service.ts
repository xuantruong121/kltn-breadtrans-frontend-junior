import axiosClient from "../axiosClient";

export type SuggestionCategory = "FEATURE" | "CONTENT" | "UI" | "BUG" | "OTHER";
export type SuggestionStatus = "PENDING" | "REVIEWING" | "RESPONDED" | "RESOLVED" | "REJECTED";
export type SuggestionAttachmentType = "IMAGE" | "FILE" | "LINK";

export interface SuggestionAttachment {
  id?: number;
  type: SuggestionAttachmentType;
  name: string;
  url: string;
  createdAt?: string;
}

export interface SuggestionItem {
  id: number;
  category: SuggestionCategory;
  content: string;
  status: SuggestionStatus;
  adminResponse?: string | null;
  respondedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  attachments: SuggestionAttachment[];
  user?: {
    id: number;
    email: string;
    profile?: { fullName: string; avatar?: string | null } | null;
  };
}

export interface SuggestionListResponse {
  data: SuggestionItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const suggestionService = {
  create: async (input: Pick<SuggestionItem, "category" | "content" | "attachments">) =>
    (await axiosClient.post<SuggestionItem>("/suggestions", input)) as unknown as SuggestionItem,
  listMine: async (params?: { page?: number; limit?: number; status?: SuggestionStatus }) =>
    (await axiosClient.get<SuggestionListResponse>("/suggestions/me", { params })) as unknown as SuggestionListResponse,
  getMine: async (id: number) =>
    (await axiosClient.get<SuggestionItem>(`/suggestions/${id}`)) as unknown as SuggestionItem,
  uploadAttachment: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return (await axiosClient.post<SuggestionAttachment>("/suggestions/attachments", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })) as unknown as SuggestionAttachment;
  },
  listAdmin: async (params?: {
    page?: number;
    limit?: number;
    status?: SuggestionStatus;
    category?: SuggestionCategory;
    search?: string;
    sort?: "newest" | "oldest";
  }) =>
    (await axiosClient.get<SuggestionListResponse>("/admin/suggestions", { params })) as unknown as SuggestionListResponse,
  getAdmin: async (id: number) =>
    (await axiosClient.get<SuggestionItem>(`/admin/suggestions/${id}`)) as unknown as SuggestionItem,
  updateAdmin: async (id: number, input: { status?: SuggestionStatus; adminResponse?: string }) =>
    (await axiosClient.patch<SuggestionItem>(`/admin/suggestions/${id}`, input)) as unknown as SuggestionItem,
};
