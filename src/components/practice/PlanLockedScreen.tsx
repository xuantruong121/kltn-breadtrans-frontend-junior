"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { plansHrefFor } from "@/modules/subscription/practicePlan";

/** Shown instead of an exercise the learner's plan does not open. */
export function PlanLockedScreen({
  plan,
  backHref,
}: {
  plan: "PLUS" | "PRO";
  /** Where "Quay lại danh sách" goes. */
  backHref: string;
}) {
  return (
    <div className="fixed inset-0 z-[45] flex h-dvh w-screen items-center justify-center bg-slate-50 p-6 text-center dark:bg-slate-950">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-lg sm:p-8 dark:border-amber-800/80 dark:bg-slate-900">
        <Lock className="mx-auto size-7 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <div>
          <h2 className="text-lg font-bold text-slate-900 sm:text-xl dark:text-slate-100">
            Nội dung dành cho gói {plan}
          </h2>
          <p className="mt-2 text-sm text-slate-700 sm:text-base dark:text-slate-300">
            {plan === "PRO"
              ? "Bài luyện này có trong hệ thống và chỉ mở cho gói PRO. Gói PLUS không bao gồm bài này."
              : "Bài luyện này có trong hệ thống và mở cho gói PLUS hoặc PRO."}
          </p>
        </div>
        <div className="flex flex-col gap-2.5 pt-2 sm:flex-row">
          <Link
            href={backHref}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Quay lại danh sách
          </Link>
          <Link
            href={plansHrefFor(plan)}
            className="w-full rounded-xl bg-amber-500 px-4 py-2.5 text-center text-sm font-bold text-slate-950 transition hover:bg-amber-600"
          >
            Xem gói {plan}
          </Link>
        </div>
      </div>
    </div>
  );
}
