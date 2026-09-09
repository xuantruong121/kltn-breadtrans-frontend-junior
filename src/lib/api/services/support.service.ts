import axiosClient from "../axiosClient";

export interface SupportMessageItem {
  id: number | string;
  conversationId: number;
  senderUserId: number | null;
  senderRole: "STUDENT" | "ADMIN" | "AI" | "SYSTEM";
  senderName: string | null;
  content: string;
  clientMessageId?: string | null;
  isRead: boolean;
  createdAt: string | number;
}

export interface SupportConversationSummary {
  id: number;
  studentId: number;
  studentName: string;
  studentEmail?: string;
  studentAvatar?: string;
  mode: "AI" | "HUMAN";
  status: string;
  unreadCount: number;
  lastMessageTime: number;
  lastMessage?: {
    id: number;
    content: string;
    role: string;
    timestamp: number;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupportPaginatedMessages {
  data: SupportMessageItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  mode: "AI" | "HUMAN";
}

export interface SupportPaginatedConversations {
  data: SupportConversationSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const supportService = {
  // Student endpoints
  getMyConversation: (): Promise<SupportConversationSummary> =>
    axiosClient.get("/support/conversations/me"),

  getMessages: (
    conversationId: number,
    page = 1,
    limit = 50,
  ): Promise<SupportPaginatedMessages> =>
    axiosClient.get(`/support/conversations/${conversationId}/messages`, {
      params: { page, limit },
    }),

  sendMessage: (
    conversationId: number,
    content: string,
    clientMessageId?: string,
  ): Promise<SupportMessageItem> =>
    axiosClient.post(`/support/conversations/${conversationId}/messages`, {
      content,
      clientMessageId,
    }),

  saveAiMessage: (
    conversationId: number,
    content: string,
    clientMessageId?: string,
  ): Promise<SupportMessageItem> =>
    axiosClient.post(`/support/conversations/${conversationId}/ai-messages`, {
      content,
      clientMessageId,
    }),

  toggleMode: (
    conversationId: number,
    mode: "AI" | "HUMAN",
  ): Promise<{ id: number; mode: "AI" | "HUMAN" }> =>
    axiosClient.patch(`/support/conversations/${conversationId}/mode`, { mode }),

  // Admin endpoints
  getAdminConversations: (
    page = 1,
    limit = 50,
  ): Promise<SupportPaginatedConversations> =>
    axiosClient.get("/admin/support/conversations", {
      params: { page, limit },
    }),

  getAdminConversation: (
    conversationId: number,
  ): Promise<SupportConversationSummary> =>
    axiosClient.get(`/admin/support/conversations/${conversationId}`),

  getAdminMessages: (
    conversationId: number,
    page = 1,
    limit = 50,
  ): Promise<SupportPaginatedMessages> =>
    axiosClient.get(`/admin/support/conversations/${conversationId}/messages`, {
      params: { page, limit },
    }),

  sendAdminMessage: (
    conversationId: number,
    content: string,
    clientMessageId?: string,
  ): Promise<SupportMessageItem> =>
    axiosClient.post(`/admin/support/conversations/${conversationId}/messages`, {
      content,
      clientMessageId,
    }),

  toggleAdminMode: (
    conversationId: number,
    mode: "AI" | "HUMAN",
  ): Promise<{ id: number; mode: "AI" | "HUMAN" }> =>
    axiosClient.patch(`/admin/support/conversations/${conversationId}/mode`, {
      mode,
    }),
};
