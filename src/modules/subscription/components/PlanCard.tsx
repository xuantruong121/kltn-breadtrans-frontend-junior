"use client";

import React from "react";
import { Check, Clock, Lock, Star } from "lucide-react";
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
  onSelectPlus?: () => void;
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
  onSelectPlus,
  isPurchasing = false,
  highlighted = false,
  isAuthenticated = false,
  isLoadingCatalog = false,
  isCatalogError = false,
}) => {
  const current = resolveEffectivePlanDisplay(effectivePlan);
  const cta = getPlanCardCta(planType, effectivePlan, purchasablePlusVersion, isAuthenticated);

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
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
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
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
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
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-6 lg:p-7 shadow-xs transition-all dark:border-slate-800 dark:bg-slate-900/60">
      <div>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-200">
            BreadTrans Pro
          </h3>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
            <Clock size={13} aria-hidden="true" />
            Sắp ra mắt
          </span>
        </div>

        <p className="mt-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
          Premium + các công cụ AI hỗ trợ học tập — Sắp ra mắt.
        </p>

        <div className="mt-6 pb-6 border-b border-slate-200/80 dark:border-slate-800">
          <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-400 dark:text-slate-500">
            Sắp ra mắt
          </span>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Đang hoàn thiện kiến trúc tính năng AI
          </p>
        </div>

        <ul className="mt-6 space-y-3.5 text-sm text-slate-500 dark:text-slate-400">
          <li className="flex items-start gap-3">
            <Check size={18} className="text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
            <span>Toàn bộ quyền lợi gói Plus</span>
          </li>
          <li className="flex items-start gap-3">
            <Lock size={17} className="text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
            <span>Đánh giá phát âm & AI Speaking (Sắp ra mắt)</span>
          </li>
          <li className="flex items-start gap-3">
            <Lock size={17} className="text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
            <span>Chấm chữa chi tiết AI Writing (Sắp ra mắt)</span>
          </li>
          <li className="flex items-start gap-3">
            <Lock size={17} className="text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
            <span>Gia sư AI học tập tương tác (Sắp ra mắt)</span>
          </li>
        </ul>
      </div>

      <div className="mt-8 pt-4">
        <button
          type="button"
          disabled
          className="w-full min-h-12 rounded-xl border border-slate-200 bg-slate-100 px-4 text-sm font-bold text-slate-400 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed"
        >
          {cta.label}
        </button>
      </div>
    </div>
  );
};
