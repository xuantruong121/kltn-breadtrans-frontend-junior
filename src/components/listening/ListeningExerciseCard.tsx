"use client";

import React from "react";
import {
  ArrowRight,
  Check,
  Lock,
  RotateCcw,
} from "lucide-react";
import type { ListeningPracticeCatalogItem } from "@/lib/api/services/quiz.service";
import {
  type ListeningCardStatus,
  computeListeningCardStatus,
  resolveCefrBadge,
  resolveListeningFormatTag,
  resolveListeningPedagogicalDescription,
} from "./listeningCardLogic";

export interface ListeningExerciseCardProps {
  quiz: ListeningPracticeCatalogItem;
  isAuthenticated: boolean;
  onOpenAuthGate: (quiz: ListeningPracticeCatalogItem) => void;
  onOpenPaywall?: (quiz: ListeningPracticeCatalogItem) => void;
  onStart?: (quiz: ListeningPracticeCatalogItem) => void;
  isLaunching?: boolean;
  statusOverride?: ListeningCardStatus;
  isSpotlight?: boolean;
}

export function ListeningExerciseCard({
  quiz,
  isAuthenticated,
  onOpenAuthGate,
  onOpenPaywall,
  onStart,
  isLaunching = false,
  statusOverride,
  isSpotlight = false,
}: ListeningExerciseCardProps) {
  const isLocked = Boolean(quiz.isLocked);
  const computedStatus = computeListeningCardStatus({
    isAuthenticated,
    isCompleted: quiz.isCompleted,
    isSpotlight,
    isLocked,
  });

  const status = statusOverride || computedStatus;

  const questionCount = quiz.questionCount ?? quiz._count?.questions ?? 4;
  const durationMinutes =
    quiz.durationMinutes ?? Math.max(2, Math.round((questionCount * 45) / 60));

  const cefr = resolveCefrBadge(quiz.levels);
  const formatTag = resolveListeningFormatTag(quiz);
  const pedagogicalDescription = resolveListeningPedagogicalDescription(quiz);

  // Subtle accent metadata (plain text, only if specified)
  const accents = Array.isArray(quiz.accents) ? quiz.accents : [];
  const accentText = accents.includes("UK")
    ? "Giọng Anh"
    : accents.includes("US")
      ? "Giọng Mỹ"
      : null;

  const handleCardClick = (e: React.MouseEvent) => {
    if (isLocked) {
      e.preventDefault();
      onOpenPaywall?.(quiz);
      return;
    }
    if (!isAuthenticated) {
      e.preventDefault();
      onOpenAuthGate(quiz);
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
        {/* Optional status banner: only for locked or completed */}
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
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  Đã hoàn thành{quiz.score != null ? ` · ${quiz.score}/100` : ""}
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
            {quiz.title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2 min-h-[38px] mt-1.5">
            {pedagogicalDescription}
          </p>
        </div>

        {/* Subtle in-progress bar */}
        {status === "IN_PROGRESS" && (
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Tiến độ</span>
              <span className="font-semibold text-violet-600 dark:text-violet-400">50%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full rounded-full bg-violet-600 w-1/2 transition-all duration-300" />
            </div>
          </div>
        )}
      </div>

      {/* Footer: Clean inline metadata on Left, Clear CTA on Right */}
      <div className="mt-4 border-t border-slate-100 dark:border-slate-800/80 pt-3">
        <div className="flex items-center justify-between gap-3">
          {/* Tertiary inline metadata */}
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
            <span>{cefr.label}</span>
            <span className="mx-1.5">·</span>
            <span>{formatTag}</span>
            {accentText && (
              <>
                <span className="mx-1.5">·</span>
                <span>{accentText}</span>
              </>
            )}
            <span className="mx-1.5">·</span>
            <span>~{durationMinutes} phút</span>
          </div>

          {/* Action CTA */}
          <div className="shrink-0">
            {status === "COMPLETED" ? (
              <button
                type="button"
                onClick={() => onStart?.(quiz)}
                disabled={isLaunching}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                <span>Luyện lại</span>
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            ) : status === "IN_PROGRESS" ? (
              <button
                type="button"
                onClick={() => onStart?.(quiz)}
                disabled={isLaunching}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition-colors cursor-pointer disabled:opacity-60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                <span>Tiếp tục</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            ) : status === "NOT_STARTED" ? (
              <button
                type="button"
                onClick={() => onStart?.(quiz)}
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
                aria-label={`Mở khóa bài nghe ${quiz.title}`}
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

export default ListeningExerciseCard;
