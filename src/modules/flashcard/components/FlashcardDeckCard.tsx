import React, { useState } from "react";
import Link from "next/link";
import { BookOpen, CheckCircle2, PlayCircle, RotateCcw, Lock } from "lucide-react";
import type { VocabTopic } from "@/lib/api/services/vocab.service";
import { PremiumVocabPaywallModal } from "@/components/subscription/PremiumVocabPaywallModal";
import {
  getDeckStatus,
  getDeckCtaText,
  getDeckBadgeInfo,
  computeDeckProgress,
  FlashcardDeckStatus,
} from "../flashcardLogic";
import { isVocabTopicLocked } from "@/modules/subscription/planLogic";

export interface FlashcardDeckCardProps {
  topic: VocabTopic;
}

export const FlashcardDeckCard: React.FC<FlashcardDeckCardProps> = ({ topic }) => {
  const [showPaywall, setShowPaywall] = useState(false);
  const isLocked = isVocabTopicLocked(topic);
  const status: FlashcardDeckStatus = getDeckStatus(topic);
  const badge = getDeckBadgeInfo(status, topic.needReviewCount);
  const ctaText = isLocked ? "Mở khóa với Plus" : getDeckCtaText(status);
  const progress = computeDeckProgress(topic.learnedCount, topic.totalWords);

  return (
    <article
      data-testid="flashcard-deck-card"
      data-status={status}
      className={`group relative flex flex-col justify-between rounded-2xl border bg-white dark:bg-slate-900 p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-blue-300/80 dark:hover:border-blue-800/80 ${
        status === "REVIEW_DUE"
          ? "border-amber-300/80 dark:border-amber-800/80 bg-gradient-to-b from-amber-50/20 to-transparent"
          : status === "COMPLETED"
            ? "border-emerald-200/80 dark:border-emerald-900/60 hover:border-emerald-400"
            : "border-slate-200/80 dark:border-slate-800"
      }`}
    >
      {/* ── Top Row: Category Badge & Status Pill ───────────────────── */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900/50">
            <BookOpen size={13} className="text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />
            <span className="truncate max-w-[140px] sm:max-w-[170px]">{topic.categoryName || "Từ vựng"}</span>
          </span>
          {isLocked ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-300/80 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              <Lock size={12} aria-hidden="true" />
              <span>Premium</span>
            </span>
          ) : (
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                badge.variant === "due"
                  ? "border-amber-200/80 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
                  : badge.variant === "completed"
                    ? "border-emerald-200/80 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : badge.variant === "progress"
                      ? "border-sky-200/80 bg-sky-50 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300"
                      : "border-slate-200/80 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {status === "COMPLETED" && (
                <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400 stroke-[2.5]" aria-hidden="true" />
              )}
              {badge.text}
            </span>
          )}
        </div>

        {/* ── Deck Title ──────────────────────────────────────────────── */}
        <h2 className="mt-3 line-clamp-2 min-h-[2.75rem] text-[17px] font-bold leading-snug text-slate-900 transition-colors group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400 tracking-tight">
          {topic.level && (
            <span className="mr-1.5 inline-block rounded-md bg-slate-100 px-1.5 py-0.5 align-middle text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {topic.level}
            </span>
          )}
          {topic.title}
        </h2>
        {topic.description && (
          <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
            {topic.description}
          </p>
        )}

        {/* ── Deck Metadata ────────────────────────────────────────────── */}
        <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="font-medium text-slate-600 dark:text-slate-400">
            Số lượng: <strong className="font-semibold text-slate-900 dark:text-slate-100">{topic.totalWords}</strong> từ
          </span>
          {topic.needReviewCount > 0 ? (
            <span className="inline-flex items-center gap-1 font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 px-2 py-0.5 rounded-md text-[11px] border border-amber-200/70">
              {topic.needReviewCount} từ cần ôn
            </span>
          ) : (
            <span className="text-[11px] text-slate-400">Sẵn sàng ôn luyện</span>
          )}
        </div>
      </div>

      {/* ── Bottom Section: Progress & CTA ──────────────────────────── */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-medium text-slate-500 dark:text-slate-400">
            Tiến độ đã thuộc
          </span>
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {progress.progressText} <span className="font-normal text-slate-400">({progress.percentage}%)</span>
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
            className={`h-full rounded-full transition-all duration-500 ${
              status === "COMPLETED"
                ? "bg-emerald-500"
                : progress.percentage > 0
                ? "bg-gradient-to-r from-blue-500 to-indigo-600"
                : "bg-slate-200 dark:bg-slate-700"
            }`}
            style={{ width: `${Math.max(progress.displayPercent, progress.percentage > 0 ? 5 : 0)}%` }}
          />
        </div>

        {/* Action CTA — Vibrant, Energetic, NO BLACK, NO ORANGE */}
        {isLocked ? (
          <button
            type="button"
            onClick={() => setShowPaywall(true)}
            className="mt-4 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:bg-slate-800 px-4 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Lock size={14} aria-hidden="true" />
            <span>Mở khóa với Plus</span>
          </button>
        ) : (
          <Link
            href={`/flashcard/${topic.id}`}
            className="mt-4 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl"
          >
            <span
              className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-all active:scale-[0.98] ${
                status === "COMPLETED"
                  ? "border border-slate-200 bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 shadow-2xs"
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/25 hover:shadow-md hover:shadow-blue-500/35"
              }`}
            >
              {status === "COMPLETED" || status === "REVIEW_DUE" ? (
                <RotateCcw size={16} aria-hidden="true" />
              ) : (
                <PlayCircle size={16} aria-hidden="true" />
              )}
              <span>{ctaText}</span>
            </span>
          </Link>
        )}
      </div>

      <PremiumVocabPaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        topicTitle={topic.title}
      />
    </article>
  );
};
