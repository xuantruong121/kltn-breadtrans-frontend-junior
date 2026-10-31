"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toeicService } from "@/lib/api/services/toeic.service";
import { PART_TITLES } from "@/lib/toeic/examPaper";
import { REVIEW_FILTERS, filterReview, groupByPart, type ReviewFilter } from "@/lib/toeic/resultReview";
import { StatusBadge, ToeicAnswerBody } from "@/components/toeic/result/ToeicAnswerDetail";
import { useReviewAudio } from "@/components/toeic/result/ToeicLrResult";

/** Full read-only review: every question of the attempt with its context. */
export default function ToeicReviewPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId: raw } = use(params);
  const attemptId = Number(raw);
  const [filter, setFilter] = useState<ReviewFilter>("ALL");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["toeic-review", attemptId],
    queryFn: () => toeicService.getReview(attemptId),
    enabled: Number.isInteger(attemptId),
  });
  const { audioFor, note } = useReviewAudio(attemptId, Boolean(data?.questions.some((q) => q.part <= 4)));
  const parts = useMemo(() => groupByPart(filterReview(data?.questions ?? [], filter)), [data, filter]);
  if (isLoading)
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" aria-label="Đang tải" />
      </div>
    );
  if (isError || !data)
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center text-slate-700 dark:text-slate-300">
        Không tải được đáp án. Chỉ lượt thi đã nộp mới xem được đáp án.
      </main>
    );
  // A group (passage, picture, audio) is shown once, before its first question.
  const seenGroups = new Set<number>();
  return (
    <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6">
      <Link href={`/toeic/results/${attemptId}`} className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-300">
        <ArrowLeft size={16} aria-hidden="true" /> Kết quả
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">Chi tiết đáp án: {data.exam.title}</h1>
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Lọc câu hỏi">
        {REVIEW_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`inline-flex min-h-10 items-center rounded-full border px-3.5 text-sm font-semibold transition-colors ${filter === f.id ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {parts.length === 0 && <p className="mt-6 text-slate-600 dark:text-slate-400">Không có câu nào trong mục này.</p>}
      {parts.map((p) => (
        <section key={p.part} className="mt-8">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Part {p.part} <span className="text-base font-semibold text-slate-600 dark:text-slate-400">· {PART_TITLES[p.part]}</span>
          </h2>
          <div className="mt-3 grid items-start gap-4 xl:grid-cols-2">
            {p.questions.map((q) => {
              const firstOfGroup = !seenGroups.has(q.groupId);
              seenGroups.add(q.groupId);
              // Later questions of a shared group omit the repeated media.
              const view = firstOfGroup ? q : { ...q, imageUrl: null, passageText: null, transcript: null };
              return (
                <article key={q.questionId} id={`q-${q.questionNumber}`} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100">Câu {q.questionNumber}</h3>
                    <StatusBadge status={q.status} />
                  </div>
                  <ToeicAnswerBody question={view} audio={firstOfGroup ? audioFor(q) : null} audioNote={firstOfGroup ? note : null} />
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}
