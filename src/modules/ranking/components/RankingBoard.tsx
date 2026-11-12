"use client";

import React, { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown, Crown } from "lucide-react";
import { AvatarImage } from "@/components/ui/AvatarImage";
import type { RankingEntry, RankingResponse } from "@/lib/api/services/gamification.service";
import { METRICS, PERIODS, emptyPlace, formatValue, hasPeriods, initials, leagueLine, valueHeading, type RankingMetric, type RankingPeriod } from "../rankingLogic";

const TIER_TONE: Record<string, string> = {
  Đồng: "bg-orange-50 text-orange-800 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:ring-orange-900",
  Bạc: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
  Vàng: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900",
  "Bạch Kim": "bg-cyan-50 text-cyan-800 ring-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:ring-cyan-900",
  "Kim Cương": "bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900",
};

export function TierChip({ tier }: { tier: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1 ${TIER_TONE[tier] ?? TIER_TONE["Đồng"]}`}>
      {tier}
    </span>
  );
}

export function PersonAvatar({ name, url, size, ring = "" }: { name: string; url: string | null; size: number; ring?: string }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200 ${ring}`}
      style={{ width: size, height: size, fontSize: Math.max(11, size / 3) }}
    >
      <AvatarImage src={url} alt="" className="h-full w-full object-cover" fallback={initials(name)} />
    </span>
  );
}

