"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, NotebookPen } from "lucide-react";

import { MISTAKE_SKILLS, mistakesService } from "@/lib/api/services/mistakes.service";
import { MISTAKE_SKILL_LABEL } from "@/lib/mistakes/mistakeView";

export const MISTAKE_SUMMARY_KEY = ["mistakes", "summary"] as const;

/** Dashboard entry to the mistake notebook. Hidden while the learner has no open mistake. */
export function MistakesDashboardCard({ enabled }: { enabled: boolean }) {
  const { data } = useQuery({
    queryKey: MISTAKE_SUMMARY_KEY,
    queryFn: mistakesService.getSummary,
    enabled,
    staleTime: 60_000,
  });
  if (!data || data.open === 0) return null;
  const skills = MISTAKE_SKILLS.filter((skill) => data.bySkill[skill] > 0);

  return (
    <section
      aria-labelledby="mistakes-card-heading"
      className="flex flex-col gap-4 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between sm:p-7"
    >
      <div className="min-w-0">
        <h2
          id="mistakes-card-heading"
          className="flex items-center gap-2 text-xl font-black text-slate-900 dark:text-slate-100"
        >
          <NotebookPen size={22} strokeWidth={2} className="text-amber-700 dark:text-amber-400" aria-hidden="true" />
          {data.open} lỗi chưa khắc phục
        </h2>
        <p className="mt-1 text-base text-slate-700 dark:text-slate-300">
          {skills.map((skill) => `${MISTAKE_SKILL_LABEL[skill]} ${data.bySkill[skill]}`).join(" · ")}
        </p>
      </div>
      <Link
        href="/mistakes"
        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        Ôn lỗi <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
      </Link>
    </section>
  );
}
