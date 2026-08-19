"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Users, Zap, Calendar } from "lucide-react";

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
    <div className="space-y-6">
      {/* CHART HEADER CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-purple-600" />
            <h3 className="text-lg font-black text-slate-800">Xu Hướng Tăng Trưởng Hệ Thống</h3>
          </div>
          <p className="text-xs font-bold text-slate-400 mt-0.5">
            Dữ liệu ghi danh và số lượt tương tác học tập qua 6 tháng gần nhất
          </p>
        </div>

        {/* METRIC SELECTOR TABS */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl">
          <button
            onClick={() => setMetric("enrollments")}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              metric === "enrollments"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users size={14} /> Ghi Danh
          </button>
          <button
            onClick={() => setMetric("activity")}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              metric === "activity"
                ? "bg-white text-purple-600 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Zap size={14} /> Tương Tác
          </button>
        </div>
      </div>

      {/* INTERACTIVE BAR CHART */}
      <div className="relative pt-6 pb-2">
        <div className="h-48 flex items-end justify-between gap-3 sm:gap-6 px-2">
          {trends.map((item, index) => {
            const currentVal = metric === "enrollments" ? item.enrollments : item.activityCount;
            const heightPercent = Math.max(12, Math.round((currentVal / maxVal) * 100));
            const isHovered = hoveredIdx === index;

            const barGradient =
              metric === "enrollments"
                ? isHovered
                  ? "from-blue-500 to-sky-400"
                  : "from-blue-600 to-sky-500"
                : isHovered
                ? "from-purple-500 to-pink-400"
                : "from-purple-600 to-pink-500";

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
                    className="absolute -top-14 bg-slate-900 text-white font-bold text-xs py-1.5 px-3 rounded-xl shadow-xl z-20 whitespace-nowrap pointer-events-none"
                  >
                    <div className="font-extrabold text-amber-300">
                      {currentVal} {metric === "enrollments" ? "học viên" : "lượt học"}
                    </div>
                    <span className="text-[10px] text-slate-400">Tháng {item.month.replace("T", "")}</span>
                    <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45" />
                  </motion.div>
                )}

                {/* ANIMATED BAR */}
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPercent}%` }}
                  transition={{ duration: 0.6, delay: index * 0.08, ease: "easeOut" }}
                  className={`w-full max-w-[48px] rounded-2xl bg-gradient-to-t ${barGradient} shadow-md transition-all ${
                    isHovered ? "scale-105 shadow-lg ring-4 ring-purple-100" : ""
                  }`}
                />

                {/* MONTH LABEL */}
                <span
                  className={`text-xs font-black mt-3 transition-colors ${
                    isHovered ? "text-slate-800" : "text-slate-400"
                  }`}
                >
                  {item.month}
                </span>
              </div>
            );
          })}
        </div>

        {/* BASELINE GRID */}
        <div className="border-b-2 border-slate-100 w-full mt-1" />
      </div>

      {/* SUMMARY BANNER */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between text-xs font-bold text-slate-500">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Tốc độ tăng trưởng: <strong className="text-emerald-600 font-extrabold">+24.5%</strong> tháng này</span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Ghi danh</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /> Lượt tương tác</span>
        </div>
      </div>
    </div>
  );
}
