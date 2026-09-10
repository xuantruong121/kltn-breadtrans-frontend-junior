"use client";

import { ArrowRight, CheckCircle2, Clock, Lock, Mic, Type } from "lucide-react";
import type { SpeakingExercise } from "@/lib/api/services/speaking.service";

interface SpeakingExerciseCardProps {
  exercise: SpeakingExercise & { isCompleted?: boolean };
  isAuthenticated: boolean;
  onOpenAuthGate: (exercise: SpeakingExercise) => void;
  onStart?: (exercise: SpeakingExercise) => void;
  isLaunching?: boolean;
}

const DIFFICULTY_CONFIG: Record<
  string,
  { label: string; badgeClass: string }
> = {
  BEGINNER: {
    label: "Cơ bản",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  INTERMEDIATE: {
    label: "Trung cấp",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-800",
  },
  ADVANCED: {
    label: "Nâng cao",
    badgeClass: "border-rose-200 bg-rose-50 text-rose-800",
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
  const difficulty = (exercise.difficulty || "BEGINNER").toUpperCase();
  const diffConfig = DIFFICULTY_CONFIG[difficulty] || {
    label: exercise.difficulty || "Cơ bản",
    badgeClass: "border-slate-200 bg-slate-50 text-slate-700",
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
    <article className="group flex min-h-72 flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-purple-300 hover:shadow-md sm:p-6">
      <div className="space-y-3.5">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-lg border border-purple-200/80 bg-purple-50 px-2.5 py-0.5 text-[11px] font-extrabold text-purple-700">
              <Mic size={12} aria-hidden="true" />
              {exercise.category || "GENERAL"}
            </span>

            <span
              className={`rounded-lg border px-2 py-0.5 text-[11px] font-bold ${diffConfig.badgeClass}`}
            >
              {diffConfig.label}
            </span>
          </div>

          {isCompleted && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-700">
              <CheckCircle2 size={12} aria-hidden="true" /> Đã hoàn thành
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-base font-extrabold leading-snug text-slate-900 transition-colors group-hover:text-purple-700 sm:text-lg">
          {exercise.title}
        </h3>

        {/* Target Sentence Preview Box */}
        {exercise.targetText && (
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
            <p className="line-clamp-2 text-xs font-semibold leading-relaxed text-slate-600 italic">
              &ldquo;{exercise.targetText}&rdquo;
            </p>
            {exercise.translation && (
              <p className="mt-1 line-clamp-1 text-[11px] font-medium not-italic text-slate-500">
                {exercise.translation}
              </p>
            )}
          </div>
        )}

        {/* Description fallback if no targetText */}
        {!exercise.targetText && exercise.description && (
          <p className="line-clamp-2 text-xs leading-5 text-slate-600 sm:text-sm">
            {exercise.description}
          </p>
        )}
      </div>

      {/* Bottom Row */}
      <div className="mt-5 border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Type size={13} className="text-slate-400" aria-hidden="true" />
              {wordCount} từ
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock size={13} className="text-slate-400" aria-hidden="true" />
              ~{estimatedSeconds}s
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
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3.5 text-xs font-extrabold text-purple-700 transition-colors hover:bg-purple-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 cursor-pointer"
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
