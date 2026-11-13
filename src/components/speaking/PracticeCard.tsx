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
  speakingSetKindLabel,
} from "./practiceCardLogic";
import { unlockPlanFor } from "@/modules/subscription/practicePlan";
import { catalogLevelLabel } from "@/lib/practice/catalogFilters";
import { LevelLockButton } from "@/components/practice/LevelLockDialog";
import { planName } from "@/lib/ui/glossary";

export type { PracticeCardStatus, PracticeExerciseItem };

export interface PracticeCardProps {
  exercise: PracticeExerciseItem;
  isAuthenticated: boolean;
  statusOverride?: PracticeCardStatus;
  onOpenAuthGate: (exercise: SpeakingExercise) => void;
  onOpenPaywall?: (exercise: PracticeExerciseItem) => void;
  onOpenLevelLock?: (exercise: PracticeExerciseItem) => void;
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
  onOpenLevelLock,
  onStart,
  isLaunching = false,
  description,
}: PracticeCardProps) {
  const isLocked = Boolean(exercise.isLocked);
  // A guest is asked to log in first, not told about a level.
  const levelLocked = isAuthenticated && Boolean(exercise.isLevelLocked);
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
    isLocked: isLocked || levelLocked,
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

  // The kind of task comes from the exercises themselves; the title guess is
  // only for data that has no task type.
  const kindLabel = speakingSetKindLabel(exercise.taskTypes ?? []);
  const formatTag = kindLabel ?? resolveFormatTag(exercise);
  const pedagogicalDescription = resolvePedagogicalDescription(
    exercise,
    description,
  );

  const handleCardClick = (e: React.MouseEvent) => {
    if (levelLocked) {
      e.preventDefault();
      onOpenLevelLock?.(exercise);
      return;
    }
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
      "relative flex min-h-[220px] flex-col justify-between rounded-xl border border-teal-300 dark:border-teal-700/60 bg-white dark:bg-slate-900 p-5 shadow-2xs transition-all duration-200 hover:border-teal-400 dark:hover:border-teal-600 hover:shadow-xs cursor-pointer group",
    // Completed: emerald border and faint ground, as the Listening card (owner 2026-11-12/13).
    COMPLETED:
      "relative flex min-h-[220px] flex-col justify-between rounded-xl border border-emerald-300 dark:border-emerald-800/70 bg-emerald-50/40 dark:bg-emerald-950/20 p-5 shadow-2xs transition-[border-color,box-shadow] duration-200 hover:border-emerald-400 dark:hover:border-emerald-700 hover:shadow-xs cursor-pointer group",
    NOT_STARTED:
      "relative flex min-h-[220px] flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs cursor-pointer group",
    LOCKED:
      "relative flex min-h-[220px] flex-col justify-between rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 p-5 opacity-90 shadow-2xs transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-2xs cursor-pointer group",
  }[status];

  const unlockPlan = unlockPlanFor("SPEAKING", exercise.requiredPlan);

  return (
    <article className={containerClasses}>
      <div className="space-y-2.5">
        {/* Completed: a readable status; no score on the card (owner 2026-11-13). */}
        {status === "COMPLETED" && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[13px] font-semibold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
              Đã hoàn thành
            </span>
          </div>
        )}

        {/* Title & Pedagogical Description */}
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors line-clamp-1 break-words">
            {practiceSet?.title || exercise.title}
          </h3>
          {/* What the learner does: read a model sentence or answer freely (owner 2026-11-13). */}
          <p className="mt-1 text-[13px] font-semibold text-slate-700 dark:text-slate-300">{formatTag}</p>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2 min-h-[38px] mt-1.5">
            {pedagogicalDescription}
          </p>
        </div>

        {/* Subtle In-progress bar */}
        {status === "IN_PROGRESS" && (
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>{completedExercises}/{totalExercises} câu</span>
              <span className="font-semibold text-teal-700 dark:text-teal-400">
                {progressPercent}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-teal-600 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer: Metadata on Left, Action on Right */}
      <div className={`mt-4 border-t pt-3 ${status === "COMPLETED" ? "border-emerald-100 dark:border-emerald-900/50" : "border-slate-100 dark:border-slate-800/80"}`}>
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
            <span>
              {catalogLevelLabel(exercise.cefrLevel ?? exercise.title, exercise.practiceLevel) ?? diffConfig.label}
            </span>
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
                className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 px-3.5 text-sm font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer disabled:opacity-60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Luyện lại</span>
              </button>
            ) : status === "IN_PROGRESS" ? (
              <button
                type="button"
                onClick={() => onStart?.(exercise)}
                disabled={isLaunching}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 px-3.5 py-1.5 text-sm font-semibold text-white shadow-xs transition-colors cursor-pointer disabled:opacity-60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                <span>Tiếp tục</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            ) : status === "NOT_STARTED" ? (
              <button
                type="button"
                onClick={() => onStart?.(exercise)}
                disabled={isLaunching}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-100 hover:bg-teal-600 dark:bg-slate-800 dark:hover:bg-teal-600 px-3.5 py-1.5 text-sm font-semibold text-slate-700 hover:text-white dark:text-slate-200 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                <span>Bắt đầu</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            ) : levelLocked ? (
              <LevelLockButton
                onClick={handleCardClick}
                ariaLabel={`Chưa mở mức của bài luyện nói ${practiceSet?.title || exercise.title}`}
              />
            ) : isLocked ? (
              <button
                type="button"
                onClick={handleCardClick}
                aria-label={`Mở khóa bài luyện nói ${practiceSet?.title || exercise.title}`}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 px-3.5 py-1.5 text-sm font-semibold text-amber-900 dark:text-amber-200 transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Mở khóa với {planName(unlockPlan)}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCardClick}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 px-3.5 py-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-teal-500"
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
