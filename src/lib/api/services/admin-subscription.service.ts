import axiosClient from "../axiosClient";

export type AdminSubscriptionStatusFilter =
  | "ALL"
  | "ACTIVE"
  | "EXPIRED"
  | "REVOKED";

export interface AdminSubscriptionItem {
  id: number;
  userId: number;
  userEmail: string;
  userFullName: string | null;
  planId: number;
  planCode: string;
  planDisplayName: string;
  planVersionId: number;
  version: number;
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
  startsAt: string;
  endsAt: string;
  remainingDays: number;
  source: "PAYMENT" | "ADMIN_GRANT";
  sourceLabel: string;
  planPurchaseId: number | null;
  createdAt: string;
}

export interface PaginatedAdminSubscriptions {
  items: AdminSubscriptionItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AdminSubscriptionEvent {
  id: number;
  subscriptionId: number;
  type:
    | "PAYMENT_ACTIVATED"
    | "ADMIN_GRANTED"
    | "ADMIN_EXTENDED"
    | "ADMIN_REVOKED";
  typeLabel: string;
  actorUserId: number | null;
  actorName: string;
  actorEmail: string | null;
  reason: string | null;
  previousEndsAt: string | null;
  newEndsAt: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
}

export interface AdminActivePlan {
  id: number;
  code: string;
  displayName: string;
  currentVersionId: number;
  version: number;
  durationDays: number | null;
  priceVnd: number | null;
}

export interface AdminLearnerLookup {
  id: number;
  email: string;
  fullName: string | null;
  activeSubscription: AdminSubscriptionItem | null;
}

export interface PlanEntitlementRow {
  id: number;
  featureKey: string;
  enabled: boolean;
  limitValue: number | null;
  unit: string | null;
  period: string | null;
}

export interface PlanVersionRow {
  id: number;
  planCode: string;
  version: number;
  displayName: string | null;
  description: string | null;
  durationDays: number | null;
  priceVnd: number | null;
  status: "DRAFT" | "PUBLISHED" | "RETIRED";
  isCurrent: boolean;
  publishedAt: string | null;
  entitlements: PlanEntitlementRow[];
}

export interface PlanCatalogRow {
  id: number;
  code: string;
  displayName: string;
  versions: PlanVersionRow[];
}

export type PlanDraftInput = Partial<
  Pick<PlanVersionRow, "displayName" | "description" | "durationDays" | "priceVnd">
>;

export const adminPlanCatalogService = {
  list: () =>
    axiosClient.get("/admin/plan-catalog") as unknown as Promise<PlanCatalogRow[]>,
  createDraft: (code: string, input: PlanDraftInput) =>
    axiosClient.post(`/admin/plan-catalog/plans/${code}/versions`, input),
  updateDraft: (id: number, input: PlanDraftInput) =>
    axiosClient.patch(`/admin/plan-catalog/versions/${id}`, input),
  updateEntitlement: (
    versionId: number,
    entitlementId: number,
    input: { enabled?: boolean; limitValue?: number | null },
  ) =>
    axiosClient.patch(
      `/admin/plan-catalog/versions/${versionId}/entitlements/${entitlementId}`,
      input,
    ),
  publish: (id: number) =>
    axiosClient.post(`/admin/plan-catalog/versions/${id}/publish`),
  retire: (id: number) =>
    axiosClient.post(`/admin/plan-catalog/versions/${id}/retire`),
};

export const adminSubscriptionService = {
  list: (params?: {
    status?: AdminSubscriptionStatusFilter;
    search?: string;
    page?: number;
    limit?: number;
  }) =>
    axiosClient.get("/admin/subscriptions", {
      params,
    }) as Promise<PaginatedAdminSubscriptions>,

  getActivePlans: () =>
    axiosClient.get("/admin/subscriptions/plans") as Promise<AdminActivePlan[]>,

  searchLearners: (query?: string) =>
    axiosClient.get("/admin/subscriptions/learners", {
      params: { q: query },
    }) as Promise<AdminLearnerLookup[]>,

  grant: (data: {
    studentId: number;
    planVersionId: number;
    durationDays?: number;
    reason: string;
    idempotencyKey?: string;
  }) =>
    axiosClient.post(
      "/admin/subscriptions/grant",
      data,
    ) as Promise<AdminSubscriptionItem>,

  extend: (
    id: number,
    data: {
      extensionDays: number;
      reason: string;
      idempotencyKey?: string;
    },
  ) =>
    axiosClient.post(
      `/admin/subscriptions/${id}/extend`,
      data,
    ) as Promise<AdminSubscriptionItem>,

  revoke: (
    id: number,
    data: {
      reason: string;
      idempotencyKey?: string;
    },
  ) =>
    axiosClient.post(
      `/admin/subscriptions/${id}/revoke`,
      data,
    ) as Promise<AdminSubscriptionItem>,

  getHistory: (subscriptionId: number) =>
    axiosClient.get(
      `/admin/subscriptions/${subscriptionId}/history`,
    ) as Promise<AdminSubscriptionEvent[]>,

  getLearnerHistory: (userId: number) =>
    axiosClient.get(
      `/admin/subscriptions/user/${userId}/history`,
    ) as Promise<AdminSubscriptionEvent[]>,
};
