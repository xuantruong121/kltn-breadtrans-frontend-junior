"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Bookmark, BookmarkCheck, Clock, Lock } from "lucide-react";

import { learningPathService } from "@/lib/api/services/learningPath.service";
import { PRACTICE_SKILL_LABEL } from "@/lib/learning-path/practiceLevel";
import { lockLabel, visibleReasons, type RecommendationItem } from "@/lib/learning-path/recommendation";

/** One recommended practice item with its reasons, lock state and save toggle. */
export function RecommendationItemCard({
  item,
  invalidateKeys,
}: {
  item: RecommendationItem;
  /** Query keys refreshed after save/unsave. */
  invalidateKeys: unknown[][];
}) {
  const queryClient = useQueryClient();
  const toggle = useMutation({
    mutationFn: () =>
      item.saved
        ? learningPathService.unsave(item.contentType, item.contentId)
        : learningPathService.save(item.contentType, item.contentId),
    onSuccess: () => invalidateKeys.forEach((queryKey) => queryClient.invalidateQueries({ queryKey })),
  });
  const lock = lockLabel(item.status);
  const reasons = visibleReasons(item);

  return (
    <article className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div>
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
            {PRACTICE_SKILL_LABEL[item.skill]} · {item.levelLabel}
          </p>
          <button
            type="button"
            onClick={() => toggle.mutate()}
            disabled={toggle.isPending}
            aria-pressed={item.saved}
            aria-label={item.saved ? "Bỏ lưu bài này" : "Lưu bài này"}
            className="-m-2 flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-blue-700 disabled:opacity-50 dark:hover:bg-slate-800"
          >
            {item.saved ? (
              <BookmarkCheck size={20} className="text-blue-700 dark:text-blue-300" aria-hidden="true" />
            ) : (
              <Bookmark size={20} aria-hidden="true" />
            )}
          </button>
        </div>
        <h3 className="mt-1 text-base font-bold leading-snug text-slate-900 dark:text-slate-100">{item.title}</h3>
        {reasons.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-sm text-slate-600 dark:text-slate-400">
            {reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
          <Clock size={15} aria-hidden="true" />~{item.minutes} phút
        </span>
        {lock ? (
          <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-sm font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
            <Lock size={14} aria-hidden="true" />
            {lock}
          </span>
        ) : (
          <Link
            href={item.route}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 text-sm font-bold text-white hover:bg-blue-700"
          >
            Luyện ngay
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        )}
      </div>
    </article>
  );
}
