"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Compass } from "lucide-react";

import { learningPathService } from "@/lib/api/services/learningPath.service";
import type { PracticeSkill } from "@/lib/learning-path/practiceLevel";
import { useAuthStore } from "@/stores/authStore";
import { RecommendationItemCard } from "./RecommendationItemCard";

const FIRST_VISIBLE = 8;

/** "Đề xuất cho bạn" on a skill page (F7.1): ranked for this learner, locked items with their reason. */
export function RecommendedForYou({ skill }: { skill: PracticeSkill }) {
  const [expanded, setExpanded] = useState(false);
  const { user } = useAuthStore();
  const enabled = user?.role === "STUDENT";
  const queryKey = ["learning-path-recommended", skill];
  const { data } = useQuery({
    queryKey,
    queryFn: () => learningPathService.getRecommended(skill),
    enabled,
    staleTime: 60_000,
  });
  if (!enabled || !data?.length) return null;
  const items = expanded ? data : data.slice(0, FIRST_VISIBLE);

  return (
    <section
      aria-labelledby={`recommended-${skill}`}
      className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900/60 dark:bg-blue-950/20 sm:p-5"
    >
      <h2 id={`recommended-${skill}`} className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-slate-100">
        <Compass size={20} className="text-blue-700 dark:text-blue-300" aria-hidden="true" />
        Đề xuất cho bạn
      </h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Xếp theo mức luyện tập, hướng nghề và kết quả các bài bạn đã làm.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <RecommendationItemCard
            key={`${item.contentType}:${item.contentId}`}
            item={item}
            invalidateKeys={[queryKey, ["learning-path-today"]]}
          />
        ))}
      </div>
      {!expanded && data.length > FIRST_VISIBLE && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-blue-200 bg-white px-4 text-sm font-bold text-slate-700 hover:border-blue-400 dark:border-blue-900/60 dark:bg-slate-900 dark:text-slate-300"
        >
          Xem thêm {data.length - FIRST_VISIBLE} bài
          <ChevronDown size={16} aria-hidden="true" />
        </button>
      )}
    </section>
  );
}
