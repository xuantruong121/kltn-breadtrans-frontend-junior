"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Calendar,
  CheckCircle2,
  ArrowUpRight,
  BarChart3,
  Lightbulb,
} from "lucide-react";
import Link from "next/link";

interface MonthlyTrend {
  month: string;
  enrollments: number;
  activityCount: number;
}

interface AdminAnalyticsChartProps {
  data?: MonthlyTrend[];
}

export default function AdminAnalyticsChart({
  data,
}: AdminAnalyticsChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const trends = data || [];
  const values = trends.map((t) => t.activityCount);
  const maxVal = Math.max(...values, 10);

  const totalPeriodActivity = trends.reduce(
    (sum, t) => sum + t.activityCount,
    0,
  );
  const peakMonth = trends.reduce<MonthlyTrend | null>(
    (max, t) => (!max || t.activityCount > max.activityCount ? t : max),
    null,
  );
  const avgMonthlyActivity =
    trends.length > 0 ? Math.round(totalPeriodActivity / trends.length) : 0;

  return (
    <div className="space-y-6">
      {/* 1. CHART HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-100 text-slate-800 rounded-lg border border-slate-200">
            <BarChart3 size={18} strokeWidth={2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                Xu Hướng Tăng Trưởng &amp; Tương Tác
              </h3>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/80">
                6 tháng gần nhất
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tổng lượt học tập hoàn thành trong sáu tháng gần nhất
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
          <Activity size={14} strokeWidth={2} /> Lượt học tập
        </span>
      </div>

      {/* 2. INTERACTIVE BAR CHART */}
      {trends.length === 0 ? (
        <div className="h-56 sm:h-64 flex flex-col items-center justify-center bg-slate-50/70 rounded-xl p-4 border border-slate-200/80 text-slate-500">
          <BarChart3 size={32} className="text-slate-300 mb-2" />
          <p className="text-sm font-semibold text-slate-700">
            Chưa có đủ dữ liệu lịch sử theo tháng
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Biểu đồ sẽ tự động kết xuất khi có lượt ghi danh và hoạt động học
            tập mới.
          </p>
        </div>
      ) : (
        <div className="relative pt-6 pb-3 bg-slate-50/70 rounded-xl p-4 border border-slate-200/80">
          {/* Dotted Gridlines */}
          <div className="absolute inset-x-4 top-10 bottom-10 flex flex-col justify-between pointer-events-none opacity-40">
            <div className="border-b border-dashed border-slate-300 w-full" />
            <div className="border-b border-dashed border-slate-300 w-full" />
            <div className="border-b border-dashed border-slate-300 w-full" />
          </div>

          <div className="h-56 sm:h-64 flex items-end justify-between gap-3 sm:gap-6 px-3 relative z-10">
            {trends.map((item, index) => {
              const currentVal = item.activityCount;
              const heightPercent =
                maxVal > 0
                  ? Math.max(10, Math.round((currentVal / maxVal) * 100))
                  : 10;
              const isHovered = hoveredIdx === index;

              const barBg = isHovered ? "bg-indigo-700" : "bg-indigo-600";

              return (
                <div
                  key={item.month}
                  className="flex-1 flex flex-col items-center h-full justify-end relative group cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(index)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  {/* TOOLTIP ON HOVER */}
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="absolute -top-14 bg-slate-900 text-white text-xs py-1.5 px-3 rounded-lg shadow-md z-30 whitespace-nowrap pointer-events-none"
                    >
                      <div className="font-semibold text-white">
                        {currentVal}{" "}
                        lượt học tập
                      </div>
                      <span className="text-[10px] text-slate-400">
                        Tháng {item.month.replace("T", "")}
                      </span>
                      <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45" />
                    </motion.div>
                  )}

                  {/* NUMBER VALUE PILL ON TOP OF BAR */}
                  <span className="text-[11px] font-semibold text-slate-500 mb-1.5 transition-colors group-hover:text-slate-900 group-hover:font-bold">
                    {currentVal}
                  </span>

                  {/* ANIMATED BAR */}
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPercent}%` }}
                    transition={{
                      duration: 0.45,
                      delay: index * 0.04,
                      ease: "easeOut",
                    }}
                    className={`w-full max-w-[44px] rounded-t-md ${barBg} transition-all ${
                      isHovered ? "ring-2 ring-slate-400/50 opacity-95" : ""
                    }`}
                  />

                  {/* MONTH LABEL */}
                  <span
                    className={`text-xs mt-2.5 transition-colors ${
                      isHovered
                        ? "text-slate-900 font-bold"
                        : "text-slate-500 font-medium"
                    }`}
                  >
                    {item.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. GROWTH STATS 4 MINI METRIC TILES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-colors">
          <div className="flex items-center gap-1.5 text-slate-500 mb-1">
            <Calendar size={14} className="text-blue-600" strokeWidth={2} />
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Tháng Cao Điểm
            </span>
          </div>
          <div className="text-base font-bold text-slate-900">
            {peakMonth ? `Tháng ${peakMonth.month.replace("T", "")}` : "--"}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {peakMonth
              ? `${peakMonth.activityCount} lượt học tập`
              : "Chưa có dữ liệu"}
          </div>
        </div>

        <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-colors">
          <div className="flex items-center gap-1.5 text-slate-500 mb-1">
            <Activity size={14} className="text-indigo-600" strokeWidth={2} />
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Trung Bình / Tháng
            </span>
          </div>
          <div className="text-base font-bold text-slate-900">
            {avgMonthlyActivity} lượt
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Dựa trên dữ liệu thực
          </div>
        </div>

        <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-colors">
          <div className="flex items-center gap-1.5 text-slate-500 mb-1">
            <CheckCircle2
              size={14}
              className="text-amber-600"
              strokeWidth={2}
            />
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Kỳ Thống Kê
            </span>
          </div>
          <div className="text-base font-bold text-slate-900">
            {trends.length} tháng
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Dữ liệu thực từ hệ thống
          </div>
        </div>
      </div>

      {/* 4. OPERATIONAL INSIGHTS & ACTIONS BANNER */}
      <div className="bg-slate-50/90 text-slate-800 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-200/90 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-white text-blue-600 shrink-0 border border-slate-200 shadow-2xs mt-0.5">
            <Lightbulb size={18} strokeWidth={2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Đề Xuất Tối Ưu Vận Hành
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-100/80 text-blue-700 border border-blue-200/70">
                Phân tích lưu lượng
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-3xl">
              Biểu đồ phản ánh lượt học tập được ghi nhận trong sáu tháng gần
              nhất. Dữ liệu theo khung giờ chưa được thu thập nên không đưa ra
              kết luận về thời điểm cao điểm.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <Link
            href="/admin/courses"
            className="flex-1 sm:flex-none px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs whitespace-nowrap"
          >
            Quản lý khóa học
          </Link>
          <Link
            href="/admin/users"
            className="flex-1 sm:flex-none px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-semibold rounded-lg border border-slate-200 shadow-2xs transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            Danh sách <ArrowUpRight size={14} strokeWidth={2} />
          </Link>
        </div>
      </div>
    </div>
  );
}
