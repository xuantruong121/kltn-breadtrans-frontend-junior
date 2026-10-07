"use client";

import React from "react";
import {
  ArrowRight,
  Check,
  Clock,
  FileImage,
  Flame,
  Lock,
  PenTool,
  RotateCcw,
  Send,
} from "lucide-react";
import type { WritingTopic } from "@/lib/api/services/writing.service";
import {
  type WritingCardStatus,
  computeWritingCardStatus,
  resolveWritingFormatTag,
  resolveWritingPedagogicalDescription,
  resolveWritingSkillTags,
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

function resolveWritingVisualAnchor(formatTag: string) {
  switch (formatTag) {
    case "Viết theo tranh":
      return {
        Icon: FileImage,
        iconContainer:
          "bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-800/60 text-amber-600 dark:text-amber-400",
      };
    case "Phản hồi Email":
      return {
        Icon: Send,
        iconContainer:
          "bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400",
      };
    case "Viết luận quan điểm":
      return {
        Icon: PenTool,
        iconContainer:
          "bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400",
      };
    default:
      return {
        Icon: PenTool,
        iconContainer:
          "bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-800/60 text-rose-600 dark:text-rose-400",
      };
  }
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
  const skillTags = resolveWritingSkillTags(topic);
  const { Icon: AnchorIcon, iconContainer } = resolveWritingVisualAnchor(formatTag);

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
      "relative flex min-h-[235px] flex-col justify-between rounded-xl border border-violet-400 dark:border-violet-500/80 bg-white dark:bg-slate-900 p-4 sm:p-5 ring-2 ring-violet-500/20 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-violet-500 dark:hover:border-violet-400 hover:shadow-md cursor-pointer group",
    COMPLETED:
      "relative flex min-h-[235px] flex-col justify-between rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-50/20 dark:bg-emerald-950/15 p-4 sm:p-5 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md cursor-pointer group",
    NOT_STARTED:
      "relative flex min-h-[235px] flex-col justify-between rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md cursor-pointer group",
    LOCKED:
      "relative flex min-h-[235px] flex-col justify-between rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 p-4 sm:p-5 opacity-90 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm cursor-pointer group",
  }[status];

  return (
    <article className={containerClasses}>
      <div className="space-y-3">
        {/* Top Row: Visual Anchor + Format Badges on Left, Gamification Reward on Right */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Expressive Category Icon Anchor */}
            <div
              className={`shrink-0 flex items-center justify-center p-2 rounded-lg ${iconContainer}`}
              title={formatTag}
            >
              <AnchorIcon className="w-4 h-4" aria-hidden="true" />
            </div>

            {/* Semantic Format & Difficulty Pills */}
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 truncate">
                {formatTag}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border ${diffConfig.badgeClass}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${diffConfig.dotClass}`} aria-hidden="true" />
                {diffConfig.label}
              </span>
              {isLocked && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                  <Lock size={11} aria-hidden="true" />
                  PLUS
                </span>
              )}
            </div>
          </div>

          {/* Gamification Reward Tag */}
          <div className="shrink-0 flex items-center gap-1.5">
            {status === "COMPLETED" ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/70 px-2 py-0.5 rounded-full">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                Đã làm
              </span>
            ) : (
              <>
                {status === "IN_PROGRESS" && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800/70 px-2 py-0.5 rounded-full">
                    <Flame size={12} className="text-amber-500 fill-amber-500" aria-hidden="true" />
                    {isSpotlight ? "Gợi ý" : "Đang làm"}
                  </span>
                )}
                <span
                  className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 dark:text-amber-200 bg-amber-50/90 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/70 px-2 py-0.5 rounded-full shadow-xs"
                  title="Phần thưởng khi hoàn thành bài luyện"
                >
                  +10 🍞
                </span>
              </>
            )}
          </div>
        </div>

        {/* Title & Pedagogical Description */}
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors line-clamp-1 mt-2">
            {topic.topicName || topic.title || "Chủ đề luyện viết"}
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2 min-h-[38px] mt-1">
            {pedagogicalDescription}
          </p>
        </div>

        {/* Sub-skill Micro-Badges */}
        {skillTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {skillTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/70"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500" aria-hidden="true" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Progress Bar & Status */}
        {status === "COMPLETED" ? (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                Tiến độ: Đã hoàn thành
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                100%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full rounded-full bg-emerald-500 w-full transition-all duration-300" />
            </div>
          </div>
        ) : status === "IN_PROGRESS" ? (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                Tiến độ: Đang thực hiện
              </span>
              <span className="text-violet-600 dark:text-violet-400 font-bold">50%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="bg-gradient-to-r from-violet-600 to-indigo-600 h-2 rounded-full w-1/2 transition-all duration-300" />
            </div>
          </div>
        ) : null}
      </div>

      {/* Footer: Metadata & Interactive Action Button */}
      <div className="mt-4 border-t border-slate-100 dark:border-slate-800/80 pt-3">
        <div className="flex items-center justify-between gap-3">
          {/* Metadata */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <Clock className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            <span>~5 phút</span>
          </div>

          {/* Differentiated CTA State Machine */}
          {status === "COMPLETED" ? (
            <button
              type="button"
              onClick={() => onStart?.(topic)}
              disabled={isLaunching}
              className="bg-white hover:bg-emerald-50 text-emerald-700 dark:bg-slate-800 dark:hover:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/80 font-semibold text-sm px-3.5 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 shadow-2xs hover:shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Luyện lại</span>
            </button>
          ) : status === "IN_PROGRESS" ? (
            <button
              type="button"
              onClick={() => onStart?.(topic)}
              disabled={isLaunching}
              className="bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm px-4 py-2 rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <span>Tiếp tục luyện tập</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          ) : status === "NOT_STARTED" ? (
            <button
              type="button"
              onClick={() => onStart?.(topic)}
              disabled={isLaunching}
              className="bg-violet-50 hover:bg-violet-600 text-violet-700 hover:text-white dark:bg-slate-800 dark:hover:bg-violet-600 dark:text-violet-300 dark:hover:text-white border border-violet-200 dark:border-violet-700/60 hover:border-transparent font-semibold text-sm px-4 py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <span>Bắt đầu</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          ) : isLocked ? (
            <button
              type="button"
              onClick={handleCardClick}
              aria-label={`Mở khóa chủ đề viết ${topic.topicName || topic.title || ""}`}
              className="bg-amber-50 hover:bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 dark:text-amber-200 border border-amber-300 dark:border-amber-800 font-semibold text-sm px-3.5 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs hover:shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <Lock className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Mở khóa với PLUS</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCardClick}
              className="bg-white hover:bg-slate-100 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-semibold text-sm px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <Lock className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Đăng nhập để luyện</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default WritingTopicCard;
