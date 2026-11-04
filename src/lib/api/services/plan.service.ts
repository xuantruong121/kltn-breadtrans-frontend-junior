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
  RenewalPreview,
  ExpirySummary,
  PromoPreview,
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
  RenewalPreview,
  ExpirySummary,
  PromoPreview,
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
  promoCode?: string;
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
  /** Every term on sale (30, 90, 180 days), shortest first. */
  versions?: PublicPlanVersionSummary[];
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
      ...(input.promoCode ? { promoCode: input.promoCode } : {}),
    });
  },

  /** GET /plan-purchases/promo-preview: the price with a code, nothing bought. */
  getPromoPreview: async (planVersionId: number, code: string): Promise<PromoPreview> => {
    return await axiosClient.get("/plan-purchases/promo-preview", {
      params: { planVersionId, code },
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
   * GET /plan-purchases/renewal-preview/:planVersionId
   * Where buying this version now would sit: now, queued after the running
   * plan, or as an upgrade with the running plan's days converted.
   */
  /** GET /subscriptions/me/expiry-summary: days left, queued renewal, paid practice used. */
  getExpirySummary: async (): Promise<ExpirySummary> => {
    return await axiosClient.get("/subscriptions/me/expiry-summary");
  },

  getRenewalPreview: async (planVersionId: number): Promise<RenewalPreview> => {
    return await axiosClient.get(`/plan-purchases/renewal-preview/${planVersionId}`);
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
