import axiosClient from "../axiosClient";

export type PlanPurchaseStatus =
  | "PENDING_PAYMENT"
  | "COMPLETED"
  | "REJECTED"
  | "EXPIRED"
  | "SUPERSEDED";

export type PlanPaymentStatus =
  | "PENDING"
  | "REPORTED"
  | "CONFIRMED"
  | "REJECTED"
  | "REVIEW_REQUIRED"
  | "EXPIRED"
  | "SUPERSEDED";

export interface AdminPlanPurchase {
  id: number;
  userId: number;
  userEmail: string;
  planVersionId: number;
  planCode: string;
  planDisplayName: string;
  version: number;
  status: PlanPurchaseStatus;
  amountVnd: number;
  currency: string;
  durationDays: number;
  createdAt: string;
  completedAt: string | null;
  confirmedById: number | null;
  rejectedById: number | null;
  payment: {
    id: number;
    transferCode: string;
    status: PlanPaymentStatus;
    amountVnd: number;
    currency: string;
    reportedAt: string | null;
    confirmedAt: string | null;
    rejectedAt: string | null;
    rejectionReason: string | null;
    paymentIntentExpiresAt: string | null;
    autoMatchUntil: string | null;
    supersededAt: string | null;
  };
  payos?: { status: string; checkoutUrl?: string | null } | null;
}

export interface AdminPlanPurchasePage {
  items: AdminPlanPurchase[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const adminPlanPurchaseService = {
  list: (params?: { status?: PlanPurchaseStatus; search?: string; page?: number; limit?: number }) =>
    axiosClient.get("/admin/plan-purchases", { params }) as Promise<AdminPlanPurchasePage>,
  get: (id: number) =>
    axiosClient.get(`/admin/plan-purchases/${id}`) as Promise<AdminPlanPurchase>,
  confirm: (id: number) =>
    axiosClient.post(`/admin/plan-purchases/${id}/confirm`) as Promise<AdminPlanPurchase>,
  reject: (id: number, rejectionReason: string) =>
    axiosClient.post(`/admin/plan-purchases/${id}/reject`, { rejectionReason }) as Promise<AdminPlanPurchase>,
};
