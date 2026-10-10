"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, CircleX, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toeicService } from "@/lib/api/services/toeic.service";

export default function ToeicReviewPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId: raw } = use(params);
  const attemptId = Number(raw);
  const router = useRouter();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["toeic-review", attemptId],
    queryFn: () => toeicService.getReview(attemptId),
    enabled: Number.isInteger(attemptId),
  });
  if (isLoading)
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-amber-600" />
      </div>
    );
  if (isError || !data)
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center text-rose-700">
        Không tải được review. Chỉ lượt thi đã nộp mới có thể review.
      </main>
    );
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <button
        type="button"
        onClick={() => router.push(`/toeic/results/${attemptId}`)}
        className="mb-5 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300"
      >
        <ArrowLeft size={16} /> Kết quả
      </button>
      <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">
        Review · {data.exam.title}
      </h1>
      <div className="mt-6 space-y-4">
        {data.questions.map((question) => (
          <article
            key={question.questionId}
            className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-bold text-slate-900 dark:text-slate-100">
                Câu {question.questionNumber} · Part {question.part}
              </h2>
              {question.isCorrect ? (
                <CheckCircle2 className="text-emerald-600" size={19} />
              ) : (
                <CircleX className="text-rose-600" size={19} />
              )}
            </div>
            {question.passageText && (
              <p className="mt-3 whitespace-pre-line rounded-xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {question.passageText}
              </p>
            )}
            {question.questionText && (
              <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                {question.questionText}
              </p>
            )}
            <p className="mt-3 text-sm">
              Bạn chọn:{" "}
              <strong>{question.learnerAnswer ?? "Chưa trả lời"}</strong>
            </p>
            <p className="mt-1 text-sm">
              Đáp án đúng:{" "}
              <strong>{question.standardAnswer ?? "Chưa có dữ liệu"}</strong>
            </p>
            {question.explanation && (
              <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
                {question.explanation}
              </p>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}
