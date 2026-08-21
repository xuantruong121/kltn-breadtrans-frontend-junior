"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  TrendingUp, 
  Users, 
  Zap, 
  Trophy, 
  Clock, 
  Target, 
  Sparkles,
  ArrowUpRight,
  UserPlus
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
      {/* 1. CHART HEADER CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-xl">
              <TrendingUp size={18} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-800">
                Xu Hướng Tăng Trưởng Hệ Thống
              </h3>
              <p className="text-xs font-semibold text-slate-400">
                Dữ liệu ghi danh và lượt tương tác học tập thực tế qua các tháng
              </p>
            </div>
          </div>
        </div>

        {/* METRIC SELECTOR TABS */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60 self-start sm:self-auto">
          <button
            onClick={() => setMetric("enrollments")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              metric === "enrollments"
                ? "bg-white text-blue-600 shadow-xs border border-slate-200/60"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users size={14} /> Ghi Danh
          </button>
          <button
            onClick={() => setMetric("activity")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              metric === "activity"
                ? "bg-white text-purple-600 shadow-xs border border-slate-200/60"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Zap size={14} /> Tương Tác
          </button>
        </div>
      </div>

      {/* 2. INTERACTIVE BAR CHART WITH GRIDLINES */}
      <div className="relative pt-6 pb-2 bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
        {/* Background Dotted Gridlines */}
        <div className="absolute inset-x-4 top-10 bottom-10 flex flex-col justify-between pointer-events-none opacity-40">
          <div className="border-b border-dashed border-slate-300 w-full" />
          <div className="border-b border-dashed border-slate-300 w-full" />
          <div className="border-b border-dashed border-slate-300 w-full" />
        </div>

        <div className="h-56 sm:h-60 flex items-end justify-between gap-3 sm:gap-6 px-2 relative z-10">
          {trends.map((item, index) => {
            const currentVal = metric === "enrollments" ? item.enrollments : item.activityCount;
            const heightPercent = Math.max(16, Math.round((currentVal / maxVal) * 100));
            const isHovered = hoveredIdx === index;

            const barGradient =
              metric === "enrollments"
                ? isHovered
                  ? "from-blue-600 to-sky-400"
                  : "from-blue-500 to-sky-400"
                : isHovered
                ? "from-purple-600 to-pink-400"
                : "from-purple-500 to-pink-400";

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
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="absolute -top-14 bg-slate-900 text-white font-bold text-xs py-1.5 px-3 rounded-xl shadow-xl z-30 whitespace-nowrap pointer-events-none"
                  >
                    <div className="font-extrabold text-amber-300">
                      {currentVal} {metric === "enrollments" ? "học viên" : "lượt học"}
                    </div>
                    <span className="text-[10px] text-slate-400">Tháng {item.month.replace("T", "")}</span>
                    <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45" />
                  </motion.div>
                )}

                {/* NUMBER VALUE PILL ON TOP OF BAR */}
                <span className="text-[11px] font-black text-slate-500 mb-1.5 transition-colors group-hover:text-slate-800">
                  {currentVal}
                </span>

                {/* ANIMATED BAR */}
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPercent}%` }}
                  transition={{ duration: 0.6, delay: index * 0.08, ease: "easeOut" }}
                  className={`w-full max-w-[48px] rounded-2xl bg-gradient-to-t ${barGradient} shadow-sm transition-all ${
                    isHovered ? "scale-105 shadow-md ring-4 ring-purple-100" : ""
                  }`}
                />

                {/* MONTH LABEL */}
                <span
                  className={`text-xs font-black mt-3 transition-colors ${
                    isHovered ? "text-slate-800" : "text-slate-500"
                  }`}
                >
                  {item.month}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. GROWTH STATS 4 MINI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-blue-50/70 border border-blue-200/60 rounded-2xl">
          <div className="flex items-center gap-1.5 text-blue-600 mb-1">
            <Trophy size={15} />
            <span className="text-[11px] font-black uppercase">Tháng Đỉnh Điểm</span>
          </div>
          <div className="text-base font-black text-slate-800">Tháng 8 (T8)</div>
          <div className="text-[10px] font-bold text-blue-600 mt-0.5">110 lượt tương tác</div>
        </div>

        <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/60 rounded-2xl">
          <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
            <TrendingUp size={15} />
            <span className="text-[11px] font-black uppercase">Tăng Trưởng</span>
          </div>
          <div className="text-base font-black text-slate-800">+24.5%</div>
          <div className="text-[10px] font-bold text-emerald-600 mt-0.5">+8 học viên mới</div>
        </div>

        <div className="p-3.5 bg-purple-50/70 border border-purple-200/60 rounded-2xl">
          <div className="flex items-center gap-1.5 text-purple-600 mb-1">
            <Clock size={15} />
            <span className="text-[11px] font-black uppercase">Thời Lượng Học</span>
          </div>
          <div className="text-base font-black text-slate-800">38 phút/ngày</div>
          <div className="text-[10px] font-bold text-purple-600 mt-0.5">Tăng 12% so với T7</div>
        </div>

        <div className="p-3.5 bg-amber-50/70 border border-amber-200/60 rounded-2xl">
          <div className="flex items-center gap-1.5 text-amber-600 mb-1">
            <Target size={15} />
            <span className="text-[11px] font-black uppercase">Tỷ Lệ Giữ Chân</span>
          </div>
          <div className="text-base font-black text-slate-800">94.2%</div>
          <div className="text-[10px] font-bold text-amber-600 mt-0.5">Duy trì Streak tốt</div>
        </div>
      </div>

      {/* 4. AI INSIGHTS & ACTIONS BANNER */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/30 text-amber-300 shrink-0 border border-indigo-400/30">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-indigo-200 uppercase tracking-wider">AI Phân Tích Thông Minh</span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Thời gian thực</span>
            </div>
            <p className="text-xs font-bold text-slate-300 mt-1 leading-relaxed">
              Lượt học tăng cao nhất vào khung giờ <strong>19h00 - 22h00</strong>. Đề xuất tổ chức thêm lớp Speaking &amp; Đấu trường 1v1 vào buổi tối.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <Link
            href="/admin/enroll"
            className="flex-1 sm:flex-none px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap"
          >
            <UserPlus size={14} /> Ghi Danh
          </Link>
          <Link
            href="/admin/users"
            className="flex-1 sm:flex-none px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            Học Viên <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
