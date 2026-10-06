export type PlanFeatureKey =
  | "AI_SPEAKING_ASSESSMENT"
  | "AI_WRITING_REVIEW"
  | "AI_TUTOR_MESSAGE"
  | "AI_EXPLANATION"
  | "PREMIUM_VOCAB";

export type SubscriptionStatus = "ACTIVE" | "EXPIRED" | "REVOKED";

export type PlanPurchaseStatus = "PENDING_PAYMENT" | "COMPLETED" | "REJECTED";

export type PlanPaymentStatus = "PENDING" | "REPORTED" | "CONFIRMED" | "REJECTED";

export interface EffectivePlanEntitlement {
  featureKey: PlanFeatureKey;
  enabled: boolean;
  limitValue: number | null;
  unit: string | null;
  period: string | null;
  scope: unknown | null;
}

export interface EffectivePlan {
  plan: {
    id: number;
    code: string;
    displayName: string;
    description: string | null;
  };
  planVersion: {
    id: number;
    version: number;
    displayName: string | null;
    description: string | null;
    durationDays: number | null;
    priceVnd: number | null;
    currency: string;
  };
  isPaid: boolean;
  subscription: {
    id: number;
    startsAt: string;
    endsAt: string;
    status: SubscriptionStatus;
  } | null;
  entitlements: EffectivePlanEntitlement[];
}

export interface PlanBankInstructions {
  bin: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  amountVnd: number;
  transferCode: string;
  vietQrUrl: string;
}

export interface PlanPurchasePayment {
  id: number;
  transferCode: string;
  status: PlanPaymentStatus;
  amountVnd: number;
  currency: string;
  reportedAt: string | null;
  confirmedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
}

export interface PlanPurchase {
  id: number;
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
  payment: PlanPurchasePayment;
  bankInstructions: PlanBankInstructions;
}

export interface PurchasablePlanVersionInfo {
  id: number;
  priceVnd: number | null;
  durationDays: number | null;
  currency: string;
}

export const PLAN_QUERY_KEYS = {
  catalog: ["plan-catalog"] as const,
  effectivePlan: ["effective-plan"] as const,
  myPurchases: ["my-plan-purchases"] as const,
  purchaseDetail: (id: number) => ["plan-purchase-detail", id] as const,
  vocabTopics: ["vocab-topics"] as const,
  readingTopics: ["reading-topics"] as const,
  readingTopic: (id: number) => ["reading-topic", id] as const,
  listeningPractices: ["listening-practices"] as const,
  speakingExercises: ["speaking-exercises"] as const,
  speakingExercise: (id: number) => ["speaking-exercise", id] as const,
  writingTopics: ["writing-topics"] as const,
  writingTopic: (id: number) => ["writing-topic", id] as const,
};

export interface PlanCardCtaState {
  label: string;
  disabled: boolean;
  isCurrent: boolean;
  statusVariant?: "current" | "primary" | "disabled" | "coming_soon";
}

export interface PlusPricingDisplay {
  priceText: string;
  durationText: string;
  isPurchasable: boolean;
}

export interface PaymentStatusBadge {
  label: string;
  badgeClass: string;
  isTerminal: boolean;
}

/**
 * Format VND currency in standard Vietnamese locale (e.g., 69.000 ₫).
 */
