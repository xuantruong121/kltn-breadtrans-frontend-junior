"use client";

import React from "react";
import {
  ArrowRight,
  Award,
  Check,
  Clock,
  Flame,
  Layers3,
  Lightbulb,
  Lock,
  MessageSquare,
  Mic,
  RotateCcw,
  Volume2,
} from "lucide-react";
import type {
  SpeakingExercise,
  SpeakingPracticeSetSummary,
} from "@/lib/api/services/speaking.service";
import {
  type PracticeCardStatus,
  type PracticeExerciseItem,
  computePracticeCardStatus,
  resolveDifficultyBadge,
  resolveFormatTag,
  resolvePedagogicalDescription,
  resolveSkillTags,
} from "./practiceCardLogic";

export type { PracticeCardStatus, PracticeExerciseItem };

export interface PracticeCardProps {
  exercise: PracticeExerciseItem;
  isAuthenticated: boolean;
  statusOverride?: PracticeCardStatus;
  onOpenAuthGate: (exercise: SpeakingExercise) => void;
  onOpenPaywall?: (exercise: PracticeExerciseItem) => void;
  onStart?: (
    exercise: SpeakingExercise & { practiceSet?: SpeakingPracticeSetSummary },
  ) => void;
  isLaunching?: boolean;
  description?: string;
  tags?: string[];
}

/**
 * Resolves expressive format visual anchor icon and container styling.
 */
function resolveCategoryVisualAnchor(formatTag: string, title?: string, category?: string) {
  const text = `${formatTag} ${title || ""} ${category || ""}`.toLowerCase();
  if (text.includes("đọc") || text.includes("read aloud") || text.includes("read")) {
    return {
      Icon: Volume2,
      iconContainer:
        "bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400",
    };
  }
  if (text.includes("phản hồi") || text.includes("question response") || text.includes("câu hỏi")) {
    return {
      Icon: MessageSquare,
      iconContainer:
        "bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-800/60 text-blue-600 dark:text-blue-400",
    };
  }
  if (text.includes("quan điểm") || text.includes("opinion") || text.includes("bày tỏ")) {
    return {
      Icon: Lightbulb,
      iconContainer:
        "bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-800/60 text-amber-600 dark:text-amber-400",
    };
  }
  if (text.includes("toeic") || text.includes("ets") || text.includes("mô phỏng")) {
    return {
      Icon: Award,
      iconContainer:
        "bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-800/60 text-rose-600 dark:text-rose-400",
    };
  }
  return {
    Icon: Mic,
    iconContainer:
      "bg-violet-50 dark:bg-violet-950/60 border border-violet-100 dark:border-violet-800/60 text-violet-600 dark:text-violet-400",
  };
}

export {
  resolveFormatTag,
  resolvePedagogicalDescription,
  resolveSkillTags,
  computePracticeCardStatus,
};

