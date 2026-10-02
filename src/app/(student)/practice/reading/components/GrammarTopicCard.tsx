"use client";

import React from "react";
import {
  ArrowRight,
  BookOpenCheck,
  Check,
  Clock,
  FileText,
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
  const containerClasses = isCompleted
    ? "relative flex min-h-[235px] flex-col justify-between rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-50/20 dark:bg-emerald-950/15 p-4 sm:p-5 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md cursor-pointer group"
    : "relative flex min-h-[235px] flex-col justify-between rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md cursor-pointer group";

  // Derive compact formula / concept tag
  const formulaTag = topic.keyFormula
    ? topic.keyFormula.split(";")[0].trim()
    : null;

  return (
    <article className={containerClasses}>
      <div className="space-y-3">
        {/* Top Row: Visual Anchor + Format Badges on Left, Gamification Reward on Right */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Expressive Category Icon Anchor */}
            <div
              className="shrink-0 flex items-center justify-center p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400"
              title="Chuyên đề ngữ pháp"
            >
              <BookOpenCheck className="w-4 h-4" aria-hidden="true" />
            </div>

            {/* Semantic Category & Difficulty Pills */}
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 truncate">
                Ngữ pháp
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border ${diffConfig.badgeClass}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${diffConfig.dotClass}`} aria-hidden="true" />
                {diffConfig.label}
              </span>
            </div>
          </div>

          {/* Status & Reward Tag */}
          <div className="shrink-0 flex items-center gap-1.5">
            {isCompleted ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/70 px-2 py-0.5 rounded-full">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                ✓ {topic.lastScore !== null ? `${topic.lastScore}%` : "Đã làm"}
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 dark:text-amber-200 bg-amber-50/90 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/70 px-2 py-0.5 rounded-full shadow-xs"
                title="Phần thưởng khi hoàn thành bài tập ngữ pháp"
              >
                +5 🍞
              </span>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-1 mt-2">
            {topic.title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2 min-h-[38px] mt-1">
            {topic.description || "Bài học kiến thức trọng tâm và câu hỏi thực hành áp dụng chuẩn ngữ cảnh."}
          </p>
        </div>

        {/* Formula / Concept Micro-Badge */}
        {formulaTag && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/70 truncate max-w-full"
              title={topic.keyFormula || undefined}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
              <span className="truncate">{formulaTag}</span>
            </span>
          </div>
        )}

        {/* Progress Bar & Status */}
        {isCompleted ? (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                Tiến độ: Hoàn thành
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                {topic.lastScore !== null ? `${topic.lastScore}% điểm` : "Đạt yêu cầu"}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full rounded-full bg-emerald-500 w-full transition-all duration-300" />
            </div>
          </div>
        ) : null}
      </div>

      {/* Footer: Metadata & Interactive Action Button */}
      <div className="mt-4 border-t border-slate-100 dark:border-slate-800/80 pt-3">
        <div className="flex items-center justify-between gap-3">
          {/* Metadata */}
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span className="inline-flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              {topic.totalQuestions} câu hỏi
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              ~5 phút
            </span>
          </div>

          {/* Differentiated CTA */}
          {!isAuthenticated ? (
            <button
              type="button"
              onClick={handleCardClick}
              className="bg-white hover:bg-slate-100 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-semibold text-sm px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <Lock className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Đăng nhập để học</span>
            </button>
          ) : isCompleted ? (
            <button
              type="button"
              onClick={() => onStart(topic)}
              className="bg-white hover:bg-emerald-50 text-emerald-700 dark:bg-slate-800 dark:hover:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/80 font-semibold text-sm px-3.5 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs hover:shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Luyện lại ↺</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onStart(topic)}
              className="bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white dark:bg-slate-800 dark:hover:bg-emerald-600 dark:text-emerald-300 dark:hover:text-white border border-emerald-200 dark:border-emerald-700/60 hover:border-transparent font-semibold text-sm px-4 py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <span>Bắt đầu</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default GrammarTopicCard;
