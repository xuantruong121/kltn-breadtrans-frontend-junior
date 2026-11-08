"use client";

import React, { useEffect, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { AvatarImage } from "@/components/ui/AvatarImage";
import type { LeaderboardEntry, LeaderboardResponse } from "@/lib/api/services/gamification.service";
import {
  LEAGUE_TIERS,
  formatCountdown,
  leagueZones,
  nextLeagueReset,
  xpToLeaveDemotion,
  xpToPromotion,
  type LeagueTier,
} from "../league";

/** Tier marks: one colour each, used only on the small dot and the active tab. */
const TIER_DOT: Record<LeagueTier, string> = {
  "Đồng": "bg-orange-700",
  "Bạc": "bg-slate-400",
  "Vàng": "bg-amber-400",
  "Bạch Kim": "bg-cyan-500",
  "Kim Cương": "bg-sky-600",
};

function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Time left to the Monday 00:01 reset; only this re-renders each second. */
function ResetCountdown() {
  const now = useNow(1_000);
  return (
    <span className="font-bold tabular-nums text-slate-900 dark:text-slate-100">{formatCountdown(nextLeagueReset(now) - now)}</span>
  );
}

function ZoneRule({ kind }: { kind: "up" | "down" }) {
  const up = kind === "up";
  return (
    <li
      className={`flex items-center gap-2 py-1.5 text-xs font-bold ${
        up ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"
      }`}
    >
      {up ? <ArrowUp size={14} strokeWidth={2.5} aria-hidden="true" /> : <ArrowDown size={14} strokeWidth={2.5} aria-hidden="true" />}
      <span>{up ? "Vùng lên hạng ở trên vạch này" : "Vùng xuống hạng từ vạch này"}</span>
      <span className={`h-px flex-1 ${up ? "bg-emerald-200 dark:bg-emerald-900" : "bg-rose-200 dark:bg-rose-900"}`} />
    </li>
  );
}

function Row({ entry, isMe, showTier }: { entry: LeaderboardEntry; isMe: boolean; showTier: boolean }) {
  const podium = entry.rank <= 3;
  return (
    <li
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${
        isMe ? "bg-amber-50 ring-1 ring-amber-300 dark:bg-amber-950/40 dark:ring-amber-800" : ""
      }`}
    >
      <span
        className={`w-7 shrink-0 text-center text-sm font-bold tabular-nums ${
          podium ? "text-amber-700 dark:text-amber-400" : "text-slate-500 dark:text-slate-400"
        }`}
      >
        {entry.rank}
      </span>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
        <AvatarImage
          src={entry.avatarUrl}
          alt=""
          className="h-full w-full object-cover"
          fallback={entry.displayName?.[0]?.toUpperCase() || "H"}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
          {entry.displayName || "Học viên"}
          {isMe && <span className="ml-1.5 font-bold text-amber-700 dark:text-amber-400">· Bạn</span>}
        </span>
        {showTier && <span className="block text-xs text-slate-500 dark:text-slate-400">Hạng {entry.tier}</span>}
      </span>
      <span className="shrink-0 text-right text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">
        {entry.weeklyExp.toLocaleString("vi-VN")}
        <span className="ml-1 text-xs font-medium text-slate-500 dark:text-slate-400">XP</span>
      </span>
    </li>
  );
}

export function WeeklyLeague({
  data,
  isLoading,
  tab,
  onTab,
  myTier,
  myUserId,
}: {
  data: LeaderboardResponse | undefined;
  isLoading: boolean;
  tab: LeagueTier | "ALL";
  onTab: (tab: LeagueTier | "ALL") => void;
  myTier: LeagueTier | null;
  myUserId: number | null;
}) {
  const entries = data?.entries ?? [];
  const me = data?.currentUserRank ?? null;
  const isTierView = tab !== "ALL";
  const size = data?.tierSize ?? entries.length;
  const zones = isTierView ? leagueZones(size, tab) : { promoteCount: 0, demoteFrom: null };
  const viewingMyTier = isTierView && myTier === tab && me !== null;
  const meInList = me ? entries.some((e) => e.userId === me.userId) : false;

  let finding: string | null = null;
  if (viewingMyTier && me) {
    const up = xpToPromotion(me.rank, me.weeklyExp, zones.promoteCount, entries);
    const out = xpToLeaveDemotion(me.rank, me.weeklyExp, zones.demoteFrom, entries);
    if (out !== null) finding = `Bạn đang trong vùng xuống hạng. Cần thêm ${out.toLocaleString("vi-VN")} XP để thoát.`;
    else if (up === 0) finding = `Bạn đang trong vùng lên hạng. Giữ vị trí tới khi chốt tuần để lên hạng ${LEAGUE_TIERS[LEAGUE_TIERS.indexOf(tab) + 1]}.`;
    else if (up !== null) finding = `Cần thêm ${up.toLocaleString("vi-VN")} XP để vào vùng lên hạng.`;
    else if (zones.promoteCount === 0) finding = "Kim Cương là hạng cao nhất. Giữ vị trí để không xuống hạng.";
  }

  const title = isTierView ? `Giải ${tab}` : "Tất cả các hạng";

  return (
    <section aria-labelledby="league-title" className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="league-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
          {title} · tuần này
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Chốt sau <ResetCountdown />
        </p>
      </div>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        {finding ??
          "Xếp theo XP kiếm được trong tuần. 0:01 thứ Hai, 20% đứng đầu mỗi hạng lên hạng, 20% cuối xuống hạng."}
      </p>

      <div role="tablist" aria-label="Chọn hạng" className="mt-4 flex gap-1.5 overflow-x-auto pb-1">
        {(["ALL", ...LEAGUE_TIERS] as const).map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTab(t)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                active
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              {t !== "ALL" && <span className={`h-2 w-2 rounded-full ${TIER_DOT[t]}`} aria-hidden="true" />}
              {t === "ALL" ? "Tất cả" : t}
              {t === myTier && <span className="sr-only"> (hạng của bạn)</span>}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <ul className="mt-3 space-y-2" aria-hidden="true">
          {Array.from({ length: 5 }, (_, i) => (
            <li key={i} className="h-12 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          ))}
        </ul>
      ) : entries.length === 0 ? (
        <p className="mt-6 pb-4 text-sm text-slate-600 dark:text-slate-400">
          Chưa có ai trong {isTierView ? `hạng ${tab}` : "bảng"} tuần này. Làm một bài luyện có thưởng để ghi XP đầu tiên.
        </p>
      ) : (
        <ol className="mt-3 space-y-0.5">
          {entries.map((entry) => (
            <React.Fragment key={entry.userId}>
              {zones.demoteFrom !== null && entry.rank === zones.demoteFrom && <ZoneRule kind="down" />}
              <Row entry={entry} isMe={entry.userId === myUserId} showTier={!isTierView} />
              {zones.promoteCount > 0 && entry.rank === zones.promoteCount && entries.length > zones.promoteCount && (
                <ZoneRule kind="up" />
              )}
            </React.Fragment>
          ))}
          {me && !meInList && (!isTierView || myTier === tab) && (
            <>
              <li className="py-1 text-center text-xs text-slate-500" aria-hidden="true">
                ⋯
              </li>
              <Row entry={{ ...me, rank: me.rank } as LeaderboardEntry} isMe showTier={!isTierView} />
            </>
          )}
        </ol>
      )}
      {isTierView && size > entries.length && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Hiện 20 người đứng đầu trong {size.toLocaleString("vi-VN")} học viên của hạng.
        </p>
      )}
    </section>
  );
}
