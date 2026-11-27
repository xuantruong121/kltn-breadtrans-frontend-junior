"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { vocabService } from "@/lib/api/services/vocab.service";
import { completionXpNote } from "../utils/sessionXp";
import {
  dueDoneBody,
  dueDoneHeading,
  dueLeftLine,
  dueReviewHref,
  nextDeckLabel,
  nextDueDeck,
} from "../utils/dueReview";

interface DueReviewDoneProps {
  topicId: number;
  topicTitle: string;
  /** Due words reviewed in this session; 0 when the deck had none due. */
  done: number;
  /** Due words that left the session still to relearn. */
  left?: number;
  sessionXp: number;
}

/**
 * The end of a due-word review (owner 2026-11-27), also shown when the deck
 * has nothing due: what was done, then the next deck that has due words.
 */
export const DueReviewDone: React.FC<DueReviewDoneProps> = ({ topicId, topicTitle, done, left = 0, sessionXp }) => {
  // Refetched after each review (the engine invalidates it), so the counts are current.
  const { data, isLoading } = useQuery({
    queryKey: ["vocab-topics"],
    queryFn: () => vocabService.getTopics(),
  });
  const next = nextDueDeck(data?.topics ?? [], topicId);
  const leftLine = dueLeftLine(left);

  return (
    <div className="glass-panel w-full max-w-xl mx-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 sm:p-10 shadow-sm">
      <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
        {dueDoneHeading(done, left)}
      </h2>
      <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400">{dueDoneBody(done, topicTitle, left)}</p>
      {leftLine && <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">{leftLine}</p>}
      {done > 0 && (
        <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">{completionXpNote(sessionXp)}.</p>
      )}

      <div className="mt-6" aria-live="polite">
        {next ? (
          <Link
            href={dueReviewHref(next.id)}
            className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-sky-500 px-6 py-3 text-sm font-extrabold text-white hover:bg-sky-600 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
          >
            <span>{nextDeckLabel(next)}</span>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        ) : (
          !isLoading && (
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Hôm nay không còn từ nào đến hạn ở các bộ khác.
            </p>
          )
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold">
        <Link href={`/flashcard/${topicId}`} className="text-sky-700 underline-offset-4 hover:underline dark:text-sky-300">
          Học cả bộ này
        </Link>
        <Link href="/flashcard" className="text-sky-700 underline-offset-4 hover:underline dark:text-sky-300">
          Về danh mục từ
        </Link>
      </div>
    </div>
  );
};
