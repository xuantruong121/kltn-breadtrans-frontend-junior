"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarCheck } from "lucide-react";

import { learningPathService } from "@/lib/api/services/learningPath.service";
import { totalMinutes } from "@/lib/learning-path/recommendation";
import { RecommendationItemCard } from "./RecommendationItemCard";

/** Dashboard "Bài luyện hôm nay" (F5.3b): open items sized to the learner's minutes per day. */
export function TodayPlanCard({ enabled }: { enabled: boolean }) {
  const { data } = useQuery({
    queryKey: ["learning-path-today"],
    queryFn: learningPathService.getToday,
    enabled,
    staleTime: 60_000,
  });
  if (!data?.items.length) return null;

  return (
    <section
      aria-labelledby="today-plan-heading"
      className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-7"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="today-plan-heading" className="flex items-center gap-2 text-xl font-black text-slate-900 dark:text-slate-100">
            <CalendarCheck size={22} className="text-blue-700 dark:text-blue-300" aria-hidden="true" />
            Bài luyện hôm nay cho bạn
          </h2>
          <p className="mt-1 text-base text-slate-600 dark:text-slate-400">
            Chọn theo mức luyện tập và mục tiêu của bạn, vừa {data.minutesPerDay} phút mỗi ngày.
          </p>
        </div>
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
          Khoảng {totalMinutes(data.items)} phút
        </p>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {data.items.map((item) => (
          <RecommendationItemCard
            key={`${item.contentType}:${item.contentId}`}
            item={item}
            invalidateKeys={[["learning-path-today"]]}
          />
        ))}
      </div>
    </section>
  );
}
