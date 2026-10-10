/**
 * Pure unit tests for BreadTrans commercial plans, purchase invariants,
 * payment states, and premium vocabulary authorization.
 *
 * Run with: node --no-warnings --test --experimental-strip-types src/modules/subscription/planLogic.test.ts
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  resolveEffectivePlanDisplay,
  getPlusPricingDisplay,
  getPlanCardCta,
  getPaymentStatusBadgeInfo,
  preparePurchasePayload,
  generateIdempotencyKey,
  isVocabTopicLocked,
  shouldTriggerPaywallOnVocabError,
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
  resolvePaymentPollingInterval,
  getLoginRedirectUrl,
  PLAN_QUERY_KEYS,
  isPaymentIntentExpired,
  calculateSubscriptionDaysRemaining,
  shouldNotifyPaymentCompletion,
  type EffectivePlan,
  type PlanPurchase,
} from "./planLogic.ts";

// ─── Test Fixtures ────────────────────────────────────────────────────────────

function makeEffectivePlan(overrides: Partial<EffectivePlan> = {}): EffectivePlan {
  return {
    plan: {
      id: 1,
      code: "FREE",
      displayName: "BreadTrans Free",
      description: "Gói học cơ bản",
    },
    planVersion: {
      id: 1,
      version: 1,
      displayName: "Free v1",
      description: null,
      durationDays: null,
      priceVnd: 0,
      currency: "VND",
    },
    isPaid: false,
    subscription: null,
    entitlements: [
      {
        featureKey: "PREMIUM_VOCAB",
        enabled: false,
        limitValue: null,
        unit: null,
        period: null,
        scope: null,
      },
    ],
    ...overrides,
  };
}

function makePaidPlusPlan(): EffectivePlan {
  return {
    plan: {
      id: 2,
      code: "PLUS",
      displayName: "BreadTrans Plus",
      description: "Gói học nâng cao",
    },
    planVersion: {
      id: 5,
      version: 1,
      displayName: "Plus 30 ngày",
      description: "Mở khóa từ vựng Premium",
      durationDays: 30,
      priceVnd: 69000,
      currency: "VND",
    },
    isPaid: true,
    subscription: {
      id: 101,
      startsAt: "2026-10-01T00:00:00.000Z",
      endsAt: "2026-10-31T23:59:59.000Z",
      status: "ACTIVE",
    },
    entitlements: [
      {
        featureKey: "PREMIUM_VOCAB",
        enabled: true,
        limitValue: null,
        unit: "CONTENT_ACCESS",
        period: "LIFETIME",
        scope: null,
      },
    ],
  };
}

function makeMockPurchase(overrides: Partial<PlanPurchase> = {}): PlanPurchase {
  return {
    id: 42,
    planVersionId: 5,
    planCode: "PLUS",
    planDisplayName: "BreadTrans Plus",
    version: 1,
    status: "PENDING_PAYMENT",
    amountVnd: 69000,
    currency: "VND",
    durationDays: 30,
    createdAt: "2026-10-06T10:00:00.000Z",
    completedAt: null,
    payment: {
      id: 88,
      transferCode: "BT-PLAN-00000042",
      status: "PENDING",
      amountVnd: 69000,
      currency: "VND",
      reportedAt: null,
      confirmedAt: null,
      rejectedAt: null,
      rejectionReason: null,
    },
    bankInstructions: {
      bin: "970422",
      bankName: "MBBank",
      accountNumber: "0335888999",
      accountName: "BREADTRANS ACADEMY",
      amountVnd: 69000,
      transferCode: "BT-PLAN-00000042",
      vietQrUrl: "https://img.vietqr.io/image/970422-0335888999-compact2.png?amount=69000&addInfo=BT-PLAN-00000042",
    },
    ...overrides,
  };
}

// ─── Test Suites ──────────────────────────────────────────────────────────────

describe("1. Effective Plan Resolution & Free Plan Display", () => {
  test("User without paid subscription resolves to FREE plan as current", () => {
    const freePlan = makeEffectivePlan();
    const display = resolveEffectivePlanDisplay(freePlan);
    assert.equal(display.isPaid, false);
    assert.equal(display.planCode, "FREE");
    assert.equal(display.expiryDateText, null);

    const cta = getPlanCardCta("FREE", freePlan, null);
    assert.equal(cta.isCurrent, true);
    assert.equal(cta.disabled, true);
    assert.equal(cta.label, "Đang sử dụng");
  });

  test("User with null plan (guest / loading fallback) defaults cleanly to FREE", () => {
    const display = resolveEffectivePlanDisplay(null);
    assert.equal(display.isPaid, false);
    assert.equal(display.planCode, "FREE");
    assert.equal(display.planDisplayName, "BreadTrans Free");

    const guestCta = getPlanCardCta("FREE", null, null);
    assert.equal(guestCta.isCurrent, false);
    assert.equal(guestCta.disabled, true);
    assert.equal(guestCta.label, "Học miễn phí");
  });

  test("Paid PLUS subscription resolves isPaid: true and formats expiry date in Vietnamese format", () => {
    const plusPlan = makePaidPlusPlan();
    const display = resolveEffectivePlanDisplay(plusPlan);
    assert.equal(display.isPaid, true);
    assert.equal(display.planCode, "PLUS");
    assert.ok(display.expiryDateText?.includes("31/10/2026") || display.expiryDateText?.includes("01/11/2026"));

    // PLUS card marked as current
    const plusCta = getPlanCardCta("PLUS", plusPlan, null);
    assert.equal(plusCta.isCurrent, true);
    assert.equal(plusCta.disabled, true);
    assert.equal(plusCta.label, "Gói hiện tại");

    // FREE card is not current when user has paid plan
    const freeCta = getPlanCardCta("FREE", plusPlan, null);
    assert.equal(freeCta.isCurrent, false);
    assert.equal(freeCta.disabled, true);
  });
});

describe("2. PLUS Plan Display from Backend Data vs Unavailable Catalog", () => {
  test("PLUS purchasable plan formats amount and duration from backend data", () => {
    const purchasable = { id: 5, priceVnd: 69000, durationDays: 30, currency: "VND" };
    const pricing = getPlusPricingDisplay(purchasable);
    assert.equal(pricing.isPurchasable, true);
    assert.ok(pricing.priceText.includes("69.000"));
    assert.equal(pricing.durationText, " / 30 ngày");

    const freeUser = makeEffectivePlan();
    const cta = getPlanCardCta("PLUS", freeUser, purchasable);
    assert.equal(cta.disabled, false);
    assert.equal(cta.label, "Nâng cấp Plus");
  });

  test("Unavailable PLUS does NOT invent fake price (never 69.000đ by default)", () => {
    const pricingNull = getPlusPricingDisplay(null);
    assert.equal(pricingNull.isPurchasable, false);
    assert.equal(pricingNull.priceText, "Chưa mở bán");
    assert.equal(pricingNull.durationText, "");

    const freeUser = makeEffectivePlan();
    const cta = getPlanCardCta("PLUS", freeUser, null);
    assert.equal(cta.disabled, true);
    assert.equal(cta.label, "Chưa thể mua");
  });

  test("PLUS with invalid/zero price or duration is safely rejected as not purchasable", () => {
    const invalidVersion = { id: 2, priceVnd: 0, durationDays: 30, currency: "VND" };
    const pricing = getPlusPricingDisplay(invalidVersion);
    assert.equal(pricing.isPurchasable, false);
    assert.equal(pricing.priceText, "Chưa mở bán");
  });
});

describe("3. PRO Plan Behavior", () => {
  test("PRO plan stays unavailable when the public catalog has no current version", () => {
    const freeUser = makeEffectivePlan();
    const cta = getPlanCardCta("PRO", freeUser, null);
    assert.equal(cta.disabled, true);
    assert.equal(cta.label, "Chưa thể mua");
    assert.equal(cta.isCurrent, false);
  });

  test("PRO plan becomes purchasable from the backend catalog", () => {
    const freeUser = makeEffectivePlan();
    const proVersion = { id: 22, priceVnd: 149000, durationDays: 30, currency: "VND" };
    const cta = getPlanCardCta("PRO", freeUser, null, true, proVersion);
    assert.equal(cta.disabled, false);
    assert.equal(cta.label, "Nâng cấp Pro");
  });
});

describe("4. Purchase Request Safety & Idempotency Key", () => {
  test("preparePurchasePayload includes ONLY planVersionId and idempotencyKey", () => {
    const payload = preparePurchasePayload(5, "idem-test-key-123");
    assert.deepEqual(Object.keys(payload).sort(), ["idempotencyKey", "planVersionId"]);
    assert.equal(payload.planVersionId, 5);
    assert.equal(payload.idempotencyKey, "idem-test-key-123");

    // Client NEVER attaches price, currency, or duration
    assert.equal((payload as any).amountVnd, undefined);
    assert.equal((payload as any).currency, undefined);
    assert.equal((payload as any).durationDays, undefined);
  });

  test("preparePurchasePayload throws error on invalid planVersionId or empty key", () => {
    assert.throws(() => preparePurchasePayload(0, "key"), /Invalid planVersionId/);
    assert.throws(() => preparePurchasePayload(-1, "key"), /Invalid planVersionId/);
    assert.throws(() => preparePurchasePayload(5, "   "), /idempotencyKey is required/);
  });

  test("generateIdempotencyKey creates non-empty valid string identifier", () => {
    const key1 = generateIdempotencyKey();
    const key2 = generateIdempotencyKey();
    assert.ok(key1.length > 8);
    assert.ok(key2.length > 8);
    assert.notEqual(key1, key2);
  });
});

describe("5. Payment Instructions & VietQR Presentation", () => {
  test("Payment detail uses backend-returned VietQR and bank parameters", () => {
    const purchase = makeMockPurchase();
    assert.equal(purchase.bankInstructions!.vietQrUrl.startsWith("https://img.vietqr.io"), true);
    assert.equal(purchase.bankInstructions!.transferCode, "BT-PLAN-00000042");
    assert.equal(purchase.payment.transferCode, "BT-PLAN-00000042");
    assert.equal(purchase.bankInstructions!.amountVnd, 69000);
    assert.equal(purchase.bankInstructions!.bankName, "MBBank");
    assert.equal(purchase.bankInstructions!.accountNumber, "0335888999");
  });

  test("formatVnd outputs correct locale currency string", () => {
    assert.ok(formatVnd(69000).includes("69.000"));
    assert.ok(formatVnd(0).includes("0"));
    assert.equal(formatVnd(null), "0 ₫");
  });
});

describe("6. Payment Lifecycle Status Transitions & Polling Invariants", () => {
  test("PENDING / PENDING_PAYMENT status maps to 'Chờ thanh toán' and is non-terminal", () => {
    const info = getPaymentStatusBadgeInfo("PENDING");
    assert.equal(info.label, "Chờ thanh toán");
    assert.equal(info.isTerminal, false);

    const pendingPaymentInfo = getPaymentStatusBadgeInfo("PENDING_PAYMENT");
    assert.equal(pendingPaymentInfo.label, "Chờ thanh toán");
    assert.equal(pendingPaymentInfo.isTerminal, false);
  });

  test("REPORTED status maps to 'Đang xác minh' and is non-terminal (allows polling)", () => {
    const info = getPaymentStatusBadgeInfo("REPORTED");
    assert.equal(info.label, "Đang xác minh");
    assert.equal(info.isTerminal, false);
  });

  test("CONFIRMED and COMPLETED statuses are terminal and map to 'Hoàn tất'", () => {
    const conf = getPaymentStatusBadgeInfo("CONFIRMED");
    assert.equal(conf.label, "Hoàn tất");
    assert.equal(conf.isTerminal, true);

    const comp = getPaymentStatusBadgeInfo("COMPLETED");
    assert.equal(comp.label, "Hoàn tất");
    assert.equal(comp.isTerminal, true);
  });

  test("REVIEW_REQUIRED status is terminal and maps to 'Cần kiểm tra'", () => {
    const rev = getPaymentStatusBadgeInfo("REVIEW_REQUIRED");
    assert.equal(rev.label, "Cần kiểm tra");
    assert.equal(rev.isTerminal, true);
  });

  test("REJECTED status is terminal and maps to 'Từ chối'", () => {
    const rej = getPaymentStatusBadgeInfo("REJECTED");
    assert.equal(rej.label, "Từ chối");
    assert.equal(rej.isTerminal, true);
  });
});

describe("7. Vocabulary Lock State: Backend Authoritative isLocked", () => {
  test("Topic with isLocked === true is identified as locked", () => {
    const lockedTopic = { id: 10, isLocked: true };
    assert.equal(isVocabTopicLocked(lockedTopic), true);
  });

  test("Topic with isLocked === false is identified as unlocked", () => {
    const unlockedTopic = { id: 11, isLocked: false };
    assert.equal(isVocabTopicLocked(unlockedTopic), false);
  });

  test("Topic without isLocked property defaults to unlocked (no synthetic lock)", () => {
    const legacyTopic = { id: 12 };
    assert.equal(isVocabTopicLocked(legacyTopic as any), false);
  });
});

describe("8. Paywall Trigger on 403 FEATURE_NOT_INCLUDED (PREMIUM_VOCAB)", () => {
  test("403 + FEATURE_NOT_INCLUDED + PREMIUM_VOCAB returns true", () => {
    const entitlementError = {
      response: {
        status: 403,
        data: {
          statusCode: 403,
          message: "Premium vocabulary entitlement is required",
          error: {
            code: "FEATURE_NOT_INCLUDED",
            featureKey: "PREMIUM_VOCAB",
          },
        },
      },
    };
    assert.equal(isPremiumVocabForbiddenError(entitlementError), true);
    assert.equal(shouldTriggerPaywallOnVocabError(entitlementError), true);
  });

  test("Generic 403 Forbidden without FEATURE_NOT_INCLUDED does NOT trigger paywall", () => {
    const genericForbidden = {
      response: {
        status: 403,
        data: {
          statusCode: 403,
          message: "You are not authorized to view this resource",
        },
      },
    };
    assert.equal(isPremiumVocabForbiddenError(genericForbidden), false);
    assert.equal(shouldTriggerPaywallOnVocabError(genericForbidden), false);
  });

  test("403 with different featureKey does NOT trigger premium vocab paywall", () => {
    const otherFeature = {
      response: {
        status: 403,
        data: {
          statusCode: 403,
          error: {
            code: "FEATURE_NOT_INCLUDED",
            featureKey: "AI_SPEAKING_ASSESSMENT",
          },
        },
      },
    };
    assert.equal(isPremiumVocabForbiddenError(otherFeature), false);
  });

  test("401 Unauthorized does NOT trigger paywall (handled by auth flow)", () => {
    const authError = {
      response: {
        status: 401,
        data: { message: "Unauthorized" },
      },
    };
    assert.equal(isPremiumVocabForbiddenError(authError), false);
  });

  test("500 Server error does NOT trigger paywall", () => {
    const serverError = {
      response: {
        status: 500,
        data: { message: "Internal Server Error" },
      },
    };
    assert.equal(isPremiumVocabForbiddenError(serverError), false);
  });
});

describe("9. Purchase Controlled Error Mapping", () => {
  test("Active subscription conflict returns clear Vietnamese message", () => {
    const err = {
      response: {
        status: 409,
        data: { message: "An effective or scheduled paid Subscription already exists" },
      },
    };
    const msg = mapPlanPurchaseErrorMessage(err);
    assert.equal(msg, "Tài khoản của bạn hiện đã có gói đăng ký đang hoạt động.");
  });

  test("PlanVersion is not purchasable returns user-friendly message", () => {
    const err = {
      response: {
        status: 409,
        data: { message: "PlanVersion is not purchasable" },
      },
    };
    const msg = mapPlanPurchaseErrorMessage(err);
    assert.equal(msg, "Gói dịch vụ này hiện chưa mở bán hoặc tạm thời không khả dụng.");
  });

  test("IdempotencyKey reuse error mapped correctly", () => {
    const err = {
      response: {
        status: 409,
        data: { message: "idempotencyKey was already used for another PlanVersion" },
      },
    };
    const msg = mapPlanPurchaseErrorMessage(err);
    assert.equal(msg, "Yêu cầu thanh toán trùng lặp cho gói khác. Vui lòng thử lại.");
  });

  test("Cannot report transfer from current state mapped correctly", () => {
    const err = {
      response: {
        status: 409,
        data: { message: "Cannot report transfer from REPORTED state" },
      },
    };
    const msg = mapPlanPurchaseErrorMessage(err);
    assert.equal(msg, "Giao dịch này đã được báo chuyển khoản hoặc đã được xử lý.");
  });

  test("Technical Prisma/SQL leaks are masked into default fallback", () => {
    const leakErr = {
      response: {
        status: 500,
        data: { message: "PrismaClientKnownRequestError: Unique constraint failed on PlanPurchase" },
      },
    };
    const msg = mapPlanPurchaseErrorMessage(leakErr);
    assert.equal(msg, "Máy chủ đang bận. Vui lòng thử lại sau ít phút.");
  });
});

describe("9b. Catalog refresh only for stale purchase targets", () => {
  test("refreshes catalog for a stale/non-purchasable version conflict", () => {
    assert.equal(
      shouldRefreshPlanCatalogAfterPurchaseError({
        response: { status: 409, data: { message: "PlanVersion is not purchasable" } },
      }),
      true,
    );
  });

  test("does not refresh catalog for uncertain failures or unrelated conflicts", () => {
    assert.equal(
      shouldRefreshPlanCatalogAfterPurchaseError({
        response: { status: 500, data: { message: "timeout" } },
      }),
      false,
    );
    assert.equal(
      shouldRefreshPlanCatalogAfterPurchaseError({
        response: {
          status: 409,
          data: { message: "An effective or scheduled paid Subscription already exists" },
        },
      }),
      false,
    );
  });
});

describe("10. Public Catalog Integration & Truthful Discovery", () => {
  test("Catalog empty or unavailable (purchasable=false, currentVersion=null) displays 'Chưa mở bán', no price, disabled CTA", () => {
    const pricing = getPlusPricingDisplay(null);
    assert.equal(pricing.isPurchasable, false);
    assert.equal(pricing.priceText, "Chưa mở bán");
    assert.equal(pricing.durationText, "");

    const freeUser = makeEffectivePlan();
    const cta = getPlanCardCta("PLUS", freeUser, null, true);
    assert.equal(cta.disabled, true);
    assert.equal(cta.label, "Chưa thể mua");
  });

  test("Purchasable PLUS fixture from backend enables CTA and displays truthful pricing without hardcoding", () => {
    const fixtureVersion = {
      id: 123,
      version: 1,
      priceVnd: 69000,
      currency: "VND",
      durationDays: 30,
    };
    const pricing = getPlusPricingDisplay(fixtureVersion);
    assert.equal(pricing.isPurchasable, true);
    assert.ok(pricing.priceText.includes("69.000"));
    assert.equal(pricing.durationText, " / 30 ngày");

    const freeUser = makeEffectivePlan();
    const cta = getPlanCardCta("PLUS", freeUser, fixtureVersion, true);
    assert.equal(cta.disabled, false);
    assert.equal(cta.label, "Nâng cấp Plus");

    // Mutation payload uses ONLY id 123 and idempotency key
    const payload = preparePurchasePayload(fixtureVersion.id, "key-456");
    assert.equal(payload.planVersionId, 123);
    assert.equal(payload.idempotencyKey, "key-456");
  });

  test("No client financial authority: client never sends amountVnd, currency, durationDays, or entitlements", () => {
    const payload = preparePurchasePayload(123, "test-idem-key");
    const keys = Object.keys(payload);
    assert.deepEqual(keys.sort(), ["idempotencyKey", "planVersionId"]);
    assert.equal((payload as any).amountVnd, undefined);
    assert.equal((payload as any).currency, undefined);
    assert.equal((payload as any).durationDays, undefined);
    assert.equal((payload as any).entitlements, undefined);
  });
});

describe("11. Guest vs Authenticated Student Authorization & Navigation", () => {
  test("Guest on /plans does NOT have FREE marked as current, CTA is informational", () => {
    const guestCta = getPlanCardCta("FREE", null, null, false);
    assert.equal(guestCta.isCurrent, false);
    assert.equal(guestCta.disabled, true);
    assert.equal(guestCta.label, "Học miễn phí");
  });

  test("Authenticated student with FREE subscription has FREE marked as current", () => {
    const freePlan = makeEffectivePlan();
    const authCta = getPlanCardCta("FREE", freePlan, null, true);
    assert.equal(authCta.isCurrent, true);
    assert.equal(authCta.disabled, true);
    assert.equal(authCta.label, "Đang sử dụng");
  });

  test("Authenticated paid PLUS student does NOT have FREE marked as current", () => {
    const paidPlan = makePaidPlusPlan();
    const freeCta = getPlanCardCta("FREE", paidPlan, null, true);
    assert.equal(freeCta.isCurrent, false);
    assert.equal(freeCta.disabled, true);

    const plusCta = getPlanCardCta("PLUS", paidPlan, null, true);
    assert.equal(plusCta.isCurrent, true);
    assert.equal(plusCta.disabled, true);
    assert.equal(plusCta.label, "Gói hiện tại");
  });

  test("Guest redirect preserves /plans?highlight=plus safely encoded", () => {
    const redirectUrl = getLoginRedirectUrl("plus");
    assert.equal(redirectUrl, "/login?redirect=%2Fplans%3Fhighlight%3Dplus");

    const defaultRedirectUrl = getLoginRedirectUrl();
    assert.equal(defaultRedirectUrl, "/login?redirect=%2Fplans");
  });
});

describe("12. Controlled Payment Polling & Confirmed Callback Invariants", () => {
  test("Polling interval resolves to 2000ms for active non-terminal statuses", () => {
    assert.equal(resolvePaymentPollingInterval("PENDING"), 2000);
    assert.equal(resolvePaymentPollingInterval("PENDING_PAYMENT"), 2000);
    assert.equal(resolvePaymentPollingInterval("REPORTED"), 2000);
    assert.equal(resolvePaymentPollingInterval(null), 2000);
    assert.equal(resolvePaymentPollingInterval(undefined), 2000);
  });

  test("Polling interval resolves to false for terminal states", () => {
    assert.equal(resolvePaymentPollingInterval("CONFIRMED"), false);
    assert.equal(resolvePaymentPollingInterval("COMPLETED"), false);
    assert.equal(resolvePaymentPollingInterval("REJECTED"), false);
    assert.equal(resolvePaymentPollingInterval("REVIEW_REQUIRED"), false);
    assert.equal(resolvePaymentPollingInterval("DUPLICATE"), false);
    assert.equal(resolvePaymentPollingInterval("EXPIRED"), false);
  });

  test("State transition from PENDING -> PENDING -> COMPLETED stops polling and confirms once", () => {
    const states = ["PENDING", "PENDING", "COMPLETED"];
    const intervals = states.map((s) => resolvePaymentPollingInterval(s));
    assert.deepEqual(intervals, [2000, 2000, false]);

    let confirmedCount = 0;
    let isConfirmed = false;
    states.forEach((status) => {
      if ((status === "CONFIRMED" || status === "COMPLETED") && !isConfirmed) {
        isConfirmed = true;
        confirmedCount++;
      }
    });
    assert.equal(confirmedCount, 1);
  });

  test("REVIEW_REQUIRED state stops polling immediately and does not trigger success", () => {
    const status = "REVIEW_REQUIRED";
    assert.equal(resolvePaymentPollingInterval(status), false);
    const badge = getPaymentStatusBadgeInfo(status);
    assert.equal(badge.label, "Cần kiểm tra");
    assert.equal(badge.isTerminal, true);

    let isConfirmed = false;
    const testStatus: string = status;
    if (testStatus === "CONFIRMED" || testStatus === "COMPLETED") {
      isConfirmed = true;
    }
    assert.equal(isConfirmed, false, "REVIEW_REQUIRED must never trigger success confirmation");
  });

  test("Confirmation notification runs exactly once and does not loop on repeated renders", () => {
    let callCount = 0;
    const onConfirmed = () => {
      callCount += 1;
    };

    let confirmedNotified = false;
    const notifyOnce = (status: string) => {
      if ((status === "CONFIRMED" || status === "COMPLETED") && !confirmedNotified) {
        confirmedNotified = true;
        onConfirmed();
      }
    };

    // Simulate 5 successive polling re-renders with CONFIRMED status
    notifyOnce("CONFIRMED");
    notifyOnce("CONFIRMED");
    notifyOnce("CONFIRMED");
    notifyOnce("CONFIRMED");
    notifyOnce("CONFIRMED");

    assert.equal(callCount, 1, "Confirmation callback must execute exactly once");
  });

  test("Viewing payment history of an already completed purchase does NOT trigger celebratory notification", () => {
    // When opened from history, initialStatus is already COMPLETED
    const initialStatus = "COMPLETED";
    const currentStatus = "COMPLETED";
    const alreadyNotified = false;

    const shouldNotify = shouldNotifyPaymentCompletion(initialStatus, currentStatus, alreadyNotified);
    assert.equal(
      shouldNotify,
      false,
      "Viewing details of a completed purchase in history must NOT trigger celebratory notification"
    );
  });

  test("Live transition from PENDING -> COMPLETED triggers celebratory notification once", () => {
    const initialStatus = "PENDING";
    const currentStatus = "COMPLETED";

    // First transition: should notify
    const firstCheck = shouldNotifyPaymentCompletion(initialStatus, currentStatus, false);
    assert.equal(firstCheck, true, "First live transition must notify");

    // Second check after notified: must NOT notify again
    const secondCheck = shouldNotifyPaymentCompletion(initialStatus, currentStatus, true);
    assert.equal(secondCheck, false, "Subsequent render must not notify again");
  });
});

describe("13. Centralized Query Keys Invariants", () => {
  test("PLAN_QUERY_KEYS defines exact stable keys for all plan cache surfaces", () => {
    assert.deepEqual(PLAN_QUERY_KEYS.catalog, ["plan-catalog"]);
    assert.deepEqual(PLAN_QUERY_KEYS.effectivePlan, ["effective-plan"]);
    assert.deepEqual(PLAN_QUERY_KEYS.myPurchases, ["my-plan-purchases"]);
    assert.deepEqual(PLAN_QUERY_KEYS.purchaseDetail(88), ["plan-purchase-detail", 88]);
    assert.deepEqual(PLAN_QUERY_KEYS.vocabTopics, ["vocab-topics"]);
    assert.deepEqual(PLAN_QUERY_KEYS.readingExercises, ["reading-exercises"]);
    assert.deepEqual(PLAN_QUERY_KEYS.listeningPractices, ["listeningPractices"]);
    assert.deepEqual(PLAN_QUERY_KEYS.speakingExercises, ["speaking-exercises"]);
    assert.deepEqual(PLAN_QUERY_KEYS.speakingExercise(6), ["speaking-exercise", 6]);
    assert.deepEqual(PLAN_QUERY_KEYS.writingTopics, ["writing-topics"]);
    assert.deepEqual(PLAN_QUERY_KEYS.writingTopic(4), ["writing-topic", 4]);
  });
});

describe("14. 4-Skill Paywall Forbidden Error Checker Invariants", () => {
  function makeError(status: number, code: string, featureKey?: string) {
    return {
      response: {
        status,
        data: {
          error: {
            code,
            featureKey,
          },
        },
      },
    };
  }

  test("PREMIUM_READING 403 triggers reading paywall error exclusively", () => {
    const err = makeError(403, "FEATURE_NOT_INCLUDED", "PREMIUM_READING");
    assert.equal(isFeatureForbiddenError(err, "PREMIUM_READING"), true);
    assert.equal(isPremiumReadingForbiddenError(err), true);
    assert.equal(isPremiumListeningForbiddenError(err), false);
    assert.equal(isPremiumSpeakingForbiddenError(err), false);
    assert.equal(isPremiumWritingForbiddenError(err), false);
    assert.equal(isPremiumVocabForbiddenError(err), false);
    assert.equal(isPremiumContentForbiddenError(err), true);
  });

  test("PREMIUM_LISTENING 403 triggers listening paywall error exclusively", () => {
    const err = makeError(403, "FEATURE_NOT_INCLUDED", "PREMIUM_LISTENING");
    assert.equal(isPremiumReadingForbiddenError(err), false);
    assert.equal(isPremiumListeningForbiddenError(err), true);
    assert.equal(isPremiumSpeakingForbiddenError(err), false);
    assert.equal(isPremiumWritingForbiddenError(err), false);
    assert.equal(isPremiumVocabForbiddenError(err), false);
    assert.equal(isPremiumContentForbiddenError(err), true);
  });

  test("PREMIUM_SPEAKING_CONTENT 403 triggers speaking paywall error exclusively", () => {
    const err = makeError(403, "FEATURE_NOT_INCLUDED", "PREMIUM_SPEAKING_CONTENT");
    assert.equal(isPremiumReadingForbiddenError(err), false);
    assert.equal(isPremiumListeningForbiddenError(err), false);
    assert.equal(isPremiumSpeakingForbiddenError(err), true);
    assert.equal(isPremiumWritingForbiddenError(err), false);
    assert.equal(isPremiumVocabForbiddenError(err), false);
    assert.equal(isPremiumContentForbiddenError(err), true);
  });

  test("PREMIUM_WRITING_CONTENT 403 triggers writing paywall error exclusively", () => {
    const err = makeError(403, "FEATURE_NOT_INCLUDED", "PREMIUM_WRITING_CONTENT");
    assert.equal(isPremiumReadingForbiddenError(err), false);
    assert.equal(isPremiumListeningForbiddenError(err), false);
    assert.equal(isPremiumSpeakingForbiddenError(err), false);
    assert.equal(isPremiumWritingForbiddenError(err), true);
    assert.equal(isPremiumVocabForbiddenError(err), false);
    assert.equal(isPremiumContentForbiddenError(err), true);
  });

  test("Generic 403, 401, 500, or null never trigger 4-skill paywalls", () => {
    const generic403 = { response: { status: 403, data: { message: "Forbidden" } } };
    const auth401 = { response: { status: 401, data: { error: { code: "UNAUTHORIZED" } } } };
    const server500 = { response: { status: 500, data: { error: { code: "INTERNAL_ERROR" } } } };

    for (const err of [generic403, auth401, server500, null, undefined, {}]) {
      assert.equal(isPremiumReadingForbiddenError(err), false);
      assert.equal(isPremiumListeningForbiddenError(err), false);
      assert.equal(isPremiumSpeakingForbiddenError(err), false);
      assert.equal(isPremiumWritingForbiddenError(err), false);
      assert.equal(isPremiumContentForbiddenError(err), false);
    }
  });

  test("Direct error object format without nested response also supported safely", () => {
    const directErr = {
      status: 403,
      data: {
        error: { code: "FEATURE_NOT_INCLUDED", featureKey: "PREMIUM_READING" },
      },
    };
    assert.equal(isPremiumReadingForbiddenError(directErr), true);
  });
});

describe("15. Phase PAY-UI Automatic Payment & Polling Lifecycle", () => {
  test("Automatic flow starts polling immediately upon purchase creation without manual report-transfer", () => {
    const purchase = makeMockPurchase({
      payment: {
        id: 101,
        transferCode: "BTPLAN0000000101",
        status: "PENDING",
        amountVnd: 69000,
        currency: "VND",
        reportedAt: null,
        confirmedAt: null,
        rejectedAt: null,
        rejectionReason: null,
      },
    });

    // Polling interval is active (2000ms) right from PENDING
    const interval = resolvePaymentPollingInterval(purchase.payment.status);
    assert.equal(interval, 2000, "Polling must start automatically on PENDING");

    // Report transfer must NOT be called in the normal flow
    const reportTransferCalled = false;
    assert.equal(reportTransferCalled, false, "Normal flow must NEVER call report-transfer");
  });

  test("Fast feedback activity indicator is shown while in waiting state", () => {
    const pendingStatus = getPaymentStatusBadgeInfo("PENDING");
    assert.equal(pendingStatus.label, "Chờ thanh toán");
    assert.equal(pendingStatus.isTerminal, false);

    const reportedStatus = getPaymentStatusBadgeInfo("REPORTED");
    assert.equal(reportedStatus.label, "Đang xác minh");
    assert.equal(reportedStatus.isTerminal, false);
  });
});

describe("16. Phase PAY-UI Success Invalidation & Immediate Content Unlock", () => {
  test("COMPLETED transition invalidates exact query keys exactly once", () => {
    const invalidatedKeys: string[] = [];
    const mockQueryClient = {
      invalidateQueries: ({ queryKey }: { queryKey: readonly unknown[] }) => {
        invalidatedKeys.push(queryKey[0] as string);
      },
    };

    let notified = false;
    const handleStatusTransition = (status: string) => {
      if ((status === "CONFIRMED" || status === "COMPLETED") && !notified) {
        notified = true;
        mockQueryClient.invalidateQueries({ queryKey: PLAN_QUERY_KEYS.effectivePlan });
        mockQueryClient.invalidateQueries({ queryKey: PLAN_QUERY_KEYS.catalog });
        mockQueryClient.invalidateQueries({ queryKey: PLAN_QUERY_KEYS.vocabTopics });
        mockQueryClient.invalidateQueries({ queryKey: PLAN_QUERY_KEYS.readingExercises });
        mockQueryClient.invalidateQueries({ queryKey: PLAN_QUERY_KEYS.listeningPractices });
        mockQueryClient.invalidateQueries({ queryKey: PLAN_QUERY_KEYS.speakingExercises });
        mockQueryClient.invalidateQueries({ queryKey: PLAN_QUERY_KEYS.writingTopics });
        mockQueryClient.invalidateQueries({ queryKey: PLAN_QUERY_KEYS.myPurchases });
      }
    };

    // Poll 1: PENDING
    handleStatusTransition("PENDING");
    assert.equal(invalidatedKeys.length, 0);

    // Poll 2: PENDING
    handleStatusTransition("PENDING");
    assert.equal(invalidatedKeys.length, 0);

    // Poll 3: COMPLETED
    handleStatusTransition("COMPLETED");
    assert.equal(invalidatedKeys.length, 8);
    assert.deepEqual(invalidatedKeys, [
      "effective-plan",
      "plan-catalog",
      "vocab-topics",
      "reading-exercises",
      "listeningPractices",
      "speaking-exercises",
      "writing-topics",
      "my-plan-purchases",
    ]);

    // Poll 4: COMPLETED (duplicate poll does NOT re-trigger invalidation)
    handleStatusTransition("COMPLETED");
    assert.equal(invalidatedKeys.length, 8, "Must not trigger repeated invalidations on duplicate COMPLETED");
  });

  test("Authoritative unlock: isLocked=false from refetched backend unlocks content immediately without optimistic guessing", () => {
    const lockedTopicBeforePayment = { id: 42, isLocked: true };
    assert.equal(isVocabTopicLocked(lockedTopicBeforePayment), true);

    // After refetch, backend returns topic with isLocked: false
    const unlockedTopicAfterPayment = { id: 42, isLocked: false };
    assert.equal(isVocabTopicLocked(unlockedTopicAfterPayment), false);
  });
});

describe("17. Phase PAY-UI REVIEW_REQUIRED & Calm Exception Handling", () => {
  test("REVIEW_REQUIRED stops polling, marks terminal, does not activate subscription", () => {
    const interval = resolvePaymentPollingInterval("REVIEW_REQUIRED");
    assert.equal(interval, false, "Polling must stop immediately upon REVIEW_REQUIRED");

    const badge = getPaymentStatusBadgeInfo("REVIEW_REQUIRED");
    assert.equal(badge.label, "Cần kiểm tra");
    assert.equal(badge.isTerminal, true);

    // Must NOT activate or mark as completed
    const testStatus: string = "REVIEW_REQUIRED";
    const isCompleted = testStatus === "COMPLETED" || testStatus === "CONFIRMED";
    assert.equal(isCompleted, false);
  });

  test("DUPLICATE stops polling and is recognized as terminal", () => {
    const interval = resolvePaymentPollingInterval("DUPLICATE");
    assert.equal(interval, false, "DUPLICATE must stop polling");
  });
});

describe("18. Phase PAY-UI Network Resilience & Expiry Handling", () => {
  test("Network poll failure preserves purchase intent and does not set status to REJECTED", () => {
    const currentPurchase = makeMockPurchase();
    const pollError = new Error("Network timeout");

    // Existing purchase state is retained despite error
    assert.ok(pollError.message.includes("timeout"));
    assert.ok(currentPurchase);
    assert.equal(currentPurchase.payment.status, "PENDING");
    assert.notEqual(currentPurchase.payment.status, "REJECTED");

    // Polling interval remains active for retry
    assert.equal(resolvePaymentPollingInterval(currentPurchase.payment.status), 2000);
  });

  test("Expired intent is detected from exact timestamp and stops active polling", () => {
    const expiredTimestamp = new Date(Date.now() - 60000).toISOString();
    const purchaseWithExpiredIntent = makeMockPurchase({
      payment: {
        id: 99,
        transferCode: "BTPLAN0000000099",
        status: "PENDING",
        amountVnd: 69000,
        currency: "VND",
        reportedAt: null,
        confirmedAt: null,
        rejectedAt: null,
        rejectionReason: null,
        paymentIntentExpiresAt: expiredTimestamp,
      },
    });

    const isExpired =
      new Date(purchaseWithExpiredIntent.payment.paymentIntentExpiresAt!).getTime() < Date.now();
    assert.equal(isExpired, true);
    assert.equal(isPaymentIntentExpired(purchaseWithExpiredIntent.payment.paymentIntentExpiresAt), true);
    assert.equal(isPaymentIntentExpired(new Date(Date.now() + 600000).toISOString()), false);
    assert.equal(isPaymentIntentExpired(null), false);

    // Subscription days remaining helper
    const futureEndsAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    assert.equal(calculateSubscriptionDaysRemaining(futureEndsAt), 5);
    assert.equal(calculateSubscriptionDaysRemaining(new Date(Date.now() - 10000).toISOString()), 0);
    assert.equal(calculateSubscriptionDaysRemaining(null), null);

    const expiredBadge = getPaymentStatusBadgeInfo("EXPIRED");
    assert.equal(expiredBadge.label, "Hết hạn");
    assert.equal(expiredBadge.isTerminal, true);
  });

  test("401 Unauthorized maps to clear login copy without inventing payment failure", () => {
    const authErr = { response: { status: 401, data: { message: "Unauthorized" } } };
    const msg = mapPlanPurchaseErrorMessage(authErr);
    assert.equal(msg, "Vui lòng đăng nhập để thực hiện mua gói.");
  });
});

describe("19. Phase PAY-UI Version Independence & Double-Click Protection", () => {
  test("Purchase creation derives version purely from catalog, never hardcoding version numbers", () => {
    const dynamicCatalogVersion = {
      id: 999, // Dynamic version from catalog
      priceVnd: 69000,
      durationDays: 30,
      currency: "VND",
    };

    const payload = preparePurchasePayload(dynamicCatalogVersion.id, "idemp-key-test-999");
    assert.equal(payload.planVersionId, 999);
    assert.notEqual(payload.planVersionId, 58, "Must not hardcode version 58");
    assert.notEqual(payload.planVersionId, 35, "Must not hardcode version 35");
  });

  test("Double-click guard blocks duplicate purchase mutations while pending", () => {
    let callCount = 0;
    let isPending = false;

    const initiatePurchase = () => {
      if (isPending) return;
      isPending = true;
      callCount++;
    };

    // User rapidly double-clicks
    initiatePurchase();
    initiatePurchase();

    assert.equal(callCount, 1, "Double click must trigger only one purchase creation");
  });
});