export function formatVnd(amount: number | null | undefined): string {
  if (typeof amount !== "number" || isNaN(amount)) {
    return "0 ₫";
  }
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Helper to test whether an error is specifically the backend entitlement denial:
 * 403 Forbidden with error.code === "FEATURE_NOT_INCLUDED" and error.featureKey === "PREMIUM_VOCAB".
 */
export function isPremiumVocabForbiddenError(err: any): boolean {
  if (!err) return false;
  const status = err.response?.status ?? err.status;
  if (status !== 403) return false;

  const data = err.response?.data ?? err.data ?? err;
  const errorObj = data?.error;
  const errorCode =
    typeof errorObj === "object" && errorObj !== null
      ? errorObj.code
      : data?.code;
  const featureKey =
    typeof errorObj === "object" && errorObj !== null
      ? errorObj.featureKey
      : data?.featureKey;

  return errorCode === "FEATURE_NOT_INCLUDED" && featureKey === "PREMIUM_VOCAB";
}

/**
 * Checks if an error is a backend 403 FEATURE_NOT_INCLUDED response,
 * optionally verifying the exact featureKey.
 */
export function isFeatureForbiddenError(err: any, expectedFeatureKey?: string): boolean {
  if (!err) return false;
  const status = err.response?.status ?? err.status;
  if (status !== 403) return false;

  const data = err.response?.data ?? err.data ?? err;
  const errorObj = data?.error;
  const errorCode =
    typeof errorObj === "object" && errorObj !== null
      ? errorObj.code
      : data?.code;
  const featureKey =
    typeof errorObj === "object" && errorObj !== null
      ? errorObj.featureKey
      : data?.featureKey;

  if (errorCode !== "FEATURE_NOT_INCLUDED") return false;
  if (expectedFeatureKey) {
    return featureKey === expectedFeatureKey;
  }
  return true;
}

export function isPremiumReadingForbiddenError(err: any): boolean {
  return isFeatureForbiddenError(err, "PREMIUM_READING");
}

export function isPremiumListeningForbiddenError(err: any): boolean {
  return isFeatureForbiddenError(err, "PREMIUM_LISTENING");
}

export function isPremiumSpeakingForbiddenError(err: any): boolean {
  return isFeatureForbiddenError(err, "PREMIUM_SPEAKING_CONTENT");
}

export function isPremiumWritingForbiddenError(err: any): boolean {
  return isFeatureForbiddenError(err, "PREMIUM_WRITING_CONTENT");
}

export function isPremiumContentForbiddenError(err: any): boolean {
  return isFeatureForbiddenError(err);
}

/**
 * Map known backend plan-purchase error responses into user-friendly Vietnamese copy.
 */
export function mapPlanPurchaseErrorMessage(
  err: any,
  defaultMessage = "Thao tác không thành công. Vui lòng thử lại sau.",
): string {
  if (!err) return defaultMessage;

  const status = err.response?.status ?? err.status;
  const rawMsg = err.response?.data?.message ?? err.message ?? "";
  const lowerMsg = String(rawMsg).toLowerCase();

  if (
    lowerMsg.includes("already exists") ||
    lowerMsg.includes("active subscription") ||
    lowerMsg.includes("scheduled paid subscription")
  ) {
    return "Tài khoản của bạn hiện đã có gói đăng ký đang hoạt động.";
  }

  if (
    lowerMsg.includes("not purchasable") ||
    lowerMsg.includes("only the current published") ||
    lowerMsg.includes("free plan is not purchasable")
  ) {
    return "Gói dịch vụ này hiện chưa mở bán hoặc tạm thời không khả dụng.";
  }

  if (lowerMsg.includes("idempotencykey was already used")) {
    return "Yêu cầu thanh toán trùng lặp cho gói khác. Vui lòng thử lại.";
  }

  if (lowerMsg.includes("cannot report transfer from")) {
    return "Giao dịch này đã được báo chuyển khoản hoặc đã được xử lý.";
  }

  if (lowerMsg.includes("cannot report a")) {
    return "Giao dịch không ở trạng thái cho phép báo chuyển khoản.";
  }

  if (status === 401) {
    return "Vui lòng đăng nhập để thực hiện mua gói.";
  }

  if (status === 403) {
    return "Bạn không có quyền thực hiện thao tác này.";
  }

  if (status === 404) {
    return "Không tìm thấy thông tin gói dịch vụ hoặc giao dịch yêu cầu.";
  }

  if (status === 409) {
    return "Yêu cầu bị xung đột với trạng thái hiện tại của tài khoản.";
  }

  if (status >= 500) {
    return "Máy chủ đang bận. Vui lòng thử lại sau ít phút.";
  }

  if (typeof rawMsg === "string" && rawMsg.trim().length > 0) {
    if (!/prisma|query|sql|stack|exception/i.test(rawMsg)) {
      return rawMsg;
    }
  }

  return defaultMessage;
}

/**
 * A catalog refresh is needed only when the server says the selected version
 * is stale or no longer saleable. Uncertain/network failures must keep the
 * same catalog and idempotency attempt intact.
 */
export function shouldRefreshPlanCatalogAfterPurchaseError(err: any): boolean {
  if ((err?.response?.status ?? err?.status) !== 409) return false;
  const message = String(err?.response?.data?.message ?? err?.message ?? "").toLowerCase();
  return (
    message.includes("not purchasable") ||
    message.includes("current published") ||
    message.includes("plan is not active") ||
    message.includes("planversion not found") ||
    message.includes("free plan")
  );
}

/**
 * Deterministic helper to evaluate current effective plan display info.
 */
export function resolveEffectivePlanDisplay(plan: EffectivePlan | null | undefined): {
  isPaid: boolean;
  planCode: string;
  planDisplayName: string;
  expiryDateText: string | null;
  startDateText: string | null;
} {
  if (!plan) {
    return {
      isPaid: false,
      planCode: "FREE",
      planDisplayName: "BreadTrans Free",
      expiryDateText: null,
      startDateText: null,
    };
  }

  const isPaid = Boolean(plan.isPaid && plan.subscription && plan.subscription.status === "ACTIVE");
  const planCode = plan.plan?.code || "FREE";
  const planDisplayName = plan.plan?.displayName || "BreadTrans Free";

  let expiryDateText: string | null = null;
  let startDateText: string | null = null;

  if (isPaid && plan.subscription?.endsAt) {
    try {
      const endsDate = new Date(plan.subscription.endsAt);
      if (!isNaN(endsDate.getTime())) {
        expiryDateText = endsDate.toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      }
    } catch {
      expiryDateText = null;
    }
  }

  if (isPaid && plan.subscription?.startsAt) {
    try {
      const startsDate = new Date(plan.subscription.startsAt);
      if (!isNaN(startsDate.getTime())) {
        startDateText = startsDate.toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      }
    } catch {
      startDateText = null;
    }
  }

  return {
    isPaid,
    planCode,
    planDisplayName,
    expiryDateText,
    startDateText,
  };
}

/**
 * Returns human-friendly pricing display for PLUS plan.
 * If backend has no purchasable PLUS version configured:
 * NEVER invents a fake price! Shows "Chưa mở bán".
 */
export function getPlusPricingDisplay(
  version: PurchasablePlanVersionInfo | null | undefined,
): PlusPricingDisplay {
  if (
    version &&
    typeof version.id === "number" &&
    typeof version.priceVnd === "number" &&
    version.priceVnd > 0 &&
    typeof version.durationDays === "number" &&
    version.durationDays > 0
  ) {
    return {
      priceText: formatVnd(version.priceVnd),
      durationText: ` / ${version.durationDays} ngày`,
      isPurchasable: true,
    };
  }

  return {
    priceText: "Chưa mở bán",
    durationText: "",
    isPurchasable: false,
  };
}

/**
 * Evaluates CTA button behavior and copy for each plan card.
 * Never allows purchase button if version is not purchasable.
 */
export function getPlanCardCta(
  targetPlan: "FREE" | "PLUS" | "PRO",
  effectivePlan: EffectivePlan | null | undefined,
  purchasablePlusVersion: PurchasablePlanVersionInfo | null | undefined,
  isAuthenticatedParam?: boolean,
): PlanCardCtaState {
  const current = resolveEffectivePlanDisplay(effectivePlan);
  const isAuthenticated =
    isAuthenticatedParam !== undefined
      ? isAuthenticatedParam
      : effectivePlan !== null && effectivePlan !== undefined;

  if (targetPlan === "FREE") {
    if (!isAuthenticated) {
      return {
        label: "Học miễn phí",
        disabled: true,
        isCurrent: false,
        statusVariant: "disabled",
      };
    }
    if (!current.isPaid) {
      return {
        label: "Đang sử dụng",
        disabled: true,
        isCurrent: true,
        statusVariant: "current",
      };
    }
    return {
      label: "Gói cơ bản",
      disabled: true,
      isCurrent: false,
      statusVariant: "disabled",
    };
  }

  if (targetPlan === "PLUS") {
    if (isAuthenticated && current.isPaid && current.planCode === "PLUS") {
      return {
        label: "Gói hiện tại",
        disabled: true,
        isCurrent: true,
        statusVariant: "current",
      };
    }

    const pricing = getPlusPricingDisplay(purchasablePlusVersion);
    if (pricing.isPurchasable) {
      return {
        label: "Nâng cấp Plus",
        disabled: false,
        isCurrent: false,
        statusVariant: "primary",
      };
    }

    return {
      label: "Chưa thể mua",
      disabled: true,
      isCurrent: false,
      statusVariant: "disabled",
    };
  }

  // PRO Plan
  return {
    label: "Sắp ra mắt",
    disabled: true,
    isCurrent: false,
    statusVariant: "coming_soon",
  };
}

/**
 * Polling interval controller for manual payment confirmation.
 * Polls only when status is REPORTED (returns 5000ms).
 * Otherwise returns false (stops polling immediately).
 */
export function resolvePaymentPollingInterval(
  status?: string | null,
): number | false {
  if (status === "REPORTED") {
    return 5000;
  }
  return false;
}

/**
 * Resolves safe login redirect URL preserving plan highlight.
 */
export function getLoginRedirectUrl(highlight?: string | null): string {
  const dest = highlight ? `/plans?highlight=${highlight}` : "/plans";
  return `/login?redirect=${encodeURIComponent(dest)}`;
}

/**
 * Centralized mapping of backend payment/purchase status enums to Vietnamese labels and visual tags.
 */
export function getPaymentStatusBadgeInfo(
  status: PlanPaymentStatus | PlanPurchaseStatus | string,
): PaymentStatusBadge {
  switch (status) {
    case "PENDING":
    case "PENDING_PAYMENT":
      return {
        label: "Chờ chuyển khoản",
        badgeClass: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60",
        isTerminal: false,
      };
    case "REPORTED":
      return {
        label: "Chờ xác nhận",
        badgeClass: "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/60",
        isTerminal: false,
      };
    case "CONFIRMED":
    case "COMPLETED":
      return {
        label: "Đã xác nhận",
        badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60",
        isTerminal: true,
      };
    case "REJECTED":
      return {
        label: "Đã từ chối",
        badgeClass: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60",
        isTerminal: true,
      };
    default:
      return {
        label: String(status),
        badgeClass: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
        isTerminal: false,
      };
  }
}

/**
 * Prepares and validates a purchase request payload.
 * STRICT CONTRACT: Client MUST send ONLY planVersionId and idempotencyKey.
 * NEVER sends amountVnd, currency, durationDays, or entitlement values!
 */
export function preparePurchasePayload(
  planVersionId: number,
  idempotencyKey: string,
): { planVersionId: number; idempotencyKey: string } {
  if (!Number.isInteger(planVersionId) || planVersionId <= 0) {
    throw new Error("Invalid planVersionId: must be a positive integer");
  }
  const key = idempotencyKey?.trim();
  if (!key) {
    throw new Error("idempotencyKey is required");
  }
  return {
    planVersionId,
    idempotencyKey: key,
  };
}

/**
 * Safe generation of UUID-based idempotency key.
 */
export function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "BT-IDEMP-" + Math.random().toString(36).substring(2, 15) + "-" + Date.now().toString(36);
}

/**
 * Checks if a vocabulary topic is locked.
 * STRICT CONTRACT: Uses backend-authoritative topic.isLocked!
 * NEVER recomputes with client-side assumptions like isPro && plan !== PLUS.
 */
export function isVocabTopicLocked(topic: { isLocked?: boolean }): boolean {
  return Boolean(topic?.isLocked);
}

/**
 * Checks if a rejection error from backend should trigger the Premium Paywall modal.
 * STRICT CONTRACT: Only status 403 with error.code === "FEATURE_NOT_INCLUDED" and featureKey === "PREMIUM_VOCAB".
 * Generic 403 or other errors do NOT trigger the paywall modal!
 */
export function shouldTriggerPaywallOnVocabError(err: any): boolean {
  return isPremiumVocabForbiddenError(err);
}
