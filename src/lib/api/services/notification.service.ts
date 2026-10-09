import axiosClient from "../axiosClient";

export interface NotificationItem {
  id: number;
  userId: number;
  type: "vocab_review" | "streak" | "system" | string;
  title: string;
  body: string;
  url?: string | null;
  isRead: boolean;
  createdAt: string;
}

export type NotificationFilter = "all" | "unread" | "read";

export interface NotificationInboxResponse {
  items: NotificationItem[];
  nextCursor: number | null;
}

export interface UnreadCountResponse {
  count: number;
}

export const notificationService = {
  getInbox: async (
    limit = 20,
    cursor?: number,
    filter: NotificationFilter = "all"
  ): Promise<NotificationInboxResponse> => {
    return await axiosClient.get("/notifications/inbox", {
      params: { limit, cursor, filter },
    });
  },

  getUnreadCount: async (): Promise<UnreadCountResponse> => {
    return await axiosClient.get("/notifications/inbox/unread-count");
  },

  markRead: async (id: number): Promise<{ success: boolean; notification?: NotificationItem }> => {
    return await axiosClient.patch(`/notifications/inbox/${id}/read`);
  },

  markAllRead: async (): Promise<{ success: boolean; count: number }> => {
    return await axiosClient.patch("/notifications/inbox/read-all");
  },

  delete: async (id: number): Promise<{ success: boolean; id?: number; message?: string }> => {
    return await axiosClient.delete(`/notifications/inbox/${id}`);
  },
};
