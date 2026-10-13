"use client";

import React from "react";
import {
  ArrowRight,
  Check,
  Lock,
  RotateCcw,
} from "lucide-react";
import type { WritingTopic } from "@/lib/api/services/writing.service";
import {
  type WritingCardStatus,
  computeWritingCardStatus,
  resolveWritingFormatTag,
  resolveWritingPedagogicalDescription,
  WRITING_DIFFICULTY_CONFIG,
} from "./writingCardLogic";

export interface WritingTopicItem extends WritingTopic {
  topicName?: string;
  isCompleted?: boolean;
  category?: string;
  wordCount?: number;
  level?: string;
  isSpotlight?: boolean;
}

interface WritingTopicCardProps {
  topic: WritingTopicItem;
  isAuthenticated: boolean;
  onOpenAuthGate: (topic: WritingTopicItem) => void;
  onOpenPaywall?: (topic: WritingTopicItem) => void;
  onStart?: (topic: WritingTopicItem) => void;
  isLaunching?: boolean;
  statusOverride?: WritingCardStatus;
  isSpotlight?: boolean;
}

export function WritingTopicCard({
  topic,
  isAuthenticated,
  onOpenAuthGate,
  onOpenPaywall,
  onStart,
  isLaunching = false,
  statusOverride,
  isSpotlight = false,
}: WritingTopicCardProps) {
  const isLocked = Boolean(topic.isLocked);

  const computedStatus = computeWritingCardStatus({
    isAuthenticated,
    isCompleted: topic.isCompleted,
    isSpotlight,
    isLocked,
  });

  const status = statusOverride || computedStatus;

  const level = (topic.level || "BEGINNER").toUpperCase();
  const diffConfig =
    WRITING_DIFFICULTY_CONFIG[level] ||
    (level.includes("A")
      ? WRITING_DIFFICULTY_CONFIG.BEGINNER
      : level.includes("B")
        ? WRITING_DIFFICULTY_CONFIG.INTERMEDIATE
        : WRITING_DIFFICULTY_CONFIG.ADVANCED);

  const formatTag = resolveWritingFormatTag(topic);
  const pedagogicalDescription = resolveWritingPedagogicalDescription(topic);

  const handleCardClick = (e: React.MouseEvent) => {
    if (isLocked) {
      e.preventDefault();
      onOpenPaywall?.(topic);
      return;
    }
    if (!isAuthenticated) {
      e.preventDefault();
      onOpenAuthGate(topic);
    }
  };

  const containerClasses = {
    IN_PROGRESS:
      "relative flex min-h-[220px] flex-col justify-between rounded-xl border border-violet-300 dark:border-violet-700/60 bg-white dark:bg-slate-900 p-5 shadow-2xs transition-all duration-200 hover:border-violet-400 dark:hover:border-violet-600 hover:shadow-xs cursor-pointer group",
    COMPLETED:
      "relative flex min-h-[220px] flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs cursor-pointer group",
    NOT_STARTED:
      "relative flex min-h-[220px] flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs cursor-pointer group",
    LOCKED:
      "relative flex min-h-[220px] flex-col justify-between rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 p-5 opacity-90 shadow-2xs transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-2xs cursor-pointer group",
  }[status];

  return (
    <article className={containerClasses}>
      <div className="space-y-2.5">
        {/* Status header line: only when locked, completed, or in progress */}
        {(isLocked || status === "COMPLETED" || status === "IN_PROGRESS") && (
          <div className="flex items-center justify-between gap-2">
            {isLocked ? (
              <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80">
                <Lock size={10} aria-hidden="true" />
                PLUS
              </span>
            ) : (
              <span />
            )}

            {status === "COMPLETED" ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <span>Đã hoàn thành</span>
              </span>
            ) : status === "IN_PROGRESS" ? (
              <span className="text-xs font-medium text-violet-700 dark:text-violet-400">
                Đang luyện tập
              </span>
            ) : null}
          </div>
        )}

        {/* Title & Pedagogical Description */}
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors line-clamp-1 break-words">
            {topic.title || topic.topicName || "Chủ đề luyện viết"}
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2 min-h-[38px] mt-1.5">
            {pedagogicalDescription}
          </p>
        </div>

        {/* Subtle In-progress bar */}
        {status === "IN_PROGRESS" && (
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Tiến độ</span>
              <span className="font-semibold text-violet-600 dark:text-violet-400">
                Đang thực hiện
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full rounded-full bg-violet-600 w-1/2 transition-all duration-300" />
            </div>
          </div>
        )}
      </div>

      {/* Footer: Metadata on Left, Action CTA on Right */}
      <div className="mt-4 border-t border-slate-100 dark:border-slate-800/80 pt-3">
        <div className="flex items-center justify-between gap-3">
          {/* Metadata */}
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
            <span>{formatTag}</span>
            <span className="mx-1.5">·</span>
            <span>{diffConfig.label}</span>
            <span className="mx-1.5">·</span>
            <span>~5 phút</span>
          </div>

          {/* Action CTA */}
          <div className="shrink-0">
            {status === "COMPLETED" ? (
              <button
                type="button"
                onClick={() => onStart?.(topic)}
                disabled={isLaunching}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                <span>Luyện lại</span>
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            ) : status === "IN_PROGRESS" ? (
              <button
                type="button"
                onClick={() => onStart?.(topic)}
                disabled={isLaunching}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition-colors cursor-pointer disabled:opacity-60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                <span>Tiếp tục</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            ) : status === "NOT_STARTED" ? (
              <button
                type="button"
                onClick={() => onStart?.(topic)}
                disabled={isLaunching}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-100 hover:bg-violet-600 dark:bg-slate-800 dark:hover:bg-violet-600 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 hover:text-white dark:text-slate-200 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                <span>Bắt đầu</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            ) : isLocked ? (
              <button
                type="button"
                onClick={handleCardClick}
                aria-label={`Mở khóa chủ đề ${topic.title || topic.topicName || ""}`}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-amber-900 dark:text-amber-200 transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Mở khóa với PLUS</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCardClick}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Đăng nhập để luyện</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default WritingTopicCard;