function Segmented<T extends string>({ items, value, onChange, label, size = "md" }: { items: { id: T; label: string }[]; value: T; onChange: (v: T) => void; label: string; size?: "md" | "sm" }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
      {items.map((item) => (
        <button
          key={item.id}
          role="tab"
          type="button"
          aria-selected={value === item.id}
          onClick={() => onChange(item.id)}
          className={`rounded-lg font-semibold transition-colors ${size === "md" ? "px-4 py-2 text-sm" : "px-3 py-1.5 text-xs sm:text-sm"} ${
            value === item.id ? "bg-sky-600 text-white" : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

const MEDAL = {
  1: { ring: "ring-4 ring-amber-400", badge: "bg-amber-400 text-amber-950", size: 104 },
  2: { ring: "ring-4 ring-slate-300 dark:ring-slate-500", badge: "bg-slate-300 text-slate-900", size: 80 },
  3: { ring: "ring-4 ring-orange-300 dark:ring-orange-700", badge: "bg-orange-400 text-orange-950", size: 80 },
} as const;

function PodiumPlace({ entry, metric, place }: { entry: RankingEntry; metric: RankingMetric; place: 1 | 2 | 3 }) {
  const reduce = Boolean(useReducedMotion());
  const m = MEDAL[place];
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: place === 1 ? 0 : place === 2 ? 0.1 : 0.2, type: "spring", stiffness: 240, damping: 22 }}
      className={`flex min-w-0 flex-1 flex-col items-center text-center ${place === 1 ? "order-2 -mt-4" : place === 2 ? "order-1 mt-6" : "order-3 mt-6"}`}
    >
      <div className="relative">
        {place === 1 && <Crown size={26} strokeWidth={2.25} className="absolute -top-7 left-1/2 -translate-x-1/2 fill-amber-300 text-amber-500" aria-hidden="true" />}
        <PersonAvatar name={entry.displayName} url={entry.avatarUrl} size={m.size} ring={m.ring} />
        <span className={`absolute -bottom-2 left-1/2 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full text-sm font-extrabold shadow-sm ${m.badge}`}>{place}</span>
      </div>
      <p className={`mt-4 w-full truncate font-bold text-slate-900 dark:text-slate-100 ${place === 1 ? "text-lg" : "text-sm"}`}>{entry.displayName}</p>
      <p className={`font-extrabold tabular-nums ${place === 1 ? "text-xl text-amber-600 dark:text-amber-400" : "text-sm text-slate-700 dark:text-slate-300"}`}>{formatValue(metric, entry.value)}</p>
    </motion.div>
  );
}

/** Tabs, the top three on a podium, the table from rank 4, and the learner's own place. */
export function RankingBoard({
  data,
  isLoading,
  metric,
  period,
  onMetric,
  onPeriod,
  isGuest,
  myName,
  myAvatar,
  onLogin,
}: {
  data: RankingResponse | undefined;
  isLoading: boolean;
  metric: RankingMetric;
  period: RankingPeriod;
  onMetric: (m: RankingMetric) => void;
  onPeriod: (p: RankingPeriod) => void;
  isGuest: boolean;
  myName: string;
  myAvatar: string | null;
  onLogin: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const entries = data?.entries ?? [];
  const top = entries.slice(0, 3);
  const rest = entries.slice(3, expanded ? 50 : 10);
  const hidden = Math.max(0, Math.min(entries.length, 50) - 10);
  const me = data?.me ?? null;

  return (
    <section aria-label="Bảng xếp hạng" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented items={METRICS} value={metric} onChange={(m) => { onMetric(m); setExpanded(false); }} label="Tiêu chí xếp hạng" />
        {hasPeriods(metric) && <Segmented items={PERIODS} value={period} onChange={(p) => { onPeriod(p); setExpanded(false); }} label="Kỳ xếp hạng" size="sm" />}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-4 pb-6 pt-10 dark:border-slate-800 dark:bg-slate-900 sm:px-8">
        {isLoading ? (
          <div className="mx-auto h-40 max-w-md animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" aria-hidden="true" />
        ) : top.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-700 dark:text-slate-300">Chưa có ai trên bảng này. Hãy là người đầu tiên!</p>
        ) : (
          <div className="flex items-start justify-center gap-3 sm:gap-8">
            {top.map((e) => (
              <PodiumPlace key={e.userId} entry={e} metric={metric} place={e.rank as 1 | 2 | 3} />
            ))}
          </div>
        )}
      </div>

      {rest.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          {/* Fixed layout: a long name truncates instead of pushing the value column out. */}
          <table className="w-full table-fixed text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th scope="col" className="w-14 px-4 py-3 text-left sm:w-20 sm:px-6">Hạng</th>
                <th scope="col" className="px-2 py-3 text-left">Học viên</th>
                <th scope="col" className="hidden w-24 px-2 py-3 text-center sm:table-cell">Cấp độ</th>
                <th scope="col" className="w-28 px-4 py-3 text-right sm:w-32 sm:px-6">{valueHeading(metric)}</th>
              </tr>
            </thead>
            <tbody>
              {rest.map((e) => (
                <tr key={e.userId} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-3 font-bold tabular-nums text-slate-700 dark:text-slate-300 sm:px-6">{e.rank}</td>
                  <td className="px-2 py-3">
                    <span className="flex min-w-0 items-center gap-3">
                      <PersonAvatar name={e.displayName} url={e.avatarUrl} size={36} />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-slate-900 dark:text-slate-100">{e.displayName}</span>
                        <TierChip tier={e.tier} />
                      </span>
                    </span>
                  </td>
                  <td className="hidden px-2 py-3 text-center sm:table-cell">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">Cấp {e.level}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400 sm:px-6">{formatValue(metric, e.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!expanded && hidden > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="flex w-full items-center justify-center gap-1.5 border-t border-slate-100 py-3 text-sm font-semibold text-emerald-700 hover:bg-slate-50 dark:border-slate-800 dark:text-emerald-400 dark:hover:bg-slate-800/50"
            >
              Xem thêm {hidden} học viên khác
              <ChevronDown size={16} strokeWidth={2.25} aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      <div className="flex items-center gap-4 rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950/30 sm:px-6">
        {isGuest ? (
          <>
            <p className="flex-1 text-sm text-emerald-900 dark:text-emerald-200">Đăng nhập để xem vị trí của bạn trên bảng xếp hạng.</p>
            <button type="button" onClick={onLogin} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">
              Đăng nhập
            </button>
          </>
        ) : (
          <>
            <PersonAvatar name={myName} url={myAvatar} size={44} ring="ring-2 ring-emerald-300 dark:ring-emerald-700" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">Vị trí của bạn</p>
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                {me?.rank ? `Hạng ${me.rank} trên ${data?.total.toLocaleString("vi-VN")} học viên` : emptyPlace(metric, period)} · {myName}
              </p>
              {me && leagueLine(me.league) && <p className="truncate text-xs text-emerald-900 dark:text-emerald-200">{leagueLine(me.league)}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Cấp {me?.level ?? 1}</p>
              <p className="font-extrabold tabular-nums text-slate-900 dark:text-slate-100">{formatValue(metric, me?.value ?? 0)}</p>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
