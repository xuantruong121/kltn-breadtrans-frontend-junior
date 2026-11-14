"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { quizService } from "@/lib/api/services/quiz.service";
import Confetti from "react-confetti";
import { WritingResultView } from "./WritingResultView";
import { ReviewQuestionCard } from "./ReviewQuestionCard";
import { ReviewSummaryRail } from "./ReviewSummaryRail";
import {
  filterRows,
  questionAnchor,
  resultKind,
  resultLabels,
  resultTitle,
  reviewButtonLabel,
  reviewCounts,
  reviewRows,
  type RowFilter,
} from "./submissionReviewLogic";

export default function SubmissionAnalyticsPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = use(props.params);
  const submissionId = parseInt(params.id);

  const [stoppedConfetti, setStoppedConfetti] = useState(false);
  const [filter, setFilter] = useState<RowFilter>("all");
  const [windowDimension, setWindowDimension] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 800,
    height: typeof window !== "undefined" ? window.innerHeight : 600,
  });

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["submission-analytics", submissionId],
    queryFn: () => quizService.getAnalytics(submissionId),
    enabled: !isNaN(submissionId),
  });

  const isPerfect = analytics?.overallAccuracyPercent === 100;
  const showConfetti = isPerfect && !stoppedConfetti;

  useEffect(() => {
    const handleResize = () => {
      setWindowDimension({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (isPerfect) {
      const timer = setTimeout(() => setStoppedConfetti(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [isPerfect]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-junior-blue" size={48} />
      </div>
    );
  }

  if (!analytics) return <div>Không tìm thấy kết quả.</div>;

  const isWritingResult =
    analytics.quizType === "WRITING_PICTURE" ||
    analytics.quizType === "WRITING_EMAIL";
  if (isWritingResult) {
    return <WritingResultView analytics={analytics} submissionId={submissionId} />;
  }

  const kind = resultKind(analytics);
  const labels = resultLabels(kind);
  const rows = reviewRows(analytics);
  const counts = reviewCounts(rows);
  const visibleRows = filterRows(rows, filter);
  const wrongQuestionIds = rows
    .filter((row) => row.status !== "right" && Number.isInteger(row.questionId) && row.questionId > 0)
    .map((row) => row.questionId);
  const wrongReviewHref =
    kind === "listening" && wrongQuestionIds.length > 0
      ? `/listening/${analytics.quizId}?review=wrong&questionIds=${wrongQuestionIds.join(",")}`
      : null;
  const mistakesHref =
    wrongQuestionIds.length > 0 && kind !== "exam"
      ? `/mistakes?skill=${kind === "listening" ? "listening" : "reading"}`
      : null;
  const catalogHref = kind === "listening" ? "/listening" : kind === "reading" ? "/reading" : "/exams";
  const retryHref = `${catalogHref}/${analytics.quizId}`;

  // A square in the rail jumps to its question, showing every question first if a filter hides it.
  const jumpTo = (number: number) => {
    setFilter("all");
    window.requestAnimationFrame(() =>
      document.getElementById(questionAnchor(number))?.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      }),
    );
  };

  const filters: { id: RowFilter; label: string; count: number }[] = [
    { id: "all", label: "Tất cả", count: counts.all },
    { id: "wrong", label: counts.blank > 0 ? "Chưa đúng" : "Câu sai", count: counts.wrong + counts.blank },
    { id: "right", label: "Câu đúng", count: counts.right },
  ];

  return (
    // Full width, edge to edge with the app header (owner 2026-11-12: no empty side margins).
    <div data-result-page className="relative w-full pb-20">
      {showConfetti && (
        <Confetti width={windowDimension.width} height={windowDimension.height} />
      )}

      {/* Title row: the quiz's Vietnamese title, as in the catalog and the practice room. */}
      <div className="mb-6">
        <Link
          href={catalogHref}
          className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          <ArrowLeft size={16} aria-hidden="true" /> {labels.back}
        </Link>
        <h1 className="mt-1 text-2xl font-bold leading-tight text-slate-900 dark:text-slate-100">
          {resultTitle(analytics)}
        </h1>
        <p className="mt-1 text-[15px] text-slate-600 dark:text-slate-400">
          {labels.skill} · Đúng {analytics.totalCorrect}/{analytics.totalQuestions} câu ({analytics.overallAccuracyPercent}%)
        </p>
      </div>

      {/* Questions on the left, the score and next steps in a sticky rail on the right. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="order-2 min-w-0 lg:order-1">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Đáp án từng câu</h2>
            <div
              role="group"
              aria-label="Lọc câu hỏi"
              className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
            >
              {filters.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={filter === item.id}
                  onClick={() => setFilter(item.id)}
                  className={`min-h-9 rounded-md px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                    filter === item.id
                      ? "bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                  }`}
                >
                  {item.label}
                  <span className="ml-1.5 tabular-nums text-slate-500 dark:text-slate-400">{item.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {visibleRows.length === 0 ? (
              <p className="rounded-xl border border-slate-200 bg-white p-6 text-base text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                {filter === "wrong" ? "Bạn trả lời đúng mọi câu trong lượt này." : "Chưa có câu đúng trong lượt này."}
              </p>
            ) : (
              visibleRows.map((row) => (
                <ReviewQuestionCard key={row.questionId} row={row} evidenceLabel={labels.evidence} />
              ))
            )}
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <ReviewSummaryRail
            rows={rows}
            correct={analytics.totalCorrect}
            total={analytics.totalQuestions}
            accuracyPercent={analytics.overallAccuracyPercent}
            breakdown={kind === "reading" ? analytics.categoriesBreakdown ?? [] : []}
            wrongReviewHref={wrongReviewHref}
            reviewLabel={reviewButtonLabel(counts)}
            mistakesHref={mistakesHref}
            retryHref={retryHref}
            otherHref={catalogHref}
            otherLabel={labels.other}
            savedNote={labels.savedNote}
            onJump={jumpTo}
          />
        </div>
      </div>
    </div>
  );
}
