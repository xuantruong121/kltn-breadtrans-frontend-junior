"use client";

import { Check, Minus, X } from "lucide-react";
import { questionAnchor, type ReviewRow, type RowStatus } from "./submissionReviewLogic";

const STATUS: Record<RowStatus, { label: string; className: string }> = {
  right: { label: "Đúng", className: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" },
  wrong: { label: "Sai", className: "bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300" },
  blank: { label: "Bỏ trống", className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
};

/**
 * One question of a result: the answer and the key on the left, the
 * explanation on the right from xl, at reading size (owner 2026-11-12: the
 * explanation was 12 px and squeezed under the key).
 */
export function ReviewQuestionCard({ row, evidenceLabel }: { row: ReviewRow; evidenceLabel: string }) {
  const { explanation } = row;
  return (
    <article
      id={questionAnchor(row.number)}
      className="scroll-mt-24 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6"
    >
      <header className="flex items-start gap-3">
        <span className="w-7 shrink-0 pt-px text-base font-bold tabular-nums text-slate-500 dark:text-slate-400">
          {row.number}.
        </span>
        <h3 className="min-w-0 flex-1 break-words text-base font-semibold leading-snug text-slate-900 dark:text-slate-100 sm:text-[17px]">
          {row.prompt}
        </h3>
        {row.skill && (
          <span className="hidden shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300 sm:inline-flex">
            {row.skill}
          </span>
        )}
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS[row.status].className}`}>
          {STATUS[row.status].label}
        </span>
      </header>

      <div className="mt-4 grid gap-5 sm:pl-10 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] xl:gap-8">
        <dl className="space-y-3">
          <div>
            <dt className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">
              {row.isCorrect ? "Bạn chọn đúng" : "Bạn chọn"}
            </dt>
            {row.status === "blank" ? (
              <dd className="mt-1 flex items-start gap-2 text-base text-slate-600 dark:text-slate-400">
                <Minus size={18} strokeWidth={2.25} className="mt-0.5 shrink-0" aria-hidden="true" />
                Bạn chưa trả lời câu này.
              </dd>
            ) : (
            <dd className="mt-1 flex items-start gap-2 text-base">
              {row.isCorrect ? (
                <Check size={18} strokeWidth={2.25} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              ) : (
                <X size={18} strokeWidth={2.25} className="mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden="true" />
              )}
              <span
                className={`min-w-0 break-words font-medium ${
                  row.isCorrect ? "text-emerald-800 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"
                }`}
              >
                {row.answer}
              </span>
            </dd>
            )}
          </div>
          {!row.isCorrect && (
            <div>
              <dt className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">Đáp án đúng</dt>
              <dd className="mt-1 flex items-start gap-2 text-base">
                <Check size={18} strokeWidth={2.25} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <span className="min-w-0 break-words font-semibold text-slate-900 dark:text-slate-100">
                  {row.correctAnswer ?? "Chưa có đáp án chuẩn"}
                </span>
              </dd>
            </div>
          )}
          {row.translation && (
            <p className="break-words text-sm text-slate-600 dark:text-slate-400">Dịch: {row.translation}</p>
          )}
        </dl>

        {/* The text keeps a readable line length on wide screens. */}
        <section aria-label={`Giải thích câu ${row.number}`} className="min-w-0 max-w-[72ch]">
          <h4 className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">Giải thích</h4>
          {!explanation ? (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Câu này chưa có giải thích.</p>
          ) : explanation.type === "legacy" ? (
            <p className="mt-1 whitespace-pre-line break-words text-base leading-relaxed text-slate-800 dark:text-slate-200">
              {explanation.text}
            </p>
          ) : (
            <div className="mt-1 space-y-3">
              <p className="break-words text-base leading-relaxed text-slate-900 dark:text-slate-100">{explanation.vi}</p>
              {explanation.en && (
                <p lang="en" className="break-words text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">
                  {explanation.en}
                </p>
              )}
              {explanation.evidence && (
                <div className="rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
                  <p className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">{evidenceLabel}</p>
                  <blockquote lang="en" className="mt-1 break-words text-[15px] italic leading-relaxed text-slate-800 dark:text-slate-200">
                    &ldquo;{explanation.evidence}&rdquo;
                  </blockquote>
                </div>
              )}
              {(explanation.keyPhrase || explanation.vocabularyNote) && (
                <p className="break-words text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">Cụm từ cần nhớ: </span>
                  {[explanation.keyPhrase, explanation.vocabularyNote].filter(Boolean).join("; ")}
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </article>
  );
}
