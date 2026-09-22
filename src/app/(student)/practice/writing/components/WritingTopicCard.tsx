"use client";

import { ArrowRight, CheckCircle2, Lock, PenTool } from "lucide-react";
import type { WritingTopic } from "@/lib/api/services/writing.service";

export interface WritingTopicItem extends WritingTopic {
  topicName?: string;
  isCompleted?: boolean;
  category?: string;
  wordCount?: number;
}

interface WritingTopicCardProps {
  topic: WritingTopicItem;
  isAuthenticated: boolean;
  onOpenAuthGate: (topic: WritingTopicItem) => void;
  onStart?: (topic: WritingTopicItem) => void;
  isLaunching?: boolean;
}

export function WritingTopicCard({
  topic,
  isAuthenticated,
  onOpenAuthGate,
  onStart,
  isLaunching = false,
}: WritingTopicCardProps) {
  const isCompleted = Boolean(topic.isCompleted);
  const title = topic.topicName || topic.title || "Chủ đề luyện viết";
  const desc = topic.description || "Luyện tập viết câu và đoạn văn trả lời email theo yêu cầu công việc.";
  const category = topic.category || "Workplace Writing";

  const handleCardClick = (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault();
      onOpenAuthGate(topic);
    }
  };

  return (
    <article className="group flex min-h-72 flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-rose-300 dark:hover:border-rose-700 hover:shadow-md sm:p-6">
      <div className="space-y-3.5">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 rounded-lg border border-rose-200/80 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-0.5 text-[11px] font-extrabold text-rose-700 dark:text-rose-300">
            <PenTool size={12} aria-hidden="true" /> {category}
          </span>

          {isCompleted && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 size={12} aria-hidden="true" /> Đã hoàn thành
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-base font-extrabold leading-snug text-slate-900 dark:text-slate-100 transition-colors group-hover:text-rose-700 dark:group-hover:text-rose-400 sm:text-lg line-clamp-1">
          {title}
        </h3>

        {/* Description */}
        <p className="line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-400 sm:text-sm">
          {desc}
        </p>

        {/* Writing prompt highlight box */}
        <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
            <span className="size-1.5 rounded-full bg-rose-500 shrink-0" />
            <span>Chấm điểm ngữ pháp & gợi ý câu tự động</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-400 font-medium line-clamp-1">
            Nhận phản hồi từ vựng và cấu trúc diễn đạt tức thì sau khi nộp bài.
          </p>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="mt-5 border-t border-slate-100 dark:border-slate-800 pt-4">
        <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <PenTool size={13} className="text-slate-400" aria-hidden="true" />
            Luyện viết câu
          </span>

          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => onStart?.(topic)}
              disabled={isLaunching}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 text-xs font-extrabold text-white shadow-xs transition-colors hover:bg-rose-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 disabled:opacity-60 cursor-pointer"
            >
              {isCompleted ? "Ôn tập lại" : "Bắt đầu viết"}
              <ArrowRight size={13} aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCardClick}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-rose-300 dark:border-rose-800/80 bg-rose-50 dark:bg-rose-950/50 px-3.5 text-xs font-extrabold text-rose-800 dark:text-rose-300 transition-colors hover:bg-rose-100 dark:hover:bg-rose-900/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 cursor-pointer"
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
