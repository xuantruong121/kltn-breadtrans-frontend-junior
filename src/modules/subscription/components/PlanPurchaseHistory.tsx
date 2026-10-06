"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, AlertCircle, RotateCcw, CreditCard, ChevronRight } from "lucide-react";
import { planService, formatVnd } from "@/lib/api/services/plan.service";
import { getPaymentStatusBadgeInfo } from "../planLogic";
import { PlanPaymentModal } from "./PlanPaymentModal";

export const PlanPurchaseHistory: React.FC = () => {
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<number | null>(null);

  const {
    data: purchases,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["my-plan-purchases"],
    queryFn: planService.getMyPurchases,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <History size={18} aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              Lịch sử giao dịch mua gói
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Quản lý và tra cứu các giao dịch đăng ký gói của bạn
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Đang tải lịch sử mua gói">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-16 w-full animate-pulse rounded-2xl border border-slate-200 bg-slate-100/60 dark:border-slate-800 dark:bg-slate-850"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          <AlertCircle className="mx-auto size-6 text-rose-500" aria-hidden="true" />
          <p className="mt-2 text-xs font-bold">Không thể tải lịch sử mua gói.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-rose-700 transition-colors"
          >
            <RotateCcw size={13} />
            <span>Thử lại</span>
          </button>
        </div>
      ) : !purchases || purchases.length === 0 ? (
        <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-3 rounded-2xl border border-dashed border-slate-200 bg-white/70 px-6 py-4 text-center sm:text-left dark:border-slate-800 dark:bg-slate-900/60">
          <CreditCard className="size-6 text-slate-400 dark:text-slate-500 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Bạn chưa có lịch sử giao dịch mua gói
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Các giao dịch nâng cấp gói Plus khi phát sinh sẽ được hiển thị và cập nhật tự động tại đây.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {purchases.map((purchase) => {
            const paymentStatus = purchase.payment?.status || purchase.status;
            const statusInfo = getPaymentStatusBadgeInfo(paymentStatus);
            const dateStr = new Date(purchase.createdAt).toLocaleDateString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={purchase.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-slate-900 dark:text-slate-100">
                      {purchase.planDisplayName}
                    </span>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      ({purchase.durationDays} ngày)
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Thời gian tạo: {dateStr}
                  </p>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Mã chuyển khoản: <span className="font-mono font-bold text-amber-700 dark:text-amber-400">{purchase.payment?.transferCode || purchase.bankInstructions?.transferCode}</span>
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                  <div className="text-left sm:text-right">
                    <span className="block font-black text-base text-slate-900 dark:text-slate-100">
                      {formatVnd(purchase.amountVnd)}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border mt-0.5 ${statusInfo.badgeClass}`}
                    >
                      {statusInfo.label}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedPurchaseId(purchase.id)}
                    className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750 transition-all cursor-pointer"
                  >
                    <span>Chi tiết</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedPurchaseId && (
        <PlanPaymentModal
          purchaseId={selectedPurchaseId}
          onClose={() => setSelectedPurchaseId(null)}
        />
      )}
    </div>
  );
};
