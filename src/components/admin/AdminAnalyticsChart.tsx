"use client";

import { useState } from "react";
import { BarChart3 } from "lucide-react";
import {
  getBarHeightPercent,
  getRangeLabel,
  type DashboardTrend,
} from "./adminDashboardChartUtils";

interface AdminAnalyticsChartProps {
  data?: DashboardTrend[];
  range: string;
}

export default function AdminAnalyticsChart({ data, range }: AdminAnalyticsChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const trends = data ?? [];
  const maximum = Math.max(0, ...trends.map((trend) => trend.activityCount));
  const total = trends.reduce((sum, trend) => sum + trend.activityCount, 0);
  const peak = trends.reduce<DashboardTrend | null>(
    (currentPeak, trend) =>
      !currentPeak || trend.activityCount > currentPeak.activityCount ? trend : currentPeak,
    null,
  );
  const average = trends.length ? Math.round(total / trends.length) : 0;
  const rangeLabel = getRangeLabel(range);

  return (
    <section aria-labelledby="learning-activity-heading" className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 id="learning-activity-heading" className="text-base font-bold text-slate-950">
            Hoạt động học tập
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Lượt nộp bài và luyện nói đã hoàn thành trong {rangeLabel.toLowerCase()}.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
          <BarChart3 size={16} aria-hidden="true" /> {rangeLabel}
        </span>
      </header>

      {trends.length === 0 ? (
        <div className="flex min-h-48 items-center justify-center border border-dashed border-slate-200 bg-slate-50 px-5 text-center text-sm text-slate-500">
          Chưa có dữ liệu hoạt động trong kỳ này.
        </div>
      ) : (
        <div className="border-b border-slate-200 px-1 pt-7">
          <div className="relative flex h-60 items-end gap-1 sm:gap-2" role="list" aria-label={`Hoạt động học tập ${rangeLabel}`}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-slate-100" />
            <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-slate-100" />
            {trends.map((item, index) => {
              const isActive = activeIndex === index;
              const showTick = trends.length <= 12 || index === 0 || index === trends.length - 1 || index % 5 === 0;
              const height = getBarHeightPercent(item.activityCount, maximum);
              return (
                <div key={`${item.month}-${index}`} className="flex min-w-0 flex-1 flex-col items-center justify-end self-stretch" role="listitem">
                  <button
                    type="button"
                    className="group relative flex w-full flex-1 items-end justify-center rounded-t-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                    aria-label={`${item.month}: ${item.activityCount} lượt hoạt động học tập`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                    onFocus={() => setActiveIndex(index)}
                    onBlur={() => setActiveIndex(null)}
                  >
                    {isActive && (
                      <span className="pointer-events-none absolute bottom-[calc(100%+8px)] z-10 whitespace-nowrap border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-sm">
                        {item.month}: {item.activityCount} lượt
                      </span>
                    )}
                    <span className="sr-only">{item.activityCount} lượt</span>
                    <span
                      aria-hidden="true"
                      className={`w-full max-w-8 rounded-t-sm transition-colors ${
                        item.activityCount === 0
                          ? "bg-transparent"
                          : isActive
                            ? "bg-blue-700"
                            : "bg-blue-600"
                      }`}
                      style={{ height: `${height}%` }}
                    />
                  </button>
                  <span className={`mt-2 min-h-4 text-[11px] ${showTick ? "text-slate-500" : "text-transparent"}`} aria-hidden={!showTick}>
                    {item.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <dl className="grid grid-cols-3 divide-x divide-slate-200 border-y border-slate-200">
        <div className="py-3 pr-3">
          <dt className="text-xs text-slate-500">Tổng lượt</dt>
          <dd className="mt-1 text-lg font-semibold text-slate-950">{total.toLocaleString()}</dd>
        </div>
        <div className="px-3 py-3">
          <dt className="text-xs text-slate-500">Cao nhất</dt>
          <dd className="mt-1 text-lg font-semibold text-slate-950">{peak ? `${peak.month} · ${peak.activityCount}` : "—"}</dd>
        </div>
        <div className="py-3 pl-3">
          <dt className="text-xs text-slate-500">Trung bình</dt>
          <dd className="mt-1 text-lg font-semibold text-slate-950">{average.toLocaleString()}</dd>
        </div>
      </dl>
    </section>
  );
}
