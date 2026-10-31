"use client";

import React from "react";
import {
  ArrowRight,
  Check,
  Lock,
  RotateCcw,
} from "lucide-react";
import type { GrammarTopicSummary } from "@/lib/api/services/grammar.service";
import {
  resolveExerciseDifficulty,
  READING_DIFFICULTY_CONFIG,
} from "./readingCardLogic";

export interface GrammarTopicCardProps {
  topic: GrammarTopicSummary;
  isAuthenticated: boolean;
  onOpenAuthGate: (topic: GrammarTopicSummary) => void;
  onStart: (topic: GrammarTopicSummary) => void;
}

export function GrammarTopicCard({
  topic,
  isAuthenticated,
  onOpenAuthGate,
  onStart,
}: GrammarTopicCardProps) {
  const diffLevel = resolveExerciseDifficulty(topic);
  const diffConfig = READING_DIFFICULTY_CONFIG[diffLevel];

  const handleCardClick = (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault();
      onOpenAuthGate(topic);
    }
  };

  const isCompleted = Boolean(topic.isCompleted);
  const containerClasses =
    "relative flex min-h-[220px] flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs cursor-pointer group";

  return (
    <article className={containerClasses}>
      <div className="space-y-2.5">
        {/* Status header line: only when completed */}
        {isCompleted && (
          <div className="flex items-center justify-between gap-2">
            <span />
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span>
                Đã hoàn thành{topic.lastScore !== null ? ` · ${topic.lastScore}%` : ""}
              </span>
            </span>
          </div>
        )}

        {/* Title & Description */}
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-1 break-words">
            {topic.title}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2 min-h-[38px] mt-1.5">
            {topic.description ||
              "Bài học kiến thức trọng tâm và câu hỏi thực hành áp dụng chuẩn ngữ cảnh."}
          </p>
        </div>
      </div>

      {/* Footer: Metadata on Left, Action CTA on Right */}
      <div className="mt-4 border-t border-slate-100 dark:border-slate-800/80 pt-3">
        <div className="flex items-center justify-between gap-3">
          {/* Metadata */}
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
            <span>Ngữ pháp</span>
            <span className="mx-1.5">·</span>
            <span>{diffConfig.label}</span>
            <span className="mx-1.5">·</span>
            <span>{topic.totalQuestions} câu hỏi</span>
          </div>

          {/* Action CTA */}
          <div className="shrink-0">
            {!isAuthenticated ? (
              <button
                type="button"
                onClick={handleCardClick}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 px-3.5 py-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Đăng nhập</span>
              </button>
            ) : isCompleted ? (
              <button
                type="button"
                onClick={() => onStart(topic)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <span>Luyện lại</span>
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onStart(topic)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-100 hover:bg-emerald-600 dark:bg-slate-800 dark:hover:bg-emerald-600 px-3.5 py-1.5 text-sm font-semibold text-slate-700 hover:text-white dark:text-slate-200 dark:hover:text-white transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <span>Bắt đầu</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default GrammarTopicCard;
