"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { recommendationDisplayTitle } from "@/lib/catalog/displayTitles";
import { PRACTICE_SKILL_LABEL } from "@/lib/learning-path/practiceLevel";
import { SKILL_LIST_ROUTE, doneLine, nudgeReason, type TodaySlot } from "@/lib/learning-path/recommendation";
import { RecommendationItemCard } from "./RecommendationItemCard";

/**
 * One slot of "Bài luyện hôm nay": the skill's item to do, the item done today,
 * or a note that the skill has nothing at the learner's level yet.
 */
export function TodaySlotCard({ slot, invalidateKeys }: { slot: TodaySlot; invalidateKeys: unknown[][] }) {
  const label = PRACTICE_SKILL_LABEL[slot.skill];

  if (slot.state === "TODO" && slot.item) {
    return (
      <RecommendationItemCard
        item={slot.item}
        invalidateKeys={invalidateKeys}
        leadReason={slot.nudged ? nudgeReason(slot.skill) : undefined}
        highlight={slot.nudged}
      />
    );
  }

  if (slot.state === "DONE") {
    return (
      <article className="flex h-full flex-col justify-between rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20">
        <div>
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            {label}
            {slot.item ? ` · ${slot.item.levelLabel}` : ""}
          </p>
          <h3 className="mt-1 text-base font-bold leading-snug text-slate-900 dark:text-slate-100">
            {slot.item ? recommendationDisplayTitle(slot.item) : `Bài ${label}`}
          </h3>
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 size={16} aria-hidden="true" />
            {doneLine(slot.done)}
          </p>
        </div>
        <div className="mt-4 flex justify-end">
          <Link
            href={SKILL_LIST_ROUTE[slot.skill]}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3.5 text-sm font-bold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-300"
          >
            Luyện thêm {label}
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </article>
    );
  }

  return (
    <article className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div>
        <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">{label}</p>
        <p className="mt-1 text-base text-slate-700 dark:text-slate-300">Chưa có bài {label} vừa mức của bạn.</p>
      </div>
      <div className="mt-4 flex justify-end">
        <Link
          href={SKILL_LIST_ROUTE[slot.skill]}
          className="inline-flex min-h-10 items-center gap-1.5 text-sm font-bold text-blue-700 hover:underline dark:text-blue-300"
        >
          Xem bài {label}
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
