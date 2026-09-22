"use client";

import { ArrowRight, CheckCircle2, Clock, Layers3, Lock, Type } from "lucide-react";
import type { SpeakingExercise, SpeakingPracticeSetSummary } from "@/lib/api/services/speaking.service";

interface SpeakingExerciseCardProps {
  exercise: SpeakingExercise & { isCompleted?: boolean; practiceSet?: SpeakingPracticeSetSummary };
  isAuthenticated: boolean;
  onOpenAuthGate: (exercise: SpeakingExercise) => void;
  onStart?: (exercise: SpeakingExercise & { practiceSet?: SpeakingPracticeSetSummary }) => void;
  isLaunching?: boolean;
}

const DIFFICULTY_CONFIG: Record<
  string,
  { label: string; badgeClass: string }
> = {
  BEGINNER: {
    label: "Cơ bản",
    badgeClass: "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300",
  },
  INTERMEDIATE: {
    label: "Trung cấp",
    badgeClass: "border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300",
  },
  ADVANCED: {
    label: "Nâng cao",
    badgeClass: "border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300",
  },
};

export function SpeakingExerciseCard({
  exercise,
  isAuthenticated,
  onOpenAuthGate,
  onStart,
  isLaunching = false,
}: SpeakingExerciseCardProps) {
  const isCompleted = exercise.isCompleted;
  const practiceSet = exercise.practiceSet;
  const difficulty = (practiceSet?.difficultyLabel || exercise.difficulty || "BEGINNER").toUpperCase();
  const diffConfig = DIFFICULTY_CONFIG[difficulty] || {
    label: exercise.difficulty || "Cơ bản",
    badgeClass: "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
  };

  const wordCount = exercise.targetText
    ? exercise.targetText.trim().split(/\s+/).filter(Boolean).length
    : 0;

  const estimatedSeconds = Math.max(25, Math.min(90, Math.round(wordCount * 3.5)));

  const handleCardClick = (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault();
      onOpenAuthGate(exercise);
    }
  };

  return (
    <article className="group flex min-h-72 flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-md sm:p-6">
      <div className="space-y-3.5">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-lg border border-purple-200/80 dark:border-purple-800/60 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-0.5 text-[11px] font-extrabold text-purple-700 dark:text-purple-300">
              <Layers3 size={12} aria-hidden="true" />
              {practiceSet ? "BỘ LUYỆN" : exercise.category || "GENERAL"}
            </span>

            <span
              className={`rounded-lg border px-2 py-0.5 text-[11px] font-bold ${diffConfig.badgeClass}`}
            >
              {diffConfig.label}
            </span>
          </div>

          {isCompleted && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 size={12} aria-hidden="true" /> Đã hoàn thành
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-base font-extrabold leading-snug text-slate-900 dark:text-slate-100 transition-colors group-hover:text-purple-700 dark:group-hover:text-purple-400 sm:text-lg">
          {practiceSet?.title || exercise.title}
        </h3>

        {/* Target Sentence Preview Box */}
        {exercise.targetText && (
          <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 p-3">
            <p className="line-clamp-2 text-xs font-semibold leading-relaxed text-slate-600 dark:text-slate-300 italic">
              &ldquo;{exercise.targetText}&rdquo;
            </p>
            {exercise.translation && (
              <p className="mt-1 line-clamp-1 text-[11px] font-medium not-italic text-slate-500 dark:text-slate-400">
                {exercise.translation}
              </p>
            )}
          </div>
        )}

        {practiceSet && (
          <p className="text-xs font-semibold text-purple-700 dark:text-purple-400">
            {practiceSet.exerciseCount} câu · {practiceSet.completedCount}/{practiceSet.exerciseCount} đã hoàn thành
          </p>
        )}

        {/* Description fallback if no targetText */}
        {!exercise.targetText && exercise.description && (
          <p className="line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-400 sm:text-sm">
            {exercise.description}
          </p>
        )}
      </div>

      {/* Bottom Row */}
      <div className="mt-5 border-t border-slate-100 dark:border-slate-800 pt-4">
        <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Type size={13} className="text-slate-400" aria-hidden="true" />
              {practiceSet ? `${practiceSet.exerciseCount} câu` : `${wordCount} từ`}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock size={13} className="text-slate-400" aria-hidden="true" />
              {practiceSet ? `~${Math.max(1, Math.ceil((wordCount * practiceSet.exerciseCount) / 35))} phút` : `~${estimatedSeconds}s`}
            </span>
          </div>

          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => onStart?.(exercise)}
              disabled={isLaunching}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 text-xs font-extrabold text-white shadow-xs transition-colors hover:bg-purple-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 disabled:opacity-60 cursor-pointer"
            >
              {isCompleted ? "Luyện tập lại" : "Bắt đầu bài nói"}
              <ArrowRight size={13} aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCardClick}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-purple-300 dark:border-purple-800/80 bg-purple-50 dark:bg-purple-950/50 px-3.5 text-xs font-extrabold text-purple-800 dark:text-purple-300 transition-colors hover:bg-purple-100 dark:hover:bg-purple-900/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 cursor-pointer"
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
