"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

/**
 * TOEIC Writing has 8 tasks in three groups. The times are the standard
 * per-group allowances, shown as guidance: BreadTrans does not enforce them.
 */
export const TOEIC_WRITING_GROUPS = [
  { key: "A", title: "Viết câu theo tranh", from: 0, to: 4, minutes: "8 phút cho 5 câu" },
  { key: "B", title: "Trả lời e-mail", from: 5, to: 6, minutes: "10 phút mỗi e-mail" },
  { key: "C", title: "Bài luận nêu ý kiến", from: 7, to: 7, minutes: "30 phút" },
] as const;

export function writingGroupOf(index: number) {
  return TOEIC_WRITING_GROUPS.find((g) => index >= g.from && index <= g.to) ?? null;
}

export function ToeicWritingExamStrip({
  quizIds,
  currentQuizId,
  writtenQuizIds,
  hrefFor,
}: {
  quizIds: number[];
  currentQuizId: number;
  writtenQuizIds: number[];
  hrefFor: (quizId: number) => string;
}) {
  const index = quizIds.indexOf(currentQuizId);
  const group = quizIds.length === 8 ? writingGroupOf(index) : null;
  return (
    <nav aria-label="Các câu phần Viết" className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
        TOEIC Writing · Câu {index + 1}/{quizIds.length} · đã nộp {writtenQuizIds.filter((id) => quizIds.includes(id)).length}/{quizIds.length}
      </p>
      {group && (
        <p className="mt-1 text-base font-black text-slate-900 dark:text-white">
          Nhóm {group.key} — {group.title} (Câu {group.from + 1}
          {group.to > group.from ? `–${group.to + 1}` : ""}) · thời gian khuyến nghị {group.minutes}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {quizIds.map((quizId, i) => {
          const done = writtenQuizIds.includes(quizId);
          const active = quizId === currentQuizId;
          const startsGroup = quizIds.length === 8 && TOEIC_WRITING_GROUPS.some((g) => g.from === i);
          return (
            <span key={quizId} className="inline-flex items-center gap-1.5">
              {startsGroup && i > 0 && <span className="mx-1 h-6 w-px bg-slate-200 dark:bg-slate-700" aria-hidden="true" />}
              <Link
                href={hrefFor(quizId)}
                aria-current={active ? "step" : undefined}
                className={`inline-flex min-h-9 items-center gap-1 rounded-lg border px-2.5 text-sm font-bold transition-colors ${active ? "border-blue-600 bg-blue-600 text-white" : done ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300" : "border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"}`}
              >
                {done && !active && <CheckCircle2 size={13} aria-hidden="true" />}
                Câu {i + 1}
              </Link>
            </span>
          );
        })}
      </div>
    </nav>
  );
}
