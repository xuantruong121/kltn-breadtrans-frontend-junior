"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, RefreshCw } from "lucide-react";
import type { SubmissionAnalytics } from "@/lib/api/services/quiz.service";
import { practiceDetailOf } from "@/lib/api/services/writing.service";
import { PracticeWritingDetail } from "@/components/writing/PracticeWritingDetail";
import { WritingRevisionPanel } from "@/components/writing/WritingRevisionPanel";
import { resultTitle } from "./submissionReviewLogic";

/**
 * The result of a Writing task, in the same frame as the listening and
 * reading results (owner 2026-11-12): the answer and its grading on the left,
 * the score and the next step in a sticky rail on the right.
 */
export function WritingResultView({
  analytics,
  submissionId,
}: {
  analytics: SubmissionAnalytics;
  submissionId: number;
}) {
  const feedback = analytics.writingFeedback;
  const exercise = analytics.writingExercise;
  const revision = analytics.writingRevision;
  const detail = practiceDetailOf(feedback?.practice);
  const answer = typeof analytics.submittedAnswer === "string" ? analytics.submittedAnswer : null;
  const taskHref = (questionId: number) => `/writing/${analytics.quizId}?q=${questionId}`;
  const retryHref = exercise ? taskHref(exercise.questionId) : `/writing/${analytics.quizId}`;
  const nextHref =
    exercise && !exercise.complete && exercise.nextQuestionId ? taskHref(exercise.nextQuestionId) : null;
  const score = feedback?.score ?? analytics.overallScore;

  const subline = [
    "Luyện viết",
    exercise && exercise.total > 1 ? `Câu ${exercise.position}/${exercise.total}` : null,
    revision && revision.number > 0 ? `Bản sửa ${revision.number}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div data-result-page className="w-full pb-20">
      <div className="mb-6">
        <Link
          href="/writing"
          className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Danh sách bài viết
        </Link>
        <h1 className="mt-1 text-2xl font-bold leading-tight text-slate-900 dark:text-slate-100">
          {resultTitle(analytics)}
        </h1>
        <p className="mt-1 text-[15px] text-slate-600 dark:text-slate-400">{subline}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="order-2 flex min-w-0 flex-col gap-6 lg:order-1">
          <section
            aria-labelledby="writing-answer"
            className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6"
          >
            {exercise?.prompt && (
              <div className="mb-5">
                <h2 className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">Đề bài</h2>
                <p className="mt-1 max-w-[80ch] text-base leading-relaxed text-slate-900 dark:text-slate-100">
                  {exercise.prompt}
                </p>
              </div>
            )}
            <h2 id="writing-answer" className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">
              Bài bạn đã nộp
            </h2>
            <p className="mt-1 max-w-[80ch] whitespace-pre-wrap text-base leading-relaxed text-slate-900 dark:text-slate-100">
              {answer ?? "Bài nộp này không có nội dung để hiển thị."}
            </p>
          </section>

          {detail && (
            <section
              aria-label="Kết quả chấm theo tiêu chí"
              className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6"
            >
              <PracticeWritingDetail detail={detail} />
            </section>
          )}

          {revision && answer !== null && (
            <WritingRevisionPanel
              key={submissionId}
              submissionId={submissionId}
              revision={revision}
              answer={answer}
              wordRange={detail?.wordRange ?? null}
            />
          )}

          {feedback ? (
            <section
              aria-label="Nhận xét và gợi ý"
              className="grid gap-6 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6 xl:grid-cols-2"
            >
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Nhận xét</h2>
                <p className="mt-2 max-w-[72ch] whitespace-pre-wrap text-base leading-relaxed text-slate-800 dark:text-slate-200">
                  {feedback.feedback}
                </p>
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Gợi ý cải thiện</h2>
                {feedback.suggestions.length === 0 ? (
                  <p className="mt-2 text-base text-slate-600 dark:text-slate-400">Không có gợi ý thêm cho bài này.</p>
                ) : (
                  <ul className="mt-2 max-w-[72ch] list-disc space-y-2 pl-5 text-base leading-relaxed text-slate-800 marker:text-slate-400 dark:text-slate-200">
                    {feedback.suggestions.map((suggestion) => (
                      <li key={suggestion}>{suggestion}</li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          ) : (
            <p className="rounded-xl border border-slate-200 bg-white p-5 text-base text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              Nhận xét của bài viết này chưa có.
            </p>
          )}
        </div>

        <aside
          aria-label="Tóm tắt kết quả"
          className="order-1 self-start rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6 lg:sticky lg:top-24 lg:order-2"
        >
          <h2 className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">Điểm</h2>
          <p className="mt-1 leading-none text-slate-900 dark:text-slate-100">
            <span className="text-[32px] font-bold tabular-nums">{score ?? "—"}</span>
            {feedback && (
              <span className="text-xl font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                /{feedback.maxScore}
              </span>
            )}
          </p>
          {detail?.wordCount != null && (
            <p className="mt-2 text-[15px] text-slate-600 dark:text-slate-400">
              <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">{detail.wordCount}</span> từ
              {detail.wordRange ? ` · yêu cầu ${detail.wordRange[0]}–${detail.wordRange[1]}` : ""}
            </p>
          )}

          {exercise && exercise.total > 1 && (
            <p className="mt-4 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
              {exercise.complete && exercise.percent !== null
                ? `Đã xong cả ${exercise.total} câu, điểm bài ${exercise.percent}%.`
                : `Đã chấm ${exercise.answered}/${exercise.total} câu. Bài hoàn thành khi xong cả ${exercise.total} câu.`}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-2">
            {nextHref && (
              <Link
                href={nextHref}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 text-sm font-bold text-white transition-colors hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
              >
                Làm câu tiếp theo <ArrowRight size={16} aria-hidden="true" />
              </Link>
            )}
            <Link
              href={retryHref}
              className={
                nextHref
                  ? "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  : "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 text-sm font-bold text-white transition-colors hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
              }
            >
              <RefreshCw size={16} aria-hidden="true" /> Viết bài mới
            </Link>
            <Link
              href="/writing"
              className="inline-flex min-h-10 items-center justify-center px-4 text-sm font-semibold text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-slate-100"
            >
              Chọn bài viết khác
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
