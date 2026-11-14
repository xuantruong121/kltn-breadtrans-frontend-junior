"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import type { ReviewRow, RowStatus } from "./submissionReviewLogic";
import { readingSubskillLabel } from "@/components/reading/readingTrackingLogic";

const STRIP: Record<RowStatus, { word: string; className: string }> = {
  right: {
    word: "đúng",
    className: "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
  wrong: {
    word: "sai",
    className: "border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
  },
  blank: {
    word: "bỏ trống",
    className: "border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400",
  },
};

type Breakdown = { category: string; correct: number; total: number; accuracyPercent: number };

/**
 * The score, one square per question and the next steps, kept beside the
 * questions while the learner scrolls (owner chose a sticky right rail).
 */
export function ReviewSummaryRail({
  rows,
  correct,
  total,
  accuracyPercent,
  breakdown,
  wrongReviewHref,
  reviewLabel,
  mistakesHref,
  retryHref,
  otherHref,
  otherLabel,
  savedNote,
  onJump,
}: {
  rows: ReviewRow[];
  correct: number;
  total: number;
  accuracyPercent: number;
  breakdown: Breakdown[];
  wrongReviewHref: string | null;
  reviewLabel: string;
  mistakesHref: string | null;
  retryHref: string;
  otherHref: string;
  otherLabel: string;
  savedNote: string | null;
  onJump: (number: number) => void;
}) {
  return (
    <aside
      aria-label="Tóm tắt kết quả"
      className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6 lg:sticky lg:top-24"
    >
      <h2 className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">Kết quả</h2>
      <p className="mt-1 leading-none text-slate-900 dark:text-slate-100">
        <span className="text-[32px] font-bold tabular-nums">{correct}</span>
        <span className="text-xl font-semibold tabular-nums text-slate-500 dark:text-slate-400">/{total}</span>
        <span className="ml-2 text-base font-medium text-slate-600 dark:text-slate-400">câu đúng</span>
      </p>
      <p className="mt-2 text-[15px] text-slate-600 dark:text-slate-400">
        Chính xác <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">{accuracyPercent}%</span>
      </p>

      {rows.length > 0 && (
        <div className="mt-5">
          <p className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">Từng câu</p>
          <ol className="mt-2 grid max-h-52 grid-cols-8 gap-1.5 overflow-y-auto">
            {rows.map((row) => (
              <li key={row.questionId}>
                <button
                  type="button"
                  onClick={() => onJump(row.number)}
                  aria-label={`Câu ${row.number}, ${STRIP[row.status].word}`}
                  className={`flex h-8 w-full items-center justify-center rounded-md border text-xs font-bold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-1 ${STRIP[row.status].className}`}
                >
                  {row.number}
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}

      {breakdown.length > 0 && (
        <div className="mt-5">
          <p className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">Kỹ năng con</p>
          <ul className="mt-1 divide-y divide-slate-100 dark:divide-slate-800">
            {breakdown.map((item) => (
              <li key={item.category} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-slate-700 dark:text-slate-300">{readingSubskillLabel(item.category)}</span>
                <span className="tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                  {item.correct}/{item.total}
                  <span className="ml-1.5 font-normal text-slate-500 dark:text-slate-400">{item.accuracyPercent}%</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2">
        {wrongReviewHref && (
          <Link
            href={wrongReviewHref}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-amber-500 px-4 text-sm font-bold text-white transition-colors hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
          >
            {reviewLabel}
          </Link>
        )}
        {mistakesHref && (
          <Link
            href={mistakesHref}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Xem trong Sổ lỗi
          </Link>
        )}
        <Link
          href={retryHref}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <RefreshCw size={16} aria-hidden="true" /> Làm lại bài này
        </Link>
        <Link
          href={otherHref}
          className="inline-flex min-h-10 items-center justify-center px-4 text-sm font-semibold text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-slate-100"
        >
          {otherLabel}
        </Link>
      </div>

      {savedNote && <p className="mt-4 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">{savedNote}</p>}
    </aside>
  );
}
