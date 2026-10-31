"use client";

import { useQuery } from "@tanstack/react-query";
import { Compass } from "lucide-react";

import { learningPathService } from "@/lib/api/services/learningPath.service";
import type { PracticeSkill } from "@/lib/learning-path/practiceLevel";
import { useAuthStore } from "@/stores/authStore";
import { RecommendationItemCard } from "./RecommendationItemCard";

/** "Đề xuất cho bạn" on a skill page (F7.1): ranked for this learner, locked items with their reason. */
export function RecommendedForYou({ skill }: { skill: PracticeSkill }) {
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
  const items = data.slice(0, 4);

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
    </section>
  );
}
