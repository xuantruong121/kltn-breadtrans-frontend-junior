"use client";

import React, { useMemo, useState } from "react";
import type { UserBadge } from "@/lib/api/services/gamification.service";
import { badgeViews, nextBadge, type BadgeFacts, type BadgeView } from "../badges";
import { BadgeMedal } from "./BadgeMedal";
import { BadgeDetailModal } from "./BadgeDetailModal";

export function BadgesCabinet({
  myBadges,
  facts,
  isLoading = false,
}: {
  myBadges: UserBadge[];
  facts: BadgeFacts;
  isLoading?: boolean;
}) {
  const [open, setOpen] = useState<BadgeView | null>(null);
  const views = useMemo(() => badgeViews(facts, myBadges), [facts, myBadges]);
  const earnedCount = views.filter((v) => v.earnedAt !== null).length;
  const next = nextBadge(views);

  return (
    <section aria-labelledby="badges-title" className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="badges-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Huy hiệu của bạn
        </h2>
        <span className="text-sm tabular-nums text-slate-600 dark:text-slate-400">
          {earnedCount}/{views.length} đã đạt
        </span>
      </div>

      {next?.current && (
        <div className="mt-3 rounded-lg bg-amber-50 p-3 dark:bg-amber-950/40">
          <p className="text-sm text-slate-800 dark:text-slate-200">
            Gần đạt nhất: <span className="font-bold">{next.name}</span>, {next.rule.toLowerCase()}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-amber-100 dark:bg-amber-900/50">
              <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.round(next.current.ratio * 100)}%` }} />
            </div>
            <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-300">
              {next.current.value.toLocaleString("vi-VN")}/{next.current.target.toLocaleString("vi-VN")} {next.current.unit}
            </span>
          </div>
        </div>
      )}

      <ul className="mt-4 grid grid-cols-4 gap-x-2 gap-y-4" aria-busy={isLoading}>
        {views.map((view) => (
          <li key={view.name}>
            <button
              type="button"
              onClick={() => setOpen(view)}
              className="flex w-full flex-col items-center gap-1.5 rounded-lg p-1.5 text-center transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-amber-500 dark:hover:bg-slate-800"
              aria-label={`${view.name}: ${view.earnedAt !== null ? "đã đạt" : "chưa đạt"}. Xem điều kiện`}
            >
              <BadgeMedal name={view.name} group={view.group} earned={view.earnedAt !== null} size={52} />
              <span
                className={`text-xs font-semibold leading-tight ${
                  view.earnedAt !== null ? "text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {view.name}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <BadgeDetailModal badge={open} onClose={() => setOpen(null)} />
    </section>
  );
}
