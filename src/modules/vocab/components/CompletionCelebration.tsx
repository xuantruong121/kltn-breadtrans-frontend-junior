"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Trophy, RotateCcw, ArrowLeft, CheckCircle2 } from "lucide-react";

interface CompletionCelebrationProps {
  totalWordsCount: number;
  learnedCount: number;
  reviewCount: number;
  onRestart: () => void;
}

export const CompletionCelebration: React.FC<CompletionCelebrationProps> = ({
  totalWordsCount,
  learnedCount,
  reviewCount,
  onRestart,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="w-full max-w-xl mx-auto bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-sm text-center space-y-6"
    >
      {/* Icon Badge */}
      <div className="size-18 bg-sky-50 text-sky-600 rounded-3xl flex items-center justify-center mx-auto border border-sky-200/80 shadow-2xs">
        <Trophy size={36} />
      </div>

      {/* Title & Description */}
      <div className="space-y-1.5">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Hoàn Thành Lượt Học!
        </h2>
        <p className="text-sm font-medium text-slate-500 max-w-md mx-auto">
          Tuyệt vời! Bạn đã vượt qua tất cả các bước trong bài học từ vựng hôm nay.
        </p>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
        <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl text-center">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng từ</p>
          <p className="text-2xl font-black text-slate-800 mt-1">{totalWordsCount}</p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-center">
          <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Đã thuộc</p>
          <p className="text-2xl font-black text-emerald-800 mt-1">{learnedCount}</p>
        </div>

        <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl text-center col-span-2 sm:col-span-1">
          <p className="text-[11px] font-bold text-orange-700 uppercase tracking-wider">Cần ôn lại</p>
          <p className="text-2xl font-black text-orange-800 mt-1">{reviewCount}</p>
        </div>
      </div>

      {/* Rewarded Progress Banner */}
      <div className="flex items-center justify-center gap-2 p-3 bg-sky-50 border border-sky-200 rounded-2xl text-xs font-bold text-sky-800">
        <CheckCircle2 size={16} className="text-sky-600 shrink-0" />
        <span>Tiến độ đã được đồng bộ với nhiệm vụ hàng ngày của bạn</span>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
        <button
          type="button"
          onClick={onRestart}
          className="w-full sm:w-auto inline-flex min-h-[46px] items-center justify-center gap-2 px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-sm rounded-2xl shadow-sm transition-all active:scale-98 cursor-pointer"
        >
          <RotateCcw size={16} />
          <span>Học lại từ đầu</span>
        </button>

        <Link href="/flashcard" className="w-full sm:w-auto">
          <button
            type="button"
            className="w-full inline-flex min-h-[46px] items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-sm rounded-2xl transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Về danh mục từ</span>
          </button>
        </Link>
      </div>
    </motion.div>
  );
};
