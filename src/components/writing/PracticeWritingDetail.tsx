"use client";

import { Check, X } from "lucide-react";

import type { PracticeWritingDetail as Detail } from "@/lib/api/services/writing.service";

/**
 * Per-criterion result of a Writing practice task (PRACTICE_WRITING_V1):
 * the task's own rubric, corrections that quote the learner's text, and the
 * deterministic word-count and keyword checks.
 */
export function PracticeWritingDetail({ detail }: { detail: Detail }) {
  const [minWords, maxWords] = detail.wordRange ?? [null, null];
  const inRange =
    detail.wordCount != null &&
    (minWords == null || detail.wordCount >= minWords) &&
    (maxWords == null || detail.wordCount <= maxWords);

  return (
    <div className="space-y-5">
      <section aria-labelledby="writing-criteria">
        <h4 id="writing-criteria" className="text-sm font-bold text-slate-900 dark:text-slate-100">
          Điểm theo tiêu chí
        </h4>
        <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {detail.criteria.map((c) => (
            <li key={c.key} className="flex flex-col gap-1 p-3 sm:flex-row sm:items-start sm:gap-4">
              <div className="flex min-w-40 items-baseline justify-between gap-3 sm:block">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{c.label}</span>
                <span className="text-sm font-extrabold tabular-nums text-slate-900 dark:text-slate-100 sm:mt-0.5 sm:block">
                  {c.score}/{c.max}
                </span>
              </div>
              <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">{c.comment}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="writing-corrections">
        <h4 id="writing-corrections" className="text-sm font-bold text-slate-900 dark:text-slate-100">
          Lỗi cần sửa trong bài của bạn
        </h4>
        {detail.corrections.length === 0 ? (
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
            Không có lỗi cụ thể nào được chỉ ra trong bài này.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {detail.corrections.map((c, i) => (
              <li key={`${c.original}-${i}`} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <p className="text-sm leading-6">
                  <span className="rounded bg-rose-100 px-1 text-rose-800 line-through decoration-rose-500 dark:bg-rose-950/50 dark:text-rose-300">
                    {c.original}
                  </span>
                  <span className="mx-2 text-slate-400" aria-hidden="true">
                    →
                  </span>
                  <span className="sr-only">sửa thành</span>
                  <span className="rounded bg-emerald-100 px-1 font-semibold text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
                    {c.corrected}
                  </span>
                </p>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{c.explanation}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(detail.wordCount != null || detail.keywords.length > 0) && (
        <section aria-labelledby="writing-checks" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <h4 id="writing-checks" className="sr-only">
            Kiểm tra yêu cầu
          </h4>
          {detail.wordCount != null && (
            <p className={inRange ? "text-slate-700 dark:text-slate-300" : "text-amber-700 dark:text-amber-300"}>
              Số từ: <strong>{detail.wordCount}</strong>
              {detail.wordRange ? ` (yêu cầu ${minWords}–${maxWords})` : ""}
            </p>
          )}
          {detail.keywords.map((k) => (
            <p
              key={k.keyword}
              className={`inline-flex items-center gap-1 ${k.present ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}
            >
              {k.present ? <Check size={14} aria-hidden="true" /> : <X size={14} aria-hidden="true" />}
              <span>
                {k.keyword}
                <span className="sr-only">{k.present ? ": đã dùng" : ": chưa dùng"}</span>
              </span>
            </p>
          ))}
        </section>
      )}
    </div>
  );
}
