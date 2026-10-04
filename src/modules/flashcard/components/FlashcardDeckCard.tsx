import React from "react";
import Link from "next/link";
import { BookOpen, CheckCircle2, PlayCircle, RotateCcw } from "lucide-react";
import type { VocabTopic } from "@/lib/api/services/vocab.service";
import {
  getDeckStatus,
  getDeckCtaText,
  getDeckBadgeInfo,
  computeDeckProgress,
  FlashcardDeckStatus,
} from "../flashcardLogic";

export interface FlashcardDeckCardProps {
  topic: VocabTopic;
}

export const FlashcardDeckCard: React.FC<FlashcardDeckCardProps> = ({ topic }) => {
  const status: FlashcardDeckStatus = getDeckStatus(topic);
  const badge = getDeckBadgeInfo(status, topic.needReviewCount);
  const ctaText = getDeckCtaText(status);
  const progress = computeDeckProgress(topic.learnedCount, topic.totalWords);

  return (
    <article
      data-testid="flashcard-deck-card"
      data-status={status}
      className={`group relative flex flex-col justify-between rounded-2xl border bg-white dark:bg-slate-900 p-5 shadow-xs transition-all hover:shadow-sm ${
        status === "REVIEW_DUE"
          ? "border-amber-300 dark:border-amber-800/80 hover:border-amber-400"
          : status === "COMPLETED"
            ? "border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800"
            : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
      }`}
    >
      {/* ── Top Row: Category Label & Status Pill ───────────────────── */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            {topic.categoryName || "Từ vựng"}
          </span>
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${
              badge.variant === "due"
                ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
                : badge.variant === "completed"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : badge.variant === "progress"
                    ? "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300"
                    : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {status === "COMPLETED" && (
              <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            )}
            {badge.text}
          </span>
        </div>

        {/* ── Deck Title ──────────────────────────────────────────────── */}
        <h2 className="mt-2.5 line-clamp-2 min-h-[3rem] text-base sm:text-lg font-bold leading-snug text-slate-900 transition-colors group-hover:text-amber-600 dark:text-slate-100 dark:group-hover:text-amber-400">
          {topic.title}
        </h2>

        {/* ── Deck Metadata ────────────────────────────────────────────── */}
        <div className="mt-2 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <BookOpen size={14} className="shrink-0 text-slate-400 dark:text-slate-500" aria-hidden="true" />
          <span>{topic.totalWords} từ</span>
          {topic.needReviewCount > 0 && (
            <>
              <span aria-hidden="true">•</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {topic.needReviewCount} từ cần ôn
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── Bottom Section: Progress & CTA ──────────────────────────── */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-medium text-slate-500 dark:text-slate-400">
            Tiến độ đã thuộc
          </span>
          <span className="font-bold text-slate-700 dark:text-slate-300">
            {progress.progressText}
          </span>
        </div>

        {/* Linear progress bar */}
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
          role="progressbar"
          aria-valuenow={progress.percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Tiến độ ${topic.title}: ${progress.percentage}%`}
        >
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              status === "COMPLETED" ? "bg-emerald-500" : "bg-amber-500"
            }`}
            style={{ width: `${progress.displayPercent}%` }}
          />
        </div>

        {/* Action CTA */}
        <Link
          href={`/practice/vocab/${topic.id}`}
          className="mt-4 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-xl"
        >
          <span
            className={`flex min-h-10 sm:min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors ${
              status === "COMPLETED"
                ? "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700"
                : status === "REVIEW_DUE"
                  ? "bg-amber-500 text-white shadow-xs hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-600"
                  : "bg-amber-500 text-white shadow-xs hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-600"
            }`}
          >
            {status === "COMPLETED" || status === "REVIEW_DUE" ? (
              <RotateCcw size={16} aria-hidden="true" />
            ) : (
              <PlayCircle size={16} aria-hidden="true" />
            )}
            {ctaText}
          </span>
        </Link>
      </div>
    </article>
  );
};
