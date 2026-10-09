import axiosClient from "../axiosClient";
import type {
  EffectivePlan,
  PlanPurchase,
  PlanPurchaseStatus,
  PlanPaymentStatus,
  PlanFeatureKey,
  PlanBankInstructions,
  PlanPurchasePayment,
  EffectivePlanEntitlement,
  SubscriptionStatus,
} from "@/modules/subscription/planLogic";
import {
  formatVnd,
  isPremiumVocabForbiddenError,
  isFeatureForbiddenError,
  isPremiumReadingForbiddenError,
  isPremiumListeningForbiddenError,
  isPremiumSpeakingForbiddenError,
  isPremiumWritingForbiddenError,
  isPremiumContentForbiddenError,
  mapPlanPurchaseErrorMessage,
  shouldRefreshPlanCatalogAfterPurchaseError,
} from "@/modules/subscription/planLogic";

export type {
  EffectivePlan,
  PlanPurchase,
  PlanPurchaseStatus,
  PlanPaymentStatus,
  PlanFeatureKey,
  PlanBankInstructions,
  PlanPurchasePayment,
  EffectivePlanEntitlement,
  SubscriptionStatus,
};

export {
  formatVnd,
  isPremiumVocabForbiddenError,
  isFeatureForbiddenError,
  isPremiumReadingForbiddenError,
  isPremiumListeningForbiddenError,
  isPremiumSpeakingForbiddenError,
  isPremiumWritingForbiddenError,
  isPremiumContentForbiddenError,
  mapPlanPurchaseErrorMessage,
  shouldRefreshPlanCatalogAfterPurchaseError,
};

export interface CreatePlanPurchaseInput {
  planVersionId: number;
  idempotencyKey: string;
}

export interface PublicPlanVersionSummary {
  id: number;
  version: number;
  displayName: string | null;
  description: string | null;
  priceVnd: number;
  currency: string;
  durationDays: number;
}

export interface PublicPlanCatalogItem {
  code: string;
  displayName: string;
  description: string | null;
  purchasable: boolean;
  currentVersion: PublicPlanVersionSummary | null;
}

export interface PublicPlanCatalogResponse {
  plans: PublicPlanCatalogItem[];
}

export { PLAN_QUERY_KEYS } from "@/modules/subscription/planLogic";

export const planService = {
  /**
   * GET /plans/catalog
   * Public discovery endpoint for active plans and published current versions.
   * No JWT required.
   */
  getPublicCatalog: async (): Promise<PublicPlanCatalogResponse> => {
    return (await axiosClient.get("/plans/catalog")) as unknown as PublicPlanCatalogResponse;
  },

  /**
   * GET /subscriptions/me
   * Authoritative effective plan state for currently authenticated user.
   */
  getEffectivePlan: async (): Promise<EffectivePlan> => {
    return await axiosClient.get("/subscriptions/me");
  },

  /**
   * POST /plan-purchases
   * Initiate a purchase. Note: client sends ONLY planVersionId and idempotencyKey.
   */
  createPurchase: async (
    input: CreatePlanPurchaseInput,
  ): Promise<PlanPurchase> => {
    return await axiosClient.post("/plan-purchases", {
      planVersionId: input.planVersionId,
      idempotencyKey: input.idempotencyKey,
    });
  },

  /**
   * GET /plan-purchases/me
   * List authenticated student's own purchase history.
   */
  getMyPurchases: async (): Promise<PlanPurchase[]> => {
    return await axiosClient.get("/plan-purchases/me");
  },

  /**
   * GET /plan-purchases/:id
   * Get single owned purchase details with payment instructions.
   */
  getPurchaseById: async (id: number): Promise<PlanPurchase> => {
    return await axiosClient.get(`/plan-purchases/${id}`);
  },

  syncPayosPayment: async (intentId: number): Promise<unknown> => {
    return await axiosClient.post(`/payments/payos/${intentId}/sync`);
  },

  replacePayment: async (id: number): Promise<PlanPurchase> => {
    return await axiosClient.post(`/plan-purchases/${id}/replace-payment`);
  },

  /**
   * POST /plan-purchases/:id/report-transfer
   * Student reports manual bank transfer completion (PENDING -> REPORTED).
   */
  reportTransfer: async (id: number): Promise<PlanPurchase> => {
    return await axiosClient.post(`/plan-purchases/${id}/report-transfer`);
  },
};
