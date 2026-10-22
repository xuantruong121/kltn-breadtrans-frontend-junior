import React from "react";
import type { FlashcardSummaryMetrics } from "../flashcardLogic";

export interface FlashcardStudySummaryProps {
  metrics: FlashcardSummaryMetrics;
}

export const FlashcardStudySummary: React.FC<FlashcardStudySummaryProps> = ({ metrics }) => {
  return (
    <section
      aria-label="Thống kê học tập"
      className="grid grid-cols-2 divide-x divide-y divide-slate-100 dark:divide-slate-800 sm:grid-cols-4 sm:divide-y-0 rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs"
    >
      <div className="p-4">
        <p className="text-xs text-slate-400">Cần ôn hôm nay</p>
        <p
          className={`mt-1 text-xl font-semibold leading-none ${
            metrics.totalDueWords > 0
              ? "text-amber-600 dark:text-amber-400"
              : "text-slate-900 dark:text-slate-100"
          }`}
        >
          {metrics.totalDueWords} <span className="text-xs font-normal text-slate-400">từ</span>
        </p>
      </div>

      <div className="p-4">
        <p className="text-xs text-slate-400">Đang học</p>
        <p className="mt-1 text-xl font-semibold leading-none text-slate-900 dark:text-slate-100">
          {metrics.inProgressTopicsCount}{" "}
          <span className="text-xs font-normal text-slate-400">bộ</span>
        </p>
      </div>

      <div className="p-4">
        <p className="text-xs text-slate-400">Đã thuộc</p>
        <p className="mt-1 text-xl font-semibold leading-none text-slate-900 dark:text-slate-100">
          {metrics.masteredWordsCount}{" "}
          <span className="text-xs font-normal text-slate-400">từ</span>
        </p>
      </div>

      <div className="p-4">
        <p className="text-xs text-slate-400">Tổng bộ từ</p>
        <p className="mt-1 text-xl font-semibold leading-none text-slate-900 dark:text-slate-100">
          {metrics.totalTopicsCount}{" "}
          <span className="text-xs font-normal text-slate-400">bộ</span>
        </p>
      </div>
    </section>
  );
};
