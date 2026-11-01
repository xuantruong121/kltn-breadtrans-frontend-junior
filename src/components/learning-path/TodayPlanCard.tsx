"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarCheck, ChevronDown } from "lucide-react";

import { learningPathService } from "@/lib/api/services/learningPath.service";
import { PRACTICE_SKILL_LABEL, PRACTICE_SKILL_ORDER } from "@/lib/learning-path/practiceLevel";
import {
  SKILL_LIST_ROUTE,
  filterBySkill,
  skillsWithItems,
  totalMinutes,
  type SkillFilter,
} from "@/lib/learning-path/recommendation";
import { FoundationCards } from "./FoundationCards";
import { RecommendationItemCard } from "./RecommendationItemCard";

const FIRST_VISIBLE = 6;
const INVALIDATE = [["learning-path-today"]];

/** Dashboard "Bài luyện hôm nay" (F5.3b): open items sized to the learner's minutes per day, then other choices. */
export function TodayPlanCard({ enabled }: { enabled: boolean }) {
  const [filter, setFilter] = useState<SkillFilter>("ALL");
  const [expanded, setExpanded] = useState(false);
  const { data } = useQuery({
    queryKey: ["learning-path-today"],
    queryFn: learningPathService.getToday,
    enabled,
    staleTime: 60_000,
  });
  if (!data?.items.length) return null;

  const more = data.more ?? [];
  const matching = filterBySkill(more, filter);
  const visible = expanded ? matching : matching.slice(0, FIRST_VISIBLE);
  const chips: SkillFilter[] = ["ALL", ...skillsWithItems(more, PRACTICE_SKILL_ORDER)];
  const pick = (next: SkillFilter) => {
    setFilter(next);
    setExpanded(false);
  };

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
            invalidateKeys={INVALIDATE}
          />
        ))}
      </div>

      {(data.foundation?.length ?? 0) > 0 && (
        <div className="mt-7 border-t border-slate-200 pt-6 dark:border-slate-800">
          <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">Từ vựng và ngữ pháp</h3>
          <div className="mt-3">
            <FoundationCards items={data.foundation ?? []} />
          </div>
        </div>
      )}

      {more.length > 0 && (
        <div className="mt-7 border-t border-slate-200 pt-6 dark:border-slate-800">
          <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">Bài khác phù hợp với bạn</h3>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Lọc theo kỹ năng">
            {chips.map((chip) => (
              <button
                key={chip}
                type="button"
                aria-pressed={filter === chip}
                onClick={() => pick(chip)}
                className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                  filter === chip
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                }`}
              >
                {chip === "ALL" ? "Tất cả" : PRACTICE_SKILL_LABEL[chip]}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((item) => (
              <RecommendationItemCard
                key={`${item.contentType}:${item.contentId}`}
                item={item}
                invalidateKeys={INVALIDATE}
              />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {!expanded && matching.length > FIRST_VISIBLE && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:border-blue-300 dark:border-slate-700 dark:text-slate-300"
              >
                Xem thêm {matching.length - FIRST_VISIBLE} bài
                <ChevronDown size={16} aria-hidden="true" />
              </button>
            )}
            {filter !== "ALL" && (
              <Link
                href={SKILL_LIST_ROUTE[filter]}
                className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-blue-700 hover:underline dark:text-blue-300"
              >
                Xem tất cả bài {PRACTICE_SKILL_LABEL[filter]}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
