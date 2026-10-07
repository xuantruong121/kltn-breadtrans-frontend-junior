import React from "react";
import { BookMarked, CheckCircle2, Clock, Layers } from "lucide-react";
import type { FlashcardSummaryMetrics } from "../flashcardLogic";

export interface FlashcardStudySummaryProps {
  metrics: FlashcardSummaryMetrics;
}

export const FlashcardStudySummary: React.FC<FlashcardStudySummaryProps> = ({ metrics }) => {
  return (
    <section
      aria-label="Thống kê học tập"
      className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900"
    >
      {/* 1. Cần ôn hôm nay */}
      <div className="flex items-center gap-3 rounded-xl bg-slate-50/70 p-3 dark:bg-slate-800/50">
        <div
          className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
            metrics.totalDueWords > 0
              ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
              : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
          }`}
          aria-hidden="true"
        >
          <Clock size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
            Cần ôn hôm nay
          </p>
          <p
            className={`text-base sm:text-lg font-bold ${
              metrics.totalDueWords > 0
                ? "text-amber-600 dark:text-amber-400"
                : "text-slate-800 dark:text-slate-200"
            }`}
          >
            {metrics.totalDueWords} <span className="text-xs font-medium text-slate-400">từ</span>
          </p>
        </div>
      </div>

      {/* 2. Đang học */}
      <div className="flex items-center gap-3 rounded-xl bg-slate-50/70 p-3 dark:bg-slate-800/50">
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400"
          aria-hidden="true"
        >
          <BookMarked size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
            Đang học
          </p>
          <p className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200">
            {metrics.inProgressTopicsCount}{" "}
            <span className="text-xs font-medium text-slate-400">bộ</span>
          </p>
        </div>
      </div>

      {/* 3. Đã thuộc */}
      <div className="flex items-center gap-3 rounded-xl bg-slate-50/70 p-3 dark:bg-slate-800/50">
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
          aria-hidden="true"
        >
          <CheckCircle2 size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
            Đã thuộc
          </p>
          <p className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200">
            {metrics.masteredWordsCount}{" "}
            <span className="text-xs font-medium text-slate-400">từ</span>
          </p>
        </div>
      </div>

      {/* 4. Tổng bộ từ */}
      <div className="flex items-center gap-3 rounded-xl bg-slate-50/70 p-3 dark:bg-slate-800/50">
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          aria-hidden="true"
        >
          <Layers size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
            Tổng bộ từ
          </p>
          <p className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200">
            {metrics.totalTopicsCount}{" "}
            <span className="text-xs font-medium text-slate-400">bộ</span>
          </p>
        </div>
      </div>
    </section>
  );
};
