"use client";

import { useQuery } from "@tanstack/react-query";
import { TrendingUp } from "lucide-react";

import { learningPathService } from "@/lib/api/services/learningPath.service";
import { PRACTICE_SKILL_LABEL, practiceLevelLabel } from "@/lib/learning-path/practiceLevel";
import { progressLine } from "@/lib/learning-path/recommendation";

/** "Tiến bộ của bạn": internal practice indicators per skill, shown once there is something to show. */
export function ProgressCard({ enabled }: { enabled: boolean }) {
  const { data } = useQuery({
    queryKey: ["learning-path-progress"],
    queryFn: learningPathService.getProgress,
    enabled,
    staleTime: 60_000,
  });
  if (!data?.some((row) => row.attempts > 0)) return null;

  return (
    <section
      aria-labelledby="progress-heading"
      className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-7"
    >
      <h2 id="progress-heading" className="flex items-center gap-2 text-xl font-black text-slate-900 dark:text-slate-100">
        <TrendingUp size={22} className="text-blue-700 dark:text-blue-300" aria-hidden="true" />
        Tiến bộ của bạn
      </h2>
      <p className="mt-1 text-base text-slate-600 dark:text-slate-400">
        Tính từ các bài bạn đã làm trên BreadTrans. Đây là chỉ số luyện tập nội bộ.
      </p>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.map((row) => (
          <li key={row.skill}>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100">{PRACTICE_SKILL_LABEL[row.skill]}</p>
            <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">
              {row.startLevel && row.levelsGained > 0
                ? `${practiceLevelLabel(row.startLevel)} lên ${practiceLevelLabel(row.currentLevel)}`
                : `Mức ${practiceLevelLabel(row.currentLevel)}`}
            </p>
            <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{progressLine(row)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
