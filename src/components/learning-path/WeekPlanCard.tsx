"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarRange } from "lucide-react";

import { learningPathService } from "@/lib/api/services/learningPath.service";
import { PRACTICE_SKILL_LABEL } from "@/lib/learning-path/practiceLevel";
import { estimateText, weekPercent } from "@/lib/learning-path/recommendation";

const formatDate = (iso: string) => new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });

/** "Tuần này" on the dashboard: weekly targets per skill and a rough date for the next levels. */
export function WeekPlanCard({ enabled }: { enabled: boolean }) {
  const { data } = useQuery({
    queryKey: ["learning-path-week"],
    queryFn: learningPathService.getWeek,
    enabled,
    staleTime: 60_000,
  });
  if (!data) return null;

  return (
    <section
      aria-labelledby="week-plan-heading"
      className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-7"
    >
      <h2 id="week-plan-heading" className="flex items-center gap-2 text-xl font-black text-slate-900 dark:text-slate-100">
        <CalendarRange size={22} className="text-blue-700 dark:text-blue-300" aria-hidden="true" />
        Tuần này của bạn
      </h2>
      <p className="mt-1 text-base text-slate-600 dark:text-slate-400">
        Chia theo {data.minutesPerDay} phút mỗi ngày, mục tiêu và kỹ năng cần cải thiện.
      </p>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.skills.map((s) => (
          <li key={s.skill}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-base font-bold text-slate-900 dark:text-slate-100">{PRACTICE_SKILL_LABEL[s.skill]}</span>
              <span className="text-sm font-semibold tabular-nums text-slate-600 dark:text-slate-400">
                {s.doneThisWeek}/{s.target} bài
              </span>
            </div>
            <div
              role="progressbar"
              aria-label={`Tiến độ tuần ${PRACTICE_SKILL_LABEL[s.skill]}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={weekPercent(s.doneThisWeek, s.target)}
              className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
            >
              <div className="h-full rounded-full bg-blue-600" style={{ width: `${weekPercent(s.doneThisWeek, s.target)}%` }} />
            </div>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
              {s.nextLevelLabel
                ? s.remaining > 0
                  ? `Còn ${s.remaining} bài để mở mức ${s.nextLevelLabel}`
                  : `Đủ bài, cần điểm trung bình để mở mức ${s.nextLevelLabel}`
                : "Đã ở mức cao nhất"}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-300">{estimateText(data.estimate, formatDate)}</p>
    </section>
  );
}
