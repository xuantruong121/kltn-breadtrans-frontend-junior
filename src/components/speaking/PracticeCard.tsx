"use client";

import React from "react";
import {
  ArrowRight,
  Check,
  Lock,
  RotateCcw,
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
    practiceSet?.difficultyLabel || exercise.difficulty,
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
        {/* Status header line: only when locked, completed, or in-progress */}
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
                <span>
                  Đã hoàn thành{typeof exercise.averageScore === "number" && exercise.averageScore > 0 ? ` · ${Math.round(exercise.averageScore)}/100` : ""}
                </span>
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
            {practiceSet?.title || exercise.title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2 min-h-[38px] mt-1.5">
            {pedagogicalDescription}
          </p>
        </div>

        {/* Subtle In-progress bar */}
        {status === "IN_PROGRESS" && (
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{completedExercises}/{totalExercises} câu</span>
              <span className="font-semibold text-violet-600 dark:text-violet-400">
                {progressPercent}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-violet-600 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer: Metadata on Left, Action on Right */}
      <div className="mt-4 border-t border-slate-100 dark:border-slate-800/80 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>{formatTag}</span>
            <span>·</span>
            <span>{diffConfig.label}</span>
            <span>·</span>
            <span>~{estimatedMinutes} phút</span>
          </div>

          {/* Action CTA */}
          <div className="shrink-0 ml-auto">
            {status === "COMPLETED" ? (
              <button
                type="button"
                onClick={() => onStart?.(exercise)}
                disabled={isLaunching}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                <span>Luyện lại</span>
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            ) : status === "IN_PROGRESS" ? (
              <button
                type="button"
                onClick={() => onStart?.(exercise)}
                disabled={isLaunching}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition-colors cursor-pointer disabled:opacity-60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                <span>Tiếp tục</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            ) : status === "NOT_STARTED" ? (
              <button
                type="button"
                onClick={() => onStart?.(exercise)}
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
                aria-label={`Mở khóa bài luyện nói ${practiceSet?.title || exercise.title}`}
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

export default PracticeCard;
