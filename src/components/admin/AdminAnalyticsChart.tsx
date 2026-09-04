"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  TrendingUp, 
  Users, 
  Activity, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  ArrowUpRight,
  UserPlus,
  BarChart3,
  LineChart
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

const DEFAULT_TRENDS: MonthlyTrend[] = [
  { month: "T3", enrollments: 2, activityCount: 18 },
  { month: "T4", enrollments: 3, activityCount: 32 },
  { month: "T5", enrollments: 4, activityCount: 48 },
  { month: "T6", enrollments: 6, activityCount: 65 },
  { month: "T7", enrollments: 7, activityCount: 84 },
  { month: "T8", enrollments: 8, activityCount: 110 },
];

export default function AdminAnalyticsChart({ data }: AdminAnalyticsChartProps) {
  const [metric, setMetric] = useState<"enrollments" | "activity">("enrollments");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const trends = data && data.length > 0 ? data : DEFAULT_TRENDS;
  const values = trends.map((t) => (metric === "enrollments" ? t.enrollments : t.activityCount));
  const maxVal = Math.max(...values, 10);

  return (
    <div className="space-y-6 flex flex-col">
      {/* 1. CHART HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-100 text-slate-800 rounded-lg border border-slate-200">
            <BarChart3 size={18} strokeWidth={2} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Xu Hướng Tăng Trưởng &amp; Tương Tác
            </h3>
            <p className="text-xs text-slate-500">
              Dữ liệu ghi danh học viên và tổng lượt hoàn thành bài học theo từng tháng
            </p>
          </div>
        </div>

        {/* METRIC SELECTOR TABS (SEGMENTED CONTROL) */}
        <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 self-start sm:self-auto text-xs font-medium">
          <button
            onClick={() => setMetric("enrollments")}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              metric === "enrollments"
                ? "bg-white text-slate-900 font-semibold shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users size={14} /> Ghi Danh
          </button>
          <button
            onClick={() => setMetric("activity")}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              metric === "activity"
                ? "bg-white text-slate-900 font-semibold shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Activity size={14} /> Lượt Tương Tác
          </button>
        </div>
      </div>

      {/* 2. INTERACTIVE BAR CHART */}
      <div className="relative pt-6 pb-3 bg-slate-50/60 rounded-xl p-4 border border-slate-200/70">
        {/* Dotted Gridlines & Y-Axis Reference */}
        <div className="absolute inset-x-4 top-10 bottom-10 flex flex-col justify-between pointer-events-none opacity-50">
          <div className="border-b border-dashed border-slate-300 w-full" />
          <div className="border-b border-dashed border-slate-300 w-full" />
          <div className="border-b border-dashed border-slate-300 w-full" />
        </div>

        <div className="h-56 sm:h-64 flex items-end justify-between gap-3 sm:gap-6 px-3 relative z-10">
          {trends.map((item, index) => {
            const currentVal = metric === "enrollments" ? item.enrollments : item.activityCount;
            const heightPercent = Math.max(12, Math.round((currentVal / maxVal) * 100));
            const isHovered = hoveredIdx === index;

            // Clean, non-neon bar styling
            const barBg =
              metric === "enrollments"
                ? isHovered
                  ? "bg-blue-700"
                  : "bg-blue-600"
                : isHovered
                ? "bg-indigo-700"
                : "bg-indigo-600";

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
                      {currentVal} {metric === "enrollments" ? "học viên mới" : "lượt học"}
                    </div>
                    <span className="text-[10px] text-slate-400">Tháng {item.month.replace("T", "")}</span>
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
                  transition={{ duration: 0.5, delay: index * 0.05, ease: "easeOut" }}
                  className={`w-full max-w-[42px] rounded-t-md ${barBg} transition-all ${
                    isHovered ? "ring-2 ring-slate-400/50 opacity-95" : ""
                  }`}
                />

                {/* MONTH LABEL */}
                <span
                  className={`text-xs mt-2.5 transition-colors ${
                    isHovered ? "text-slate-900 font-bold" : "text-slate-500 font-medium"
                  }`}
                >
                  {item.month}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. GROWTH STATS 4 MINI METRIC TILES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center gap-1.5 text-slate-500 mb-1">
            <Calendar size={14} className="text-blue-600" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Tháng Cao Điểm</span>
          </div>
          <div className="text-base font-bold text-slate-900">Tháng 8 (T8)</div>
          <div className="text-[11px] text-slate-500 mt-0.5">110 lượt học tập</div>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center gap-1.5 text-slate-500 mb-1">
            <TrendingUp size={14} className="text-emerald-600" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Tăng Trưởng</span>
          </div>
          <div className="text-base font-bold text-slate-900">+24.5%</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">+8 học viên ghi danh</div>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center gap-1.5 text-slate-500 mb-1">
            <Clock size={14} className="text-indigo-600" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Thời Lượng Học</span>
          </div>
          <div className="text-base font-bold text-slate-900">38 phút/ngày</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Duy trì đều đặn</div>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center gap-1.5 text-slate-500 mb-1">
            <CheckCircle2 size={14} className="text-amber-600" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Tỷ Lệ Giữ Chân</span>
          </div>
          <div className="text-base font-bold text-slate-900">94.2%</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Duy trì chuỗi bài học</div>
        </div>
      </div>

      {/* 4. OPERATIONAL INSIGHTS & ACTIONS BANNER */}
      <div className="bg-gradient-to-r from-blue-50/50 via-slate-50/70 to-slate-50/90 text-slate-800 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-200 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-white text-blue-600 shrink-0 border border-blue-100 shadow-xs mt-0.5">
            <LineChart size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Đề Xuất Tối Ưu Vận Hành
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-100/70 text-blue-700 border border-blue-200/60">
                Phân tích lưu lượng
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-3xl">
              Lượt truy cập học tập cao nhất tập trung vào khung giờ <strong className="text-slate-900 font-semibold">19h00 &ndash; 22h00</strong>. Đề xuất mở thêm phòng luyện nói Speaking tương tác và tổ chức giải đấu Mini Game vào buổi tối để tăng tỷ lệ hoàn thành.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <Link
            href="/admin/enroll"
            className="flex-1 sm:flex-none px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs whitespace-nowrap"
          >
            <UserPlus size={14} /> Ghi danh học viên
          </Link>
          <Link
            href="/admin/users"
            className="flex-1 sm:flex-none px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-semibold rounded-lg border border-slate-200 shadow-xs transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            Danh sách <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
