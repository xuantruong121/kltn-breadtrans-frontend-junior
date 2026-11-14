"use client";

import Link from "next/link";
import { Clock } from "lucide-react";

import { offersUpgrade, type AiQuotaExhausted } from "@/modules/subscription/aiQuota";

/**
 * The day's AI gradings are used up (owner 2026-11-13: only a red error was
 * shown). A warning, not an error: the learner's work is kept and nothing went
 * wrong; it says when gradings come back and, below Pro, where to get more.
 */
export function AiQuotaNotice({
  quota,
  keptWork,
  onDismiss,
}: {
  quota: AiQuotaExhausted;
  /** "Bản ghi" or "Bài viết": what is kept. */
  keptWork: string;
  onDismiss?: () => void;
}) {
  return (
    <div
      role="status"
      className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800/70 dark:bg-amber-950/30"
    >
      <div className="flex items-start gap-3">
        <Clock size={18} strokeWidth={2} className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-amber-950 dark:text-amber-200">Đã hết lượt AI chấm hôm nay</p>
          <p className="mt-1 text-[15px] leading-relaxed text-slate-800 dark:text-slate-200">{quota.message}</p>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
            {keptWork} của bạn vẫn được giữ. Lượt mới có từ 00:00 ngày mai (giờ Việt Nam).
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {offersUpgrade(quota.planCode) && (
              <Link
                href="/plans"
                className="inline-flex min-h-9 items-center rounded-lg bg-amber-500 px-3.5 text-sm font-bold text-white transition-colors hover:bg-amber-600"
              >
                Xem gói
              </Link>
            )}
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="inline-flex min-h-9 items-center rounded-lg px-3 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/40"
              >
                Đóng
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
