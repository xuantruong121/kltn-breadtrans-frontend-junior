"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Lock } from "lucide-react";

import { learningPathService } from "@/lib/api/services/learningPath.service";
import { isStarterLearner, type LearnerProfile } from "@/lib/learning-path/onboarding";

/** The Mất gốc path on the dashboard (F5.4). It leaves once every step is done. */
export function StarterRoadmapCard({ profile }: { profile: LearnerProfile | undefined }) {
  const enabled = isStarterLearner(profile);
  const { data } = useQuery({
    queryKey: ["learning-path-roadmap"],
    queryFn: learningPathService.getRoadmap,
    enabled,
    staleTime: 60_000,
  });
  if (!enabled || !data?.total || data.done === data.total) return null;

  return (
    <section
      aria-labelledby="starter-roadmap-heading"
      className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="starter-roadmap-heading" className="text-xl font-black text-slate-900 dark:text-slate-100">
          Lộ trình cho người mất gốc
        </h2>
        <p className="text-sm font-semibold tabular-nums text-slate-600 dark:text-slate-400">
          {data.done}/{data.total} bước
        </p>
      </div>
      <ol className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
        {data.steps.map((step, index) => {
          const next = step.key === data.nextKey;
          return (
            <li key={step.key} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
              <span
                aria-hidden="true"
                className={`flex size-7 flex-none items-center justify-center rounded-full text-sm font-bold ${
                  step.done
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    : next
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {step.done ? <Check size={15} /> : index + 1}
              </span>
              <div className="min-w-0 flex-1 basis-48">
                <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {step.title}
                  {step.done && <span className="sr-only"> (đã xong)</span>}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {step.why} Khoảng {step.minutes} phút.
                </p>
              </div>
              {step.locked && !step.done ? (
                <span className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                  <Lock size={14} aria-hidden="true" />
                  Mở khi đạt mức Cơ bản
                </span>
              ) : (
                <Link
                  href={step.route}
                  className={
                    next
                      ? "inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 text-sm font-bold text-white hover:bg-blue-700"
                      : "inline-flex min-h-10 items-center px-2 text-sm font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-300"
                  }
                >
                  {next ? "Học tiếp" : step.done ? "Làm lại" : "Mở bài"}
                  {next && <ArrowRight size={15} aria-hidden="true" />}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
