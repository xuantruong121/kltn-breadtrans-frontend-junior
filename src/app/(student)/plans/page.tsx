"use client";

import React, { useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldCheck, AlertCircle, RotateCw } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/stores/authStore";
import {
  planService,
  mapPlanPurchaseErrorMessage,
  PLAN_QUERY_KEYS,
  shouldRefreshPlanCatalogAfterPurchaseError,
  type PlanPurchase,
} from "@/lib/api/services/plan.service";
import {
  generateIdempotencyKey,
  preparePurchasePayload,
  resolveEffectivePlanDisplay,
  getLoginRedirectUrl,
  type PurchasablePlanVersionInfo,
} from "@/modules/subscription/planLogic";
import { PlanCard } from "@/modules/subscription/components/PlanCard";
import { PlanPaymentModal } from "@/modules/subscription/components/PlanPaymentModal";
import { PlanComparisonTable } from "@/modules/subscription/components/PlanComparisonTable";
import { PlanFaqAccordion } from "@/modules/subscription/components/PlanFaqAccordion";

function PlansPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightPlus = searchParams.get("highlight") === "plus";
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  // Active payment modal state
  const [activePurchaseId, setActivePurchaseId] = useState<number | null>(null);
  const [activePurchasePlanCode, setActivePurchasePlanCode] = useState<"PLUS" | "PRO">("PLUS");

  const handleClosePaymentModal = React.useCallback(() => {
    setActivePurchaseId(null);
    setActivePurchasePlanCode("PLUS");
  }, []);

  // Logical idempotency key cached per purchase attempt
  const currentIdempotencyKeyRef = useRef<string>(generateIdempotencyKey());

  // 1. Authoritative Current Plan Query (User specific)
  const {
    data: effectivePlan,
    isLoading: isLoadingPlan,
  } = useQuery({
    queryKey: PLAN_QUERY_KEYS.effectivePlan,
    queryFn: planService.getEffectivePlan,
    enabled: !!user,
  });

  // 2. Query student purchases to resume any open pending purchase
  const { data: myPurchases } = useQuery({
    queryKey: PLAN_QUERY_KEYS.myPurchases,
    queryFn: planService.getMyPurchases,
    enabled: !!user,
  });

  // 3. Public Plan Catalog Query (guest-safe, read-only, not tied to auth)
  const {
    data: catalogData,
    isLoading: isLoadingCatalog,
    isError: isCatalogError,
    refetch: refetchCatalog,
  } = useQuery({
    queryKey: PLAN_QUERY_KEYS.catalog,
    queryFn: planService.getPublicCatalog,
    staleTime: 60 * 1000,
  });

  // Authoritative discovery: Derives purchasable terms strictly from backend catalog
  const purchasablePlusVersion = React.useMemo<PurchasablePlanVersionInfo | null>(() => {
    if (!catalogData?.plans) return null;
    const plusPlan = catalogData.plans.find((p) => p.code === "PLUS");
    if (!plusPlan || !plusPlan.purchasable || !plusPlan.currentVersion) {
      return null;
    }
    const cv = plusPlan.currentVersion;
    return {
      id: cv.id,
      version: cv.version,
      priceVnd: cv.priceVnd,
      currency: cv.currency,
      durationDays: cv.durationDays,
    };
  }, [catalogData]);
  const purchasableProVersion = React.useMemo<PurchasablePlanVersionInfo | null>(() => {
    if (!catalogData?.plans) return null;
    const proPlan = catalogData.plans.find((p) => p.code === "PRO");
    if (!proPlan || !proPlan.purchasable || !proPlan.currentVersion) return null;
    const cv = proPlan.currentVersion;
    return { id: cv.id, version: cv.version, priceVnd: cv.priceVnd, currency: cv.currency, durationDays: cv.durationDays };
  }, [catalogData]);

  // Purchase creation mutation
  const purchaseMutation = useMutation({
    mutationFn: async (planVersionId: number) => {
      // Prepare strictly validated payload: ONLY planVersionId and idempotencyKey
      const payload = preparePurchasePayload(
        planVersionId,
        currentIdempotencyKeyRef.current,
      );
      return await planService.createPurchase(payload);
    },
    onSuccess: (purchase: PlanPurchase) => {
      // Refresh idempotency key for next purchase attempt
      currentIdempotencyKeyRef.current = generateIdempotencyKey();
      queryClient.invalidateQueries({ queryKey: PLAN_QUERY_KEYS.myPurchases });
      setActivePurchaseId(purchase.id);
      setActivePurchasePlanCode(purchase.planCode === "PRO" ? "PRO" : "PLUS");
    },
    onError: (err: any) => {
      const msg = mapPlanPurchaseErrorMessage(err, "Không thể khởi tạo thanh toán. Vui lòng thử lại.");
      toast.error(msg);
      if (shouldRefreshPlanCatalogAfterPurchaseError(err)) {
        queryClient.invalidateQueries({ queryKey: PLAN_QUERY_KEYS.catalog });
      }
    },
  });

  const handleInitiatePurchase = (targetPlan: "PLUS" | "PRO", version: PurchasablePlanVersionInfo | null) => {
    if (!user) {
      router.push(getLoginRedirectUrl(targetPlan === "PRO" ? "pro" : "plus"));
      return;
    }

    if (!version) {
      toast.error("Gói dịch vụ này hiện chưa mở bán. Vui lòng quay lại sau.");
      return;
    }

    // Protection against rapid double clicks
    if (purchaseMutation.isPending) {
      return;
    }

    // Check if there is already an open pending purchase in history
    const openPending = myPurchases?.find(
      (p) =>
      p.planCode === targetPlan &&
        p.isActivePaymentIntent === true,
    );
    if (openPending) {
      setActivePurchaseId(openPending.id);
      setActivePurchasePlanCode(targetPlan);
      return;
    }

    purchaseMutation.mutate(version.id);
  };

  const handleInitiatePlusPurchase = () => handleInitiatePurchase("PLUS", purchasablePlusVersion);
  const handleInitiateProPurchase = () => handleInitiatePurchase("PRO", purchasableProVersion);

  const handleCreateNewFromModal = () => {
    setActivePurchaseId(null);
    const version = activePurchasePlanCode === "PRO" ? purchasableProVersion : purchasablePlusVersion;
    if (!version || purchaseMutation.isPending) return;
    currentIdempotencyKeyRef.current = generateIdempotencyKey();
    purchaseMutation.mutate(version.id);
  };

  const planDisplay = resolveEffectivePlanDisplay(effectivePlan);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8 pb-12 pt-2">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <header className="space-y-3 text-center sm:text-left">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1 text-xs font-bold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
              <ShieldCheck size={15} aria-hidden="true" />
              <span>Gói dịch vụ & quyền lợi học tập</span>
            </div>
            <h1 className="mt-2.5 text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              Nâng cấp trải nghiệm học tập
            </h1>
            <p className="mt-1.5 text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              Lựa chọn gói dịch vụ phù hợp để mở khóa nội dung và lộ trình học tập.
            </p>
          </div>

          {/* Current Plan Status Box for logged-in students */}
          {user && !isLoadingPlan && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900 text-left shrink-0 sm:min-w-[220px]">
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500 block">
                Gói hiện tại của bạn:
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-black text-base text-slate-900 dark:text-slate-100">
                  {planDisplay.planDisplayName}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                    planDisplay.isPaid
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {planDisplay.isPaid ? "Đang hoạt động" : "Cơ bản"}
                </span>
              </div>
              {planDisplay.isPaid && planDisplay.expiryDateText && (
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1.5 font-semibold">
                  Hết hạn ngày: {planDisplay.expiryDateText}
                </p>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── Catalog Error Banner ──────────────────────────────────── */}
      {isCatalogError && (
        <div className="rounded-2xl border border-amber-300 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/30 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Không thể kết nối danh mục gói học mới nhất từ máy chủ.</span>
          </div>
          <button
            type="button"
            onClick={() => refetchCatalog()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-400/80 dark:border-amber-700 bg-white dark:bg-slate-900 text-amber-900 dark:text-amber-200 font-bold hover:bg-amber-100/50 dark:hover:bg-slate-800 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <RotateCw size={13} />
            <span>Thử lại</span>
          </button>
        </div>
      )}

      {/* ── Plan Comparison Grid ─────────────────────────────────── */}
      <section
        aria-label="So sánh các gói dịch vụ"
        className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch"
      >
        <PlanCard
          planType="FREE"
          effectivePlan={effectivePlan}
          isAuthenticated={!!user}
        />

        <PlanCard
          planType="PLUS"
          effectivePlan={effectivePlan}
          purchasablePlusVersion={purchasablePlusVersion}
          onSelectPlus={handleInitiatePlusPurchase}
          purchasableProVersion={purchasableProVersion}
          isPurchasing={purchaseMutation.isPending}
          highlighted={highlightPlus}
          isAuthenticated={!!user}
          isLoadingCatalog={isLoadingCatalog}
          isCatalogError={isCatalogError}
        />

        <PlanCard
          planType="PRO"
          effectivePlan={effectivePlan}
          purchasableProVersion={purchasableProVersion}
          onSelectPro={handleInitiateProPurchase}
          isPurchasing={purchaseMutation.isPending}
          isLoadingCatalog={isLoadingCatalog}
          isCatalogError={isCatalogError}
          isAuthenticated={!!user}
        />
      </section>

      {/* ── Feature Comparison Table (with Dropdown Toggle) ──────── */}
      <PlanComparisonTable />

      {/* ── Frequently Asked Questions (FAQ) ─────────────────────── */}
      <PlanFaqAccordion />

      {/* ── Payment Details Modal ────────────────────────────────── */}
      {activePurchaseId && (
        <PlanPaymentModal
          purchaseId={activePurchaseId}
          onClose={handleClosePaymentModal}
          onReplaceSuccess={(replacement) => setActivePurchaseId(replacement.id)}
          onCreateNew={handleCreateNewFromModal}
        />
      )}
    </div>
  );
}

export default function PlansPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col justify-center items-center h-96 gap-3">
          <Loader2 className="animate-spin text-amber-500" size={40} />
          <span className="text-xs font-bold text-slate-400">Đang tải thông tin gói học...</span>
        </div>
      }
    >
      <PlansPageContent />
    </Suspense>
  );
}
