"use client";

import { useState } from "react";
import { BarChart3, Activity, UserPlus, DollarSign } from "lucide-react";
import {
  getBarHeightPercent,
  getRangeLabel,
  type DashboardTrend,
} from "./adminDashboardChartUtils";

type MetricType = "activity" | "enrollments" | "revenue";

interface AdminAnalyticsChartProps {
  data?: DashboardTrend[];
  range: string;
}

function formatVndCompact(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(1).replace(/\.0$/, "")} tỷ ₫`;
  }
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1).replace(/\.0$/, "")} tr ₫`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(0)}k ₫`;
  }
  return `${amount.toLocaleString("vi-VN")} ₫`;
}

export default function AdminAnalyticsChart({ data, range }: AdminAnalyticsChartProps) {
  const [metric, setMetric] = useState<MetricType>("activity");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const trends = data ?? [];
  const rangeLabel = getRangeLabel(range);

  const getValue = (trend: DashboardTrend): number => {
    switch (metric) {
      case "enrollments":
        return trend.enrollments;
      case "revenue":
        return trend.revenueVnd ?? 0;
      default:
        return trend.activityCount;
    }
  };

  const getMetricUnit = () => {
    switch (metric) {
      case "enrollments":
        return "lượt ghi danh";
      case "revenue":
        return "₫";
      default:
        return "lượt hoạt động";
    }
  };

  const formatDisplayValue = (val: number): string => {
    if (metric === "revenue") {
      return `${val.toLocaleString("vi-VN")} ₫`;
    }
    return val.toLocaleString("vi-VN");
  };

  const maximum = Math.max(0, ...trends.map(getValue));
  const total = trends.reduce((sum, trend) => sum + getValue(trend), 0);
  const peak = trends.reduce<DashboardTrend | null>(
    (currentPeak, trend) =>
      !currentPeak || getValue(trend) > getValue(currentPeak) ? trend : currentPeak,
    null,
  );
  const average = trends.length ? Math.round(total / trends.length) : 0;

  const barColor =
    metric === "revenue"
      ? "bg-emerald-600 hover:bg-emerald-700"
      : metric === "enrollments"
      ? "bg-indigo-600 hover:bg-indigo-700"
      : "bg-blue-600 hover:bg-blue-700";

  const activeBarColor =
    metric === "revenue"
      ? "bg-emerald-700"
      : metric === "enrollments"
      ? "bg-indigo-700"
      : "bg-blue-700";

  return (
    <section aria-labelledby="analytics-chart-heading" className="space-y-5">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/90 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 id="analytics-chart-heading" className="text-base font-bold text-slate-950">
              Xu hướng vận hành hệ thống
            </h2>
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              <BarChart3 size={13} aria-hidden="true" />
              {rangeLabel}
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium">
            Dữ liệu ghi nhận thực tế từ lịch sử nộp bài, ghi danh và giao dịch của học viên
          </p>
        </div>

        {/* Metric Selector Tabs */}
        <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200/80 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => {
              setMetric("activity");
              setActiveIndex(null);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              metric === "activity"
                ? "bg-white text-blue-700 shadow-2xs border border-slate-200/60"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Activity size={13} />
            <span>Học tập</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMetric("enrollments");
              setActiveIndex(null);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              metric === "enrollments"
                ? "bg-white text-indigo-700 shadow-2xs border border-slate-200/60"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <UserPlus size={13} />
            <span>Ghi danh</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMetric("revenue");
              setActiveIndex(null);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              metric === "revenue"
                ? "bg-white text-emerald-700 shadow-2xs border border-slate-200/60"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <DollarSign size={13} />
            <span>Doanh thu</span>
          </button>
        </div>
      </header>

      {trends.length === 0 ? (
        <div className="flex min-h-56 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-5 text-center text-sm text-slate-500 font-medium">
          Chưa có dữ liệu thống kê trong khoảng thời gian này.
        </div>
      ) : (
        <div className="border-b border-slate-200/90 px-1 pt-6 pb-2">
          <div className="relative flex h-60 items-end gap-1.5 sm:gap-2" role="list" aria-label={`Biểu đồ ${rangeLabel}`}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-slate-100" />
            <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-slate-100" />
            
            {trends.map((item, index) => {
              const val = getValue(item);
              const isActive = activeIndex === index;
              const showTick = trends.length <= 12 || index === 0 || index === trends.length - 1 || index % 5 === 0;
              const height = getBarHeightPercent(val, maximum);

              return (
                <div key={`${item.month}-${index}`} className="flex min-w-0 flex-1 flex-col items-center justify-end self-stretch" role="listitem">
                  <button
                    type="button"
                    className="group relative flex w-full flex-1 items-end justify-center rounded-t-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 cursor-pointer"
                    aria-label={`${item.month}: ${formatDisplayValue(val)} ${getMetricUnit()}`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                    onFocus={() => setActiveIndex(index)}
                    onBlur={() => setActiveIndex(null)}
                  >
                    {isActive && (
                      <span className="pointer-events-none absolute bottom-[calc(100%+8px)] z-20 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 shadow-md">
                        <span className="font-semibold text-slate-500 mr-1">{item.month}:</span>
                        <span className="font-mono">{formatDisplayValue(val)}</span>
                      </span>
                    )}

                    <span className="sr-only">{val}</span>
                    <span
                      aria-hidden="true"
                      className={`w-full max-w-7 rounded-t-sm transition-all duration-150 ${
                        val === 0 ? "bg-transparent" : isActive ? activeBarColor : barColor
                      }`}
                      style={{ height: `${height}%` }}
                    />
                  </button>
                  <span className={`mt-2.5 min-h-4 text-xs font-medium font-mono ${showTick ? "text-slate-500" : "text-transparent"}`} aria-hidden={!showTick}>
                    {item.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Metric Aggregate Summary */}
      <dl className="grid grid-cols-3 divide-x divide-slate-200/90 rounded-xl bg-slate-50/70 border border-slate-200/80 p-3 sm:p-4">
        <div className="pr-3 text-center sm:text-left">
          <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {metric === "revenue" ? "Tổng thu kỳ này" : "Tổng lượt trong kỳ"}
          </dt>
          <dd className="mt-1.5 text-lg sm:text-xl font-bold tracking-tight text-slate-950 font-mono tabular-nums">
            {metric === "revenue" ? formatVndCompact(total) : total.toLocaleString("vi-VN")}
          </dd>
        </div>
        <div className="px-3 text-center sm:text-left">
          <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Kỳ cao nhất</dt>
          <dd className="mt-1.5 text-lg sm:text-xl font-bold tracking-tight text-slate-950 font-mono tabular-nums truncate">
            {peak ? (
              metric === "revenue" ? (
                `${peak.month} · ${formatVndCompact(getValue(peak))}`
              ) : (
                `${peak.month} · ${getValue(peak).toLocaleString("vi-VN")}`
              )
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div className="pl-3 text-center sm:text-left">
          <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Trung bình mỗi kỳ</dt>
          <dd className="mt-1.5 text-lg sm:text-xl font-bold tracking-tight text-slate-950 font-mono tabular-nums">
            {metric === "revenue" ? formatVndCompact(average) : average.toLocaleString("vi-VN")}
          </dd>
        </div>
      </dl>
    </section>
  );
}
