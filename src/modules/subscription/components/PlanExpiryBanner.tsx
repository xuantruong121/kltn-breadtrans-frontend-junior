"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { planService, PLAN_QUERY_KEYS } from "@/lib/api/services/plan.service";
import { planExpiryBannerState, trialCountdown } from "../planLogic";

/** Current time, ticking every second while `active`. */
function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}

/**
 * Digits in cells one "0" wide. Quicksand has no tabular figures, so plain
 * digits change the clock's width every second (80-121px at 30px) and the
 * banner text beside it re-wraps; fixed cells keep the width constant.
 */
function FixedDigits({ text }: { text: string }) {
  return (
    <>
      {text.split("").map((char, index) =>
        /\d/.test(char) ? (
          <span key={index} className="inline-block w-[1ch] text-center">
            {char}
          </span>
        ) : (
          <span key={index}>{char}</span>
        ),
      )}
    </>
  );
}

/**
 * Shown in the last 7 days of a paid plan with no renewal queued: days left,
 * the paid practice used in this plan that FREE will lock again, and a link
 * to renew (the new plan starts when this one ends, so no day is lost).
 * During a free Plus trial it counts down to the trial's end instead.
 */
export function PlanExpiryBanner({ showRenewLink = true }: { showRenewLink?: boolean }) {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: PLAN_QUERY_KEYS.expirySummary,
    queryFn: planService.getExpirySummary,
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
  const state = planExpiryBannerState(data);
  const now = useNow(!!state?.trialEndsAt);
  const countdown = state?.trialEndsAt ? trialCountdown(state.trialEndsAt, now) : null;

  // When the trial runs out, ask the server once so the banner shows what comes next.
  const refreshed = useRef(false);
  useEffect(() => {
    if (countdown?.expired && !refreshed.current) {
      refreshed.current = true;
      void queryClient.invalidateQueries({ queryKey: PLAN_QUERY_KEYS.expirySummary });
    }
  }, [countdown?.expired, queryClient]);

  if (!state) return null;

  return (
    <section
      aria-label={countdown ? "Thời gian dùng thử gói Plus" : "Gói dịch vụ sắp hết hạn"}
      className="rounded-2xl border border-amber-300 bg-amber-50 p-4 sm:p-5 dark:border-amber-900/60 dark:bg-amber-950/30"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Clock size={20} strokeWidth={2.25} className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-bold text-slate-900 dark:text-slate-100">{state.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-pretty text-slate-700 dark:text-slate-300">
              <span className="block text-balance">{state.body}</span>
              {state.detail && <span className="block text-balance">{state.detail}</span>}
            </p>
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
        {(countdown || showRenewLink) && (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-3 pl-8 sm:flex-nowrap sm:justify-end sm:pl-0">
            {countdown && (
              <p
                role="timer"
                aria-label={`Thời gian dùng thử ${countdown.spoken}`}
                className={`flex items-baseline gap-1.5 whitespace-nowrap tabular-nums ${
                  countdown.urgent ? "text-rose-700 dark:text-rose-400" : "text-slate-900 dark:text-slate-100"
                }`}
              >
                <span aria-hidden="true" className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                  {countdown.expired ? "hết hạn" : "còn"}
                </span>
                {countdown.days > 0 && (
                  <>
                    <span aria-hidden="true" className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                      <FixedDigits text={String(countdown.days)} />
                    </span>
                    <span aria-hidden="true" className="mr-1 text-sm font-semibold text-slate-600 dark:text-slate-400">
                      ngày
                    </span>
                  </>
                )}
                <span aria-hidden="true" className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                  <FixedDigits text={countdown.clock} />
                </span>
              </p>
            )}
            {showRenewLink && (
              <Link
                href="/plans"
                className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 px-4 text-sm font-extrabold text-white shadow-xs transition-colors hover:bg-amber-600"
              >
                {state.actionLabel}
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
