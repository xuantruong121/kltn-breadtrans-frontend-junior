"use client";

import { useQuery } from "@tanstack/react-query";

import { FoundationCards } from "@/components/learning-path/FoundationCards";
import { learningPathService } from "@/lib/api/services/learningPath.service";
import { useAuthStore } from "@/stores/authStore";

const MAX_ITEMS = 4;

/** Vocabulary and grammar items under a language-use priority of the diagnostic. */
export function FoundationSuggestions() {
  const { user } = useAuthStore();
  const enabled = user?.role === "STUDENT";
  const { data } = useQuery({
    queryKey: ["learning-path-today"],
    queryFn: learningPathService.getToday,
    enabled,
    staleTime: 60_000,
  });
  const items = (data?.foundation ?? []).slice(0, MAX_ITEMS);
  if (!enabled || items.length === 0) return null;

  return (
    <div className="mt-4">
      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Từ vựng và ngữ pháp nên học</p>
      <div className="mt-2">
        <FoundationCards items={items} />
      </div>
    </div>
  );
}
