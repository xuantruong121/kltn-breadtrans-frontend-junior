"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";

import { RecommendationItemCard } from "@/components/learning-path/RecommendationItemCard";
import { learningPathService } from "@/lib/api/services/learningPath.service";
import { PRACTICE_SKILL_LABEL, type PracticeSkill } from "@/lib/learning-path/practiceLevel";
import { SKILL_LIST_ROUTE, otherSuggestions } from "@/lib/learning-path/recommendation";
import { useAuthStore } from "@/stores/authStore";

const MAX_ITEMS = 4;

/** Ranked items for one skill under a diagnostic priority, beside its authored links. */
export function SkillSuggestions({ skill, excludedRoutes }: { skill: PracticeSkill; excludedRoutes: string[] }) {
  const { user } = useAuthStore();
  const enabled = user?.role === "STUDENT";
  const queryKey = ["learning-path-recommended", skill];
  const { data } = useQuery({
    queryKey,
    queryFn: () => learningPathService.getRecommended(skill),
    enabled,
    staleTime: 60_000,
  });
  const items = otherSuggestions(data ?? [], excludedRoutes, MAX_ITEMS);
  if (!enabled || items.length === 0) return null;

  return (
    <div className="mt-4">
      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Bài khác cho kỹ năng này</p>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <RecommendationItemCard
            key={`${item.contentType}:${item.contentId}`}
            item={item}
            invalidateKeys={[queryKey, ["learning-path-today"]]}
          />
        ))}
      </div>
      <Link
        href={SKILL_LIST_ROUTE[skill]}
        className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-blue-700 hover:underline dark:text-blue-300"
      >
        Xem tất cả bài {PRACTICE_SKILL_LABEL[skill]}
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </div>
  );
}