export function PracticeCard({
  exercise,
  isAuthenticated,
  statusOverride,
  onOpenAuthGate,
  onOpenPaywall,
  onStart,
  isLaunching = false,
  description,
  tags,
}: PracticeCardProps) {
  const isLocked = Boolean(exercise.isLocked);
  const practiceSet = exercise.practiceSet;

  const computedStatus = computePracticeCardStatus({
    isAuthenticated,
    isCompleted: exercise.isCompleted,
    practiceSet: practiceSet
      ? {
          exerciseCount: practiceSet.exerciseCount,
          completedCount: practiceSet.completedCount,
          isCompleted: practiceSet.isCompleted,
        }
      : undefined,
    isSpotlight: exercise.isSpotlight,
    isLocked,
  });

  const status = statusOverride || computedStatus;

  const diffConfig = resolveDifficultyBadge(
    practiceSet?.difficultyLabel || exercise.difficulty
  );

  const totalExercises = practiceSet?.exerciseCount || 1;
  const completedExercises =
    practiceSet?.completedCount ||
    (status === "COMPLETED" ? totalExercises : 0);
  const progressPercent = Math.min(
    100,
    Math.round((completedExercises / totalExercises) * 100),
  );
  const estimatedMinutes = Math.max(1, Math.round((totalExercises * 40) / 60));

  const formatTag = resolveFormatTag(exercise);
  const pedagogicalDescription = resolvePedagogicalDescription(
    exercise,
    description,
  );
  const skillTags = resolveSkillTags(exercise, tags);
  const { Icon: AnchorIcon, iconContainer } = resolveCategoryVisualAnchor(
    formatTag,
    practiceSet?.title || exercise.title,
    exercise.category,
  );

  const handleCardClick = (e: React.MouseEvent) => {
    if (isLocked) {
      e.preventDefault();
      onOpenPaywall?.(exercise);
      return;
    }
    if (!isAuthenticated) {
      e.preventDefault();
      onOpenAuthGate(exercise);
    }
  };

  // State-specific card styling with uniform 230px min-height, tactile hover elevation, and accessible contrast
  const containerClasses = {
    IN_PROGRESS:
      "relative flex min-h-[230px] flex-col justify-between rounded-xl border border-violet-400 dark:border-violet-500/80 bg-white dark:bg-slate-900 p-4 sm:p-5 ring-2 ring-violet-500/20 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-violet-500 dark:hover:border-violet-400 hover:shadow-md cursor-pointer group",
    COMPLETED:
      "relative flex min-h-[230px] flex-col justify-between rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-50/20 dark:bg-emerald-950/15 p-4 sm:p-5 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md cursor-pointer group",
    NOT_STARTED:
      "relative flex min-h-[230px] flex-col justify-between rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md cursor-pointer group",
    LOCKED:
      "relative flex min-h-[230px] flex-col justify-between rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 p-4 sm:p-5 opacity-90 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm cursor-pointer group",
  }[status];

  return (
    <article className={containerClasses}>
      <div className="space-y-3">
        {/* A & B. Header: Category Visual Anchor + Badges on Left, Gamification Reward on Right */}
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
                <span
                  className={`w-1.5 h-1.5 rounded-full ${diffConfig.dotClass}`}
                  aria-hidden="true"
                />
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

          {/* Gamification Reward Tag (Top-Right) */}
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
                    {exercise.isSpotlight ? "Gợi ý" : "Đang làm"}
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* C. Typography: Topic Title & Objective Description */}
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors line-clamp-1 mt-2">
            {practiceSet?.title || exercise.title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2 min-h-[38px] mt-1">
            {pedagogicalDescription}
          </p>
        </div>

        {/* Sub-skill Micro-Badges with Tactile Dot Indicators */}
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

        {/* Progress Bar & Score Display */}
        {status === "COMPLETED" ? (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                Tiến độ: {totalExercises}/{totalExercises} câu
              </span>
              {typeof exercise.averageScore === "number" && exercise.averageScore > 0 ? (
                <span className="inline-flex items-center rounded-md bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-200">
                  Điểm TB: {Math.round(exercise.averageScore)}/100
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  Hoàn thành
                </span>
              )}
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full rounded-full bg-emerald-500 w-full transition-all duration-300" />
            </div>
          </div>
        ) : status === "IN_PROGRESS" ? (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                Tiến độ: {completedExercises}/{totalExercises} câu
              </span>
              <span className="text-violet-600 dark:text-violet-400 font-bold">
                {progressPercent}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="bg-gradient-to-r from-violet-600 to-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* D. Footer: Metadata & Interactive Action Button */}
      <div className="mt-4 border-t border-slate-100 dark:border-slate-800/80 pt-3">
        <div className="flex items-center justify-between gap-3">
          {/* Duration Metadata */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            {status === "NOT_STARTED" ? (
              <>
                <Clock className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                <span>Chưa bắt đầu · ~{estimatedMinutes} phút</span>
              </>
            ) : status === "COMPLETED" ? (
              <>
                <Layers3 className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                <span>{totalExercises} câu · ~{estimatedMinutes} phút</span>
              </>
            ) : status === "IN_PROGRESS" ? (
              <>
                <Clock className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                <span>Còn {totalExercises - completedExercises} câu · ~{Math.max(1, Math.round(((totalExercises - completedExercises) * 40) / 60))} phút</span>
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                <span>{totalExercises} câu · ~{estimatedMinutes} phút</span>
              </>
            )}
          </div>

          {/* Differentiated CTA State Machine */}
          {status === "COMPLETED" ? (
            <button
              type="button"
              onClick={() => onStart?.(exercise)}
              disabled={isLaunching}
              className="bg-white hover:bg-emerald-50 text-emerald-700 dark:bg-slate-800 dark:hover:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/80 font-semibold text-sm px-3.5 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 shadow-2xs hover:shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Luyện lại</span>
            </button>
          ) : status === "IN_PROGRESS" ? (
            <button
              type="button"
              onClick={() => onStart?.(exercise)}
              disabled={isLaunching}
              className="bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm px-4 py-2 rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <span>Tiếp tục luyện tập</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          ) : status === "NOT_STARTED" ? (
            <button
              type="button"
              onClick={() => onStart?.(exercise)}
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
              aria-label={`Mở khóa bài luyện nói ${practiceSet?.title || exercise.title}`}
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

export default PracticeCard;
