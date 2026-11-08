"use client";

import React, { useEffect, useState } from "react";
import { Activity, Award, BookOpen, Flame, Megaphone, Medal, Swords, TrendingUp, Trophy, X } from "lucide-react";
import type { HallOfFame, RankingActivity, UserBadge } from "@/lib/api/services/gamification.service";
import { BadgesCabinet } from "@/modules/arena/components/BadgesCabinet";
import { badgeViews, nextBadge, type BadgeFacts } from "@/modules/arena/badges";
import { PersonAvatar } from "./RankingBoard";
import { timeAgo } from "../rankingLogic";

const HALL = [
  { key: "xp", title: "Bậc thầy XP", unit: (v: number) => `${v.toLocaleString("vi-VN")} XP`, icon: Trophy, tone: "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30", iconTone: "bg-amber-500", label: "text-amber-800 dark:text-amber-300" },
  { key: "streak", title: "Chuỗi dài nhất", unit: (v: number) => `${v.toLocaleString("vi-VN")} ngày`, icon: Flame, tone: "border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/30", iconTone: "bg-orange-500", label: "text-orange-800 dark:text-orange-300" },
  { key: "referral", title: "Đại sứ giới thiệu", unit: (v: number) => `${v.toLocaleString("vi-VN")} bạn`, icon: Megaphone, tone: "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30", iconTone: "bg-emerald-600", label: "text-emerald-800 dark:text-emerald-300" },
] as const;

const FEED_ICON = { study: BookOpen, badge: Award, arena: Swords, level: TrendingUp, streak: Flame } as const;

/** Đại sảnh danh vọng, the recent activity and the learner's badges, in the right column. */
export function RankingSidebar({
  hall,
  activity,
  isGuest,
  myBadges,
  facts,
}: {
  hall: HallOfFame | undefined;
  activity: RankingActivity[] | undefined;
  isGuest: boolean;
  myBadges: UserBadge[];
  facts: BadgeFacts;
}) {
  const [cabinetOpen, setCabinetOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const views = badgeViews(facts, myBadges);
  const earned = views.filter((v) => v.earnedAt !== null).length;
  const next = nextBadge(views);

  return (
    <aside className="space-y-6">
      <section aria-labelledby="hall-title" className="space-y-3">
        <h2 id="hall-title" className="flex items-center gap-2 text-xl font-extrabold text-slate-900 dark:text-slate-100">
          <Trophy size={22} strokeWidth={2.25} className="text-amber-500" aria-hidden="true" />
          Đại sảnh danh vọng
        </h2>
        {HALL.map((h) => {
          const who = hall?.[h.key] ?? null;
          const Icon = h.icon;
          return (
            <div key={h.key} className={`relative rounded-2xl border p-4 ${h.tone}`}>
              <p className={`text-xs font-extrabold uppercase tracking-wide ${h.label}`}>{h.title}</p>
              <span className={`absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl text-white ${h.iconTone}`}>
                <Icon size={18} strokeWidth={2.25} aria-hidden="true" />
              </span>
              {who ? (
                <div className="mt-3 flex items-center gap-3">
                  <PersonAvatar name={who.displayName} url={who.avatarUrl} size={40} />
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900 dark:text-slate-100">{who.displayName}</p>
                    <p className="font-extrabold tabular-nums text-sky-700 dark:text-sky-400">{h.unit(who.value)}</p>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">Chưa có ai.</p>
              )}
            </div>
          );
        })}
      </section>

      <section aria-labelledby="feed-title" className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 id="feed-title" className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
          <Activity size={18} strokeWidth={2.25} className="text-emerald-600" aria-hidden="true" />
          Hoạt động học tập gần đây
        </h2>
        {activity && activity.length > 0 ? (
          <ul className="mt-3 max-h-96 space-y-2 overflow-y-auto pr-1">
            {activity.map((a) => {
              const Icon = FEED_ICON[a.kind];
              return (
                <li key={a.id} className={`flex gap-3 rounded-xl px-3 py-2 ${a.kind === "level" ? "bg-amber-50 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:ring-amber-900" : "bg-slate-50 dark:bg-slate-800/50"}`}>
                  <Icon size={16} strokeWidth={2.25} className="mt-0.5 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden="true" />
                  <div className="min-w-0 text-sm">
                    <p className="text-slate-800 dark:text-slate-200">
                      <span className="font-bold">{a.name}</span> {a.text}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{timeAgo(a.at, now)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">Chưa có hoạt động nào.</p>
        )}
      </section>

      <section aria-labelledby="badges-title" className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-2">
          <h2 id="badges-title" className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
            <Medal size={18} strokeWidth={2.25} className="text-amber-600" aria-hidden="true" />
            Huy hiệu của bạn
          </h2>
          {!isGuest && <span className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-300">{earned}/{views.length} đã đạt</span>}
        </div>
        {isGuest ? (
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">Đăng nhập để xem huy hiệu bạn đã đạt và những huy hiệu sắp đạt.</p>
        ) : (
          <>
            {next?.current && (
              <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2.5 dark:bg-amber-950/30">
                <p className="text-sm text-amber-900 dark:text-amber-200">
                  Gần đạt nhất: <span className="font-bold">{next.name}</span>
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-amber-100 dark:bg-amber-900/50">
                  <span className="block h-full bg-amber-500" style={{ width: `${Math.round(next.current.ratio * 100)}%` }} />
                </div>
                <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-200/80">
                  {next.current.value.toLocaleString("vi-VN")}/{next.current.target.toLocaleString("vi-VN")} {next.current.unit}
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={() => setCabinetOpen(true)}
              className="mt-3 w-full rounded-lg border border-slate-200 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Xem tủ huy hiệu
            </button>
          </>
        )}
      </section>

      {cabinetOpen && (
        <div className="fixed inset-0 z-[100] flex overflow-y-auto bg-slate-900/60 p-4" onClick={() => setCabinetOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Tủ huy hiệu" className="relative m-auto w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setCabinetOpen(false)}
              aria-label="Đóng tủ huy hiệu"
              className="absolute right-3 top-3 z-10 rounded-lg bg-white/90 p-1.5 text-slate-700 hover:bg-slate-100 dark:bg-slate-900/90 dark:text-slate-300"
            >
              <X size={18} strokeWidth={2.25} aria-hidden="true" />
            </button>
            <BadgesCabinet myBadges={myBadges} facts={facts} />
          </div>
        </div>
      )}
    </aside>
  );
}
