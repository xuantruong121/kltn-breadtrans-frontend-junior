"use client";

import React from "react";
import { Check, Star } from "lucide-react";
import type { EffectivePlan, PurchasablePlanVersionInfo } from "../planLogic";
import {
  getPlanCardCta,
  getPlusPricingDisplay,
  resolveEffectivePlanDisplay,
} from "../planLogic";

export interface PlanCardProps {
  planType: "FREE" | "PLUS" | "PRO";
  effectivePlan: EffectivePlan | null | undefined;
  purchasablePlusVersion?: PurchasablePlanVersionInfo | null;
  purchasableProVersion?: PurchasablePlanVersionInfo | null;
  onSelectPlus?: () => void;
  onSelectPro?: () => void;
  isPurchasing?: boolean;
  highlighted?: boolean;
  isAuthenticated?: boolean;
  isLoadingCatalog?: boolean;
  isCatalogError?: boolean;
}

export const PlanCard: React.FC<PlanCardProps> = ({
  planType,
  effectivePlan,
  purchasablePlusVersion,
  purchasableProVersion,
  onSelectPlus,
  onSelectPro,
  isPurchasing = false,
  highlighted = false,
  isAuthenticated = false,
  isLoadingCatalog = false,
  isCatalogError = false,
}) => {
  const current = resolveEffectivePlanDisplay(effectivePlan);
  const cta = getPlanCardCta(
    planType,
    effectivePlan,
    purchasablePlusVersion,
    isAuthenticated,
    purchasableProVersion,
  );

  if (planType === "FREE") {
    return (
      <div
        className={`flex flex-col justify-between rounded-2xl border bg-white p-6 lg:p-7 shadow-xs transition-all dark:bg-slate-900 ${
          cta.isCurrent
            ? "border-emerald-300 dark:border-emerald-800 ring-2 ring-emerald-500/20"
            : "border-slate-200 dark:border-slate-800"
        }`}
      >
        <div>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
              BreadTrans Free
            </h3>
            {cta.isCurrent && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 shrink-0 whitespace-nowrap">
                Gói hiện tại
              </span>
            )}
          </div>

          <p className="mt-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
            Học và luyện tập với các nội dung cơ bản của BreadTrans.
          </p>

          <div className="mt-6 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                0 ₫
              </span>
              <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">
                / vĩnh viễn
              </span>
            </div>
          </div>

          <ul className="mt-6 space-y-3.5 text-sm text-slate-700 dark:text-slate-200">
            <li className="flex items-start gap-3">
              <Check size={18} className="text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
              <span>Học và luyện tập với nội dung cơ bản của BreadTrans</span>
            </li>
            <li className="flex items-start gap-3">
              <Check size={18} className="text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
              <span>Làm quen với các công cụ học tập của BreadTrans</span>
            </li>
            <li className="flex items-start gap-3">
              <Check size={18} className="text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
              <span>Theo dõi tiến độ học tập cá nhân</span>
            </li>
          </ul>
        </div>

        <div className="mt-8 pt-4">
          <button
            type="button"
            disabled
            className="w-full min-h-12 rounded-xl border border-slate-200 bg-slate-100 px-4 text-sm font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400 cursor-not-allowed"
          >
            {cta.label}
          </button>
        </div>
      </div>
    );
  }

  if (planType === "PLUS") {
    const plusPricing = getPlusPricingDisplay(purchasablePlusVersion);

    return (
      <div
        className={`relative flex flex-col justify-between rounded-2xl border bg-white p-6 lg:p-7 shadow-md transition-all dark:bg-slate-900 ${
          highlighted || (!cta.isCurrent && plusPricing.isPurchasable)
            ? "border-amber-400 dark:border-amber-500 ring-2 ring-amber-400/25"
            : cta.isCurrent
              ? "border-emerald-300 dark:border-emerald-800 ring-2 ring-emerald-500/20"
              : "border-slate-200 dark:border-slate-800"
        }`}
      >
        {/* Recommended pill */}
        {!cta.isCurrent && (
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-3.5 py-1 text-xs font-bold text-white shadow-xs">
              <Star size={13} className="fill-white" aria-hidden="true" />
              Đề xuất
            </span>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
              BreadTrans Plus
            </h3>
            {cta.isCurrent && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 shrink-0 whitespace-nowrap">
                Gói hiện tại
              </span>
            )}
          </div>

          <p className="mt-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
            Mở khóa kho nội dung luyện tập 4 kỹ năng và từ vựng Premium.
          </p>

          <div className="mt-6 pb-6 border-b border-slate-100 dark:border-slate-800">
            {isLoadingCatalog ? (
              <div className="space-y-2 animate-pulse py-1">
                <div className="h-8 w-36 bg-slate-100 dark:bg-slate-800 rounded-lg" />
                <div className="h-3.5 w-24 bg-slate-100 dark:bg-slate-800 rounded-md" />
              </div>
            ) : isCatalogError && !cta.isCurrent ? (
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-rose-700 dark:text-rose-300">
                  Chưa tải được
                </span>
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                  Hãy thử lại để xem thông tin mở bán.
                </p>
              </div>
            ) : plusPricing.isPurchasable ? (
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-4xl font-black tracking-tight text-amber-600 dark:text-amber-400">
                  {plusPricing.priceText}
                </span>
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {plusPricing.durationText}
                </span>
              </div>
            ) : (
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-700 dark:text-slate-300">
                  {plusPricing.priceText}
                </span>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Giá chính thức sẽ được kích hoạt khi mở bán
                </p>
              </div>
            )}

            {cta.isCurrent && current.expiryDateText && (
              <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Hết hạn ngày {current.expiryDateText}
              </p>
            )}
          </div>

          <ul className="mt-6 space-y-3.5 text-sm text-slate-700 dark:text-slate-200">
            <li className="flex items-start gap-3 font-semibold text-slate-900 dark:text-slate-100">
              <Check size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
              <span>Bao gồm toàn bộ quyền lợi cơ bản</span>
            </li>
            <li className="flex items-start gap-3 font-bold text-amber-800 dark:text-amber-300">
              <Check size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
              <span>Mở khóa toàn bộ chủ đề Từ vựng Premium</span>
            </li>
            <li className="flex items-start gap-3">
              <Check size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
              <span>Mở khóa kho bài đọc & bài nghe Premium</span>
            </li>
            <li className="flex items-start gap-3">
              <Check size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
              <span>Mở khóa kho bài luyện nói & viết Premium</span>
            </li>
          </ul>
        </div>

        <div className="mt-8 pt-4">
          {isLoadingCatalog ? (
            <div className="w-full min-h-12 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ) : cta.isCurrent ? (
            <button
              type="button"
              disabled
              className="w-full min-h-12 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 cursor-not-allowed"
            >
              Gói hiện tại
            </button>
          ) : isCatalogError ? (
            <button
              type="button"
              disabled
              className="w-full min-h-12 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-bold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300 cursor-not-allowed"
            >
              Chưa tải được
            </button>
          ) : plusPricing.isPurchasable ? (
            <button
              type="button"
              onClick={onSelectPlus}
              disabled={isPurchasing}
              className="w-full min-h-12 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] px-4 text-sm sm:text-base font-extrabold text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isPurchasing ? "Đang xử lý..." : cta.label}
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="w-full min-h-12 rounded-xl border border-slate-200 bg-slate-100 px-4 text-sm font-bold text-slate-400 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed"
            >
              {cta.label}
            </button>
          )}
        </div>
      </div>
    );
  }

  // PRO Plan
  const proPricing = getPlusPricingDisplay(purchasableProVersion);
  return (
    <div className={`flex flex-col justify-between rounded-2xl border bg-white p-6 lg:p-7 shadow-md transition-all dark:bg-slate-900 ${
      cta.isCurrent
        ? "border-emerald-300 dark:border-emerald-800 ring-2 ring-emerald-500/20"
        : proPricing.isPurchasable
          ? "border-indigo-400 dark:border-indigo-500 ring-2 ring-indigo-400/20"
          : "border-slate-200 dark:border-slate-800"
    }`}>
      <div>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-200">
            BreadTrans Pro
          </h3>
          {cta.isCurrent && (
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 shrink-0 whitespace-nowrap">
              Gói hiện tại
            </span>
          )}
        </div>

        <p className="mt-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
          Toàn bộ quyền lợi Plus và toàn bộ thư viện khóa học tự học.
        </p>

        <div className="mt-6 pb-6 border-b border-slate-200/80 dark:border-slate-800">
          {isLoadingCatalog ? (
            <div className="space-y-2 animate-pulse py-1">
              <div className="h-8 w-36 bg-slate-100 dark:bg-slate-800 rounded-lg" />
              <div className="h-3.5 w-24 bg-slate-100 dark:bg-slate-800 rounded-md" />
            </div>
          ) : proPricing.isPurchasable ? (
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-black tracking-tight text-indigo-600 dark:text-indigo-400">
                {proPricing.priceText}
              </span>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                {proPricing.durationText}
              </span>
            </div>
          ) : (
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-500 dark:text-slate-400">
              {proPricing.priceText}
            </span>
          )}
        </div>

        <ul className="mt-6 space-y-3.5 text-sm text-slate-500 dark:text-slate-400">
          <li className="flex items-start gap-3">
            <Check size={18} className="text-indigo-500 shrink-0 mt-0.5" aria-hidden="true" />
            <span>Toàn bộ quyền lợi gói Plus</span>
          </li>
          <li className="flex items-start gap-3">
            <Check size={18} className="text-indigo-500 shrink-0 mt-0.5" aria-hidden="true" />
            <span>Mở khóa toàn bộ khóa học</span>
          </li>
          <li className="flex items-start gap-3">
            <Check size={18} className="text-indigo-500 shrink-0 mt-0.5" aria-hidden="true" />
            <span>Lộ trình học tuần tự, tiếp tục từ bài đang học</span>
          </li>
        </ul>
      </div>

      <div className="mt-8 pt-4">
        <button
          type="button"
          onClick={onSelectPro}
          disabled={cta.disabled || isPurchasing || isCatalogError || !proPricing.isPurchasable}
          className="w-full min-h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] px-4 text-sm sm:text-base font-extrabold text-white shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPurchasing ? "Đang xử lý..." : cta.label}
        </button>
      </div>
    </div>
  );
};
