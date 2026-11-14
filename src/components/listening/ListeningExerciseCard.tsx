"use client";

import React from "react";
import {
  ArrowRight,
  Lock,
  RotateCcw,
  Users,
  Megaphone,
} from "lucide-react";
import type { ListeningPracticeCatalogItem } from "@/lib/api/services/quiz.service";
import {
  type ListeningCardStatus,
  computeListeningCardStatus,
  resolveCefrBadge,
  listeningFormatIcon,
  resolveListeningFormatTag,
  resolveListeningPedagogicalDescription,
} from "./listeningCardLogic";
import { catalogLevelLabel } from "@/lib/practice/catalogFilters";
import { LevelLockButton } from "@/components/practice/LevelLockDialog";
import { COMPLETED_CARD_CLASS, CompletedPill, COMPLETED_RETRY_CLASS, COMPLETED_FOOTER_BORDER } from "@/components/practice/completedCard";

export interface ListeningExerciseCardProps {
  quiz: ListeningPracticeCatalogItem;
  isAuthenticated: boolean;
  onOpenAuthGate: (quiz: ListeningPracticeCatalogItem) => void;
  onOpenPaywall?: (quiz: ListeningPracticeCatalogItem) => void;
  onOpenLevelLock?: (quiz: ListeningPracticeCatalogItem) => void;
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
  onOpenLevelLock,
  onStart,
  isLaunching = false,
  statusOverride,
  isSpotlight = false,
}: ListeningExerciseCardProps) {
  const isLocked = Boolean(quiz.isLocked);
  // A guest is asked to log in first, not told about a level.
  const levelLocked = isAuthenticated && Boolean(quiz.isLevelLocked);
  const computedStatus = computeListeningCardStatus({
    isAuthenticated,
    isCompleted: quiz.isCompleted,
    isSpotlight,
    isLocked: isLocked || levelLocked,
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
    if (levelLocked) {
      e.preventDefault();
      onOpenLevelLock?.(quiz);
      return;
    }
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
      "relative flex min-h-[220px] flex-col justify-between rounded-xl border border-teal-300 dark:border-teal-700/60 bg-white dark:bg-slate-900 p-5 shadow-2xs transition-[border-color,box-shadow] duration-200 hover:border-teal-400 dark:hover:border-teal-600 hover:shadow-xs cursor-pointer group",
    // Completed: the border and a faint ground take the pill's emerald (owner 2026-11-12).
    COMPLETED:
      COMPLETED_CARD_CLASS,
    NOT_STARTED:
      "relative flex min-h-[220px] flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs transition-[border-color,box-shadow] duration-200 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs cursor-pointer group",
    LOCKED:
      "relative flex min-h-[220px] flex-col justify-between rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 p-5 opacity-90 shadow-2xs transition-[border-color,box-shadow] duration-200 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-2xs cursor-pointer group",
  }[status];

  return (
    <article className={containerClasses}>
      <div className="space-y-2.5">
        {/* Completed: a readable status and the score on the first line (owner 2026-11-12:
            the 12 px green note alone in the corner was hard to read). */}
        {status === "COMPLETED" && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <CompletedPill />
            {quiz.score != null && (
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Điểm <span className="font-bold tabular-nums text-slate-900 dark:text-slate-100">{quiz.score}</span>
                <span className="tabular-nums">/100</span>
              </span>
            )}
          </div>
        )}

        {/* Title & Pedagogical Description */}
        <div>
          <h3
            className={`text-base font-semibold text-slate-900 dark:text-slate-100 transition-colors line-clamp-1 break-words ${
              status === "COMPLETED" ? "" : "group-hover:text-teal-600 dark:group-hover:text-teal-400"
            }`}
          >
            {quiz.title}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2 min-h-[38px] mt-1.5">
            {pedagogicalDescription}
          </p>
        </div>

        {/* Subtle in-progress bar */}
        {status === "IN_PROGRESS" && (
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>Tiến độ</span>
              <span className="font-semibold text-teal-700 dark:text-teal-400">50%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full rounded-full bg-teal-600 w-1/2 transition-[width] duration-300" />
            </div>
          </div>
        )}
      </div>

      {/* Footer: Clean inline metadata on Left, Clear CTA on Right */}
      <div className={`mt-4 border-t pt-3 ${status === "COMPLETED" ? COMPLETED_FOOTER_BORDER : "border-slate-100 dark:border-slate-800/80"}`}>
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Tertiary inline metadata */}
          <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-slate-600 dark:text-slate-400 font-medium">
            <span>
              {catalogLevelLabel(quiz.cefrLevel ?? quiz.levels?.[0] ?? quiz.title, quiz.practiceLevel) ?? cefr.label}
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              {listeningFormatIcon(formatTag) === "dialogue" && <Users size={13} strokeWidth={2} aria-hidden="true" />}
              {listeningFormatIcon(formatTag) === "talk" && <Megaphone size={13} strokeWidth={2} aria-hidden="true" />}
              {formatTag}
            </span>
            {accentText && (
              <>
                <span>·</span>
                <span>{accentText}</span>
              </>
            )}
            <span>·</span>
            <span>~{durationMinutes} phút</span>
          </div>

          {/* Action CTA */}
          <div className="shrink-0 ml-auto">
            {status === "COMPLETED" ? (
              <button
                type="button"
                onClick={() => onStart?.(quiz)}
                disabled={isLaunching}
                className={COMPLETED_RETRY_CLASS}
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Luyện lại</span>
              </button>
            ) : status === "IN_PROGRESS" ? (
              <button
                type="button"
                onClick={() => onStart?.(quiz)}
                disabled={isLaunching}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 px-3.5 py-1.5 text-sm font-semibold text-white shadow-xs transition-colors cursor-pointer disabled:opacity-60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                <span>Tiếp tục</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            ) : status === "NOT_STARTED" ? (
              <button
                type="button"
                onClick={() => onStart?.(quiz)}
                disabled={isLaunching}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-100 hover:bg-teal-600 dark:bg-slate-800 dark:hover:bg-teal-600 px-3.5 py-1.5 text-sm font-semibold text-slate-700 hover:text-white dark:text-slate-200 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                <span>Bắt đầu</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            ) : levelLocked ? (
              <LevelLockButton onClick={handleCardClick} ariaLabel={`Chưa mở mức của bài nghe ${quiz.title}`} />
            ) : isLocked ? (
              <button
                type="button"
                onClick={handleCardClick}
                aria-label={`Mở khóa bài nghe ${quiz.title}`}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 px-3.5 py-1.5 text-sm font-semibold text-amber-900 dark:text-amber-200 transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Mở khóa với Plus</span>
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

export default ListeningExerciseCard;
