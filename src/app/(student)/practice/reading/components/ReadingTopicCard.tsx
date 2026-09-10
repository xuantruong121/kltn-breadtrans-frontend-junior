"use client";

import { ArrowRight, BookOpen, CheckCircle2, Lock } from "lucide-react";
import type { ReadingTopic } from "@/lib/api/services/reading.service";

export interface ReadingTopicItem extends ReadingTopic {
  name?: string;
  vietnameseName?: string;
  totalArticles?: number;
  completedArticles?: number;
  totalQuestions?: number;
  completedCount?: number;
  correctCount?: number;
}

interface ReadingTopicCardProps {
  topic: ReadingTopicItem;
  isAuthenticated: boolean;
  onOpenAuthGate: (topic: ReadingTopicItem) => void;
  onStart?: (topic: ReadingTopicItem) => void;
}

export function ReadingTopicCard({
  topic,
  isAuthenticated,
  onOpenAuthGate,
  onStart,
}: ReadingTopicCardProps) {
  const total = topic.totalArticles || 0;
  const completed = topic.completedArticles || 0;
  const isCompleted = completed >= total && total > 0;
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const title = topic.name || topic.title || "Chủ đề đọc hiểu";
  const desc = topic.vietnameseName || topic.description || "Luyện đọc hiểu tiếng Anh song ngữ theo ngữ cảnh.";

  const handleCardClick = (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault();
      onOpenAuthGate(topic);
    }
  };

  return (
    <article className="group flex min-h-72 flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md sm:p-6">
      <div className="space-y-3.5">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200/80 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-700">
            <BookOpen size={12} aria-hidden="true" /> Song ngữ
          </span>

          {isCompleted && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-700">
              <CheckCircle2 size={12} aria-hidden="true" /> Đã hoàn thành
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-base font-extrabold leading-snug text-slate-900 transition-colors group-hover:text-emerald-700 sm:text-lg line-clamp-1">
          {title}
        </h3>

        {/* Description / Vietnamese translation */}
        <p className="line-clamp-2 text-xs leading-5 text-slate-600 sm:text-sm">
          {desc}
        </p>

        {/* Progress bar container */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="text-slate-500">Tiến độ bài đọc</span>
            <span className="text-emerald-700 font-extrabold">
              {completed} / {total} bài ({progressPercent}%)
            </span>
          </div>
          <div className="w-full bg-slate-200/70 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="mt-5 border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
          <span className="inline-flex items-center gap-1 text-slate-500">
            <BookOpen size={13} className="text-slate-400" aria-hidden="true" />
            {total} bài đọc
          </span>

          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => onStart?.(topic)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 text-xs font-extrabold text-white shadow-xs transition-colors hover:bg-emerald-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 cursor-pointer"
            >
              {isCompleted ? "Ôn tập lại" : "Bắt đầu đọc"}
              <ArrowRight size={13} aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCardClick}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 text-xs font-extrabold text-emerald-700 transition-colors hover:bg-emerald-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 cursor-pointer"
            >
              <Lock size={12} aria-hidden="true" />
              Đăng nhập để bắt đầu
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
