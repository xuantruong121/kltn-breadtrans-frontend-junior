"use client";

import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Flame,
  Layers3,
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
  onStart?: (
    exercise: SpeakingExercise & { practiceSet?: SpeakingPracticeSetSummary },
  ) => void;
  isLaunching?: boolean;
  description?: string;
  tags?: string[];
}

const DIFFICULTY_CONFIG: Record<
  string,
  { label: string; badgeClass: string; dotClass: string }
> = {
  BEGINNER: {
    label: "Cơ bản",
    badgeClass:
      "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200",
    dotClass: "bg-emerald-500",
  },
  INTERMEDIATE: {
    label: "Trung cấp",
    badgeClass:
      "border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200",
    dotClass: "bg-amber-500",
  },
  ADVANCED: {
    label: "Nâng cao",
    badgeClass:
      "border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200",
    dotClass: "bg-rose-500",
  },
};

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
  onStart,
  isLaunching = false,
  description,
  tags,
}: PracticeCardProps) {
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
  });

  const status = statusOverride || computedStatus;

  const difficulty = (
    practiceSet?.difficultyLabel ||
    exercise.difficulty ||
    "BEGINNER"
  ).toUpperCase();
  const diffConfig = DIFFICULTY_CONFIG[difficulty] || {
    label: exercise.difficulty || "Cơ bản",
    badgeClass:
      "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
    dotClass: "bg-slate-400",
  };

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

  const handleCardClick = (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault();
      onOpenAuthGate(exercise);
    }
  };

  // State-specific card styling with compact height, clear contrast, and accessible visual rhythm
  const containerClasses = {
    IN_PROGRESS:
      "relative flex min-h-[220px] flex-col justify-between rounded-2xl border-2 border-violet-400 dark:border-violet-600 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs ring-2 ring-violet-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
    COMPLETED:
      "relative flex min-h-[220px] flex-col justify-between rounded-2xl border border-emerald-200/90 dark:border-emerald-800/60 bg-emerald-50/25 dark:bg-emerald-950/15 p-4 sm:p-5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm",
    NOT_STARTED:
      "relative flex min-h-[220px] flex-col justify-between rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md",
    LOCKED:
      "relative flex min-h-[220px] flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-4 sm:p-5 opacity-90 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs",
  }[status];

  return (
    <article className={`group ${containerClasses}`}>
      <div className="space-y-3">
        {/* 1. Top Badges Row (WCAG 2.2 AA Contrast & Readable Typography) */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Layers3 size={13} aria-hidden="true" />
              {formatTag}
            </span>

            <span
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${diffConfig.badgeClass}`}
            >
              <span
                className={`size-1.5 rounded-full ${diffConfig.dotClass}`}
                aria-hidden="true"
              />
              {diffConfig.label}
            </span>
          </div>

          {/* Dynamic Status Indicator */}
          {status === "COMPLETED" && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 size={13} aria-hidden="true" />
              ✓ ĐÃ HOÀN THÀNH
            </span>
          )}

          {status === "IN_PROGRESS" && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/60 px-2.5 py-1 text-xs font-semibold text-violet-800 dark:text-violet-200">
              <Flame
                size={13}
                className="text-amber-500 fill-amber-500"
                aria-hidden="true"
              />
              {exercise.isSpotlight ? "GỢI Ý HÔM NAY" : "ĐANG HỌC DỞ"}
            </span>
          )}
        </div>

        {/* 2. Topic Title (Upgraded Typography) */}
        <h3 className="text-base sm:text-lg font-bold leading-snug text-slate-900 dark:text-slate-100 tracking-tight line-clamp-1 transition-colors group-hover:text-violet-700 dark:group-hover:text-violet-400">
          {practiceSet?.title || exercise.title}
        </h3>

        {/* 3. Concise Pedagogical Description & Sub-skill Tags */}
        <div className="space-y-2.5">
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 font-normal line-clamp-2 min-h-[40px]">
            {pedagogicalDescription}
          </p>

          {skillTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {skillTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 4. Progress Bar & Score Display */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
            {status === "COMPLETED" ? (
              <>
                <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                  Tiến độ: {totalExercises}/{totalExercises} câu (100%)
                </span>
                {typeof exercise.averageScore === "number" &&
                exercise.averageScore > 0 ? (
                  <span className="inline-flex items-center rounded-md bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-200">
                    Điểm TB: {Math.round(exercise.averageScore)}/100
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    Hoàn thành
                  </span>
                )}
              </>
            ) : status === "IN_PROGRESS" ? (
              <>
                <span>
                  Tiến độ: {completedExercises}/{totalExercises} câu (
                  {progressPercent}%)
                </span>
                <span className="text-violet-600 dark:text-violet-400 font-bold">
                  {progressPercent}%
                </span>
              </>
            ) : (
              <>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Chưa bắt đầu
                </span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {totalExercises} câu
                </span>
              </>
            )}
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                status === "COMPLETED"
                  ? "bg-emerald-500"
                  : status === "IN_PROGRESS"
                    ? "bg-violet-600"
                    : "bg-slate-200 dark:bg-slate-700"
              }`}
              style={{
                width:
                  status === "NOT_STARTED" || status === "LOCKED"
                    ? "0%"
                    : `${progressPercent}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* 5. Footer Metadata & Standardized CTA Row */}
      <div className="mt-4 border-t border-slate-100 dark:border-slate-800/80 pt-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">
            <span
              className="flex items-center gap-1.5"
              title={`${totalExercises} câu hỏi trong bài luyện`}
            >
              <Layers3 size={14} className="text-slate-400" aria-hidden="true" />
              {totalExercises} câu
            </span>
            <span
              className="flex items-center gap-1.5"
              title="Thời gian ước tính hoàn thành"
            >
              <Clock size={14} className="text-slate-400" aria-hidden="true" />
              ~{estimatedMinutes} phút
            </span>
          </div>

          {/* Differentiated CTA State Machine with Standard 40px Height */}
          {status === "COMPLETED" ? (
            <button
              type="button"
              onClick={() => onStart?.(exercise)}
              disabled={isLaunching}
              className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700/80 bg-white/90 dark:bg-slate-800/90 px-4 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300 shadow-2xs transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-950/40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer disabled:opacity-60"
            >
              <RotateCcw size={13} aria-hidden="true" />
              Luyện lại
            </button>
          ) : status === "IN_PROGRESS" ? (
            <button
              type="button"
              onClick={() => onStart?.(exercise)}
              disabled={isLaunching}
              className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 px-4 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:shadow-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-500 cursor-pointer disabled:opacity-60"
            >
              Tiếp tục luyện tập
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          ) : status === "NOT_STARTED" ? (
            <button
              type="button"
              onClick={() => onStart?.(exercise)}
              disabled={isLaunching}
              className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl bg-slate-100 hover:bg-violet-600 hover:text-white dark:bg-slate-800 dark:hover:bg-violet-600 text-slate-700 dark:text-slate-200 dark:hover:text-white px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-500 cursor-pointer disabled:opacity-60"
            >
              Bắt đầu
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCardClick}
              className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-500 cursor-pointer"
            >
              <Lock size={13} aria-hidden="true" />
              Đăng nhập để luyện
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
