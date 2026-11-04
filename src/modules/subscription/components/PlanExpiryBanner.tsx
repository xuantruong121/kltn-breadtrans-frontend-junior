"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { planService, PLAN_QUERY_KEYS } from "@/lib/api/services/plan.service";
import { planExpiryBannerState } from "../planLogic";

/**
 * Shown in the last 7 days of a paid plan with no renewal queued: days left,
 * the paid practice used in this plan that FREE will lock again, and a link
 * to renew (the new plan starts when this one ends, so no day is lost).
 */
export function PlanExpiryBanner({ showRenewLink = true }: { showRenewLink?: boolean }) {
  const user = useAuthStore((state) => state.user);
  const { data } = useQuery({
    queryKey: PLAN_QUERY_KEYS.expirySummary,
    queryFn: planService.getExpirySummary,
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
  const state = planExpiryBannerState(data);
  if (!state) return null;

  return (
    <section
      aria-label="Gói dịch vụ sắp hết hạn"
      className="rounded-2xl border border-amber-300 bg-amber-50 p-4 sm:p-5 dark:border-amber-900/60 dark:bg-amber-950/30"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Clock size={20} strokeWidth={2.25} className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-bold text-slate-900 dark:text-slate-100">{state.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{state.body}</p>
            {state.items.length > 0 && (
              <ul className="mt-2.5 flex flex-wrap gap-2" aria-label="Nội dung sẽ bị khoá khi gói hết hạn">
                {state.items.map((item) => (
                  <li
                    key={item}
                    className="rounded-full border border-amber-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-amber-900 dark:border-amber-900/60 dark:bg-slate-900 dark:text-amber-300"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        {showRenewLink && (
          <Link
            href="/plans"
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 px-4 text-sm font-extrabold text-white shadow-xs transition-colors hover:bg-amber-600"
          >
            Gia hạn ngay
          </Link>
        )}
      </div>
    </section>
  );
}
