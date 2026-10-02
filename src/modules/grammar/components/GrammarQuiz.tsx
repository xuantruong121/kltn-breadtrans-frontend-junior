"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  RefreshCw,
  MessageSquare,
} from "lucide-react";
import toast from "react-hot-toast";
import { grammarService } from "@/lib/api/services/grammar.service";
import { useAuthStore } from "@/stores/authStore";
import { GrammarAttemptResult, GrammarTopicDetail } from "../types";
import { GrammarVideoPlayer } from "./GrammarVideoPlayer";

// ─── Types ───────────────────────────────────────────────────────────────────
type QuestionResult = GrammarAttemptResult["questionsResult"][number];

interface GrammarQuizProps {
  topic: GrammarTopicDetail;
}

// ─── Sub-components (internal) ───────────────────────────────────────────────
const EmptyFeedback: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-8 text-center">
    <MessageSquare
      size={28}
      className="mb-2.5 text-slate-300 dark:text-slate-600"
      aria-hidden="true"
    />
    <p className="text-xs font-medium leading-relaxed text-slate-400 dark:text-slate-500 max-w-[16rem]">
      Chọn đáp án và nộp bài để xem giải thích chi tiết.
    </p>
  </div>
);

const FeedbackPanel: React.FC<{ qr: QuestionResult }> = ({ qr }) => (
  <div className="space-y-3.5" role="status" aria-live="polite">
    {/* Correct / Incorrect banner */}
    <div
      className={`flex items-center gap-2 rounded-xl border p-3.5 ${
        qr.isCorrect
          ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40"
          : "border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40"
      }`}
    >
      {qr.isCorrect ? (
        <CheckCircle2
          size={18}
          className="shrink-0 text-emerald-600 dark:text-emerald-400"
          aria-hidden="true"
        />
      ) : (
        <XCircle
          size={18}
          className="shrink-0 text-rose-600 dark:text-rose-400"
          aria-hidden="true"
        />
      )}
      <p
        className={`text-sm font-bold ${
          qr.isCorrect
            ? "text-emerald-800 dark:text-emerald-300"
            : "text-rose-800 dark:text-rose-300"
        }`}
      >
        {qr.isCorrect ? "Chính xác!" : "Chưa chính xác"}
      </p>
    </div>

    {/* Wrong selection: show the correct answer */}
    {!qr.isCorrect && (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-700 dark:bg-slate-800">
        <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Đáp án đúng
        </p>
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
          Đáp án {String.fromCharCode(65 + qr.correctOption)}
        </p>
      </div>
    )}

    {/* Explanation (only when present in real data) */}
    {qr.explanation && (
      <div className="rounded-xl border border-sky-200 bg-sky-50 p-3.5 dark:border-sky-900/60 dark:bg-sky-950/40">
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400">
          Giải thích
        </p>
        <p className="text-xs font-medium leading-relaxed text-sky-800 dark:text-sky-300">
          {qr.explanation}
        </p>
      </div>
    )}
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
export const GrammarQuiz: React.FC<GrammarQuizProps> = ({ topic }) => {
  const { id: topicId, questions } = topic;
  const queryClient = useQueryClient();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<GrammarAttemptResult | null>(null);

  const submitAttempt = useMutation({
    mutationFn: () => grammarService.submitAttempt(topicId, answers),
    onSuccess: (data) => {
      setResult(data);
      const currentUserId = useAuthStore.getState().user?.id;
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["grammar-topics"] }),
        queryClient.invalidateQueries({ queryKey: ["user-stats", currentUserId] }),
        queryClient.invalidateQueries({ queryKey: ["daily-quests"] }),
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
      ]);
      toast.success(
        data.rewardBanh || data.rewardXP
          ? `Kết quả: ${data.correctCount}/${data.totalQuestions}. Bạn nhận ${data.rewardBanh} Bánh Mì và ${data.rewardXP} EXP.`
          : `Kết quả: ${data.correctCount}/${data.totalQuestions}. Hãy luyện lại để cải thiện nhé.`,
      );
    },
    onError: () => toast.error("Không thể nộp bài lúc này. Vui lòng thử lại."),
  });

  const reset = () => {
    setAnswers({});
    setResult(null);
    setCurrentIndex(0);
  };

  if (!questions.length) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Chủ đề này chưa có câu hỏi. Hãy quay lại sau khi nội dung được bổ sung.
        </p>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const isAllAnswered = answeredCount === questions.length;
  const isLastQuestion = currentIndex === questions.length - 1;
  const currentResult = result?.questionsResult.find(
    (r) => r.questionId === currentQuestion.id,
  );
  const currentAnswerIndex = answers[String(currentQuestion.id)];
  const hasCurrentAnswer = currentAnswerIndex !== undefined;

  const selectAnswer = (optIndex: number) => {
    if (result) return; // locked in review mode
    setAnswers((prev) => ({ ...prev, [String(currentQuestion.id)]: optIndex }));
  };

  const optionStyle = (optIndex: number): string => {
    const isSelected = currentAnswerIndex === optIndex;
    if (currentResult) {
      if (currentResult.correctOption === optIndex)
        return "border-emerald-500 bg-emerald-100 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200";
      if (isSelected && !currentResult.isCorrect)
        return "border-rose-500 bg-rose-100 text-rose-800 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200";
      return "border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-500";
    }
    if (isSelected)
      return "border-sky-400 bg-sky-100 text-sky-800 dark:border-sky-700 dark:bg-sky-950/50 dark:text-sky-200";
    return "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-800/70";
  };

  const dotStyle = (qIndex: number): string => {
    const q = questions[qIndex];
    const qResult = result?.questionsResult.find((r) => r.questionId === q.id);
    const isAnswered = answers[String(q.id)] !== undefined;
    if (qResult?.isCorrect) return "bg-emerald-500 dark:bg-emerald-500";
    if (qResult) return "bg-rose-500 dark:bg-rose-500";
    if (isAnswered) return "bg-sky-500 dark:bg-sky-500";
    return "bg-slate-200 dark:bg-slate-700";
  };

  const navDotButtonStyle = (qIndex: number): string => {
    const q = questions[qIndex];
    const qResult = result?.questionsResult.find((r) => r.questionId === q.id);
    const isAnswered = answers[String(q.id)] !== undefined;
    const isCurrent = qIndex === currentIndex;
    const base =
      "flex items-center gap-2 w-full rounded-lg border px-3 py-2 text-xs font-bold text-left transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500";
    let color =
      "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400";
    if (qResult?.isCorrect)
      color =
        "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300";
    else if (qResult)
      color =
        "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300";
    else if (isAnswered)
      color =
        "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300";
    return `${base} ${color} ${isCurrent ? "ring-2 ring-amber-400 ring-offset-1" : ""}`;
  };

  return (
    <div
      className="flex flex-1 flex-col min-h-0"
      data-testid="grammar-workspace"
    >
      {/* ── 3-pane body ───────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* ── LEFT PANE (desktop only) ─────────────────────────────────── */}
        <aside
          aria-label="Điều hướng câu hỏi"
          className="hidden lg:flex w-56 xl:w-60 shrink-0 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto"
          data-testid="grammar-left-pane"
        >
          <div className="p-5 space-y-5">
            {/* Topic info */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Chủ đề
              </p>
              <h2 className="mt-1 text-sm font-bold leading-snug text-slate-900 dark:text-slate-100">
                {topic.title}
              </h2>
              <span className="mt-2 inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                {topic.level}
              </span>
            </div>

            {/* Progress */}
            <div>
              <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <span>Tiến độ</span>
                <span>
                  {result
                    ? `${result.correctCount}/${result.totalQuestions} đúng`
                    : `${answeredCount}/${questions.length} đã chọn`}
                </span>
              </div>
              <div
                className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700"
                role="progressbar"
                aria-valuenow={result ? result.correctCount : answeredCount}
                aria-valuemax={questions.length}
              >
                <div
                  className={`h-full rounded-full transition-all duration-300 ${result ? "bg-emerald-500" : "bg-sky-500"}`}
                  style={{
                    width: `${(((result ? result.correctCount : answeredCount) / questions.length) * 100).toFixed(0)}%`,
                  }}
                />
              </div>
            </div>

            {/* Question list */}
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Câu hỏi
              </p>
              <nav aria-label="Danh sách câu hỏi">
                <ol className="flex flex-col gap-1.5">
                  {questions.map((q, i) => (
                    <li key={q.id}>
                      <button
                        type="button"
                        onClick={() => setCurrentIndex(i)}
                        aria-current={i === currentIndex ? "step" : undefined}
                        aria-label={`Câu ${i + 1}${answers[String(q.id)] !== undefined ? " (đã chọn)" : ""}`}
                        className={navDotButtonStyle(i)}
                      >
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-current text-[10px] font-black">
                          {i + 1}
                        </span>
                        <span className="truncate">
                          {q.question.length > 28
                            ? q.question.slice(0, 28) + "…"
                            : q.question}
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              </nav>
            </div>
          </div>
        </aside>

        {/* ── CENTER PANE ───────────────────────────────────────────────── */}
        <main
          className="flex-1 min-h-0 overflow-y-auto bg-slate-50 dark:bg-slate-950"
          aria-label="Câu hỏi hiện tại"
        >
          <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">

            {/* Completion banner */}
            {result && (
              <div
                className={`mb-6 flex items-start justify-between gap-3 rounded-2xl border p-4 sm:items-center ${
                  result.correctCount === result.totalQuestions
                    ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40"
                    : "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40"
                }`}
                data-testid="grammar-completion-banner"
              >
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Kết quả: {result.correctCount}/{result.totalQuestions} câu đúng
                    {result.rewardXP > 0 && ` · +${result.rewardXP} EXP`}
                    {result.rewardBanh > 0 && ` · +${result.rewardBanh} Bánh Mì`}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Điều hướng câu để xem giải thích chi tiết.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={reset}
                  className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <RefreshCw size={13} aria-hidden="true" />
                  Làm lại
                </button>
              </div>
            )}

            {/* Counter */}
            <div className="mb-3 flex items-center gap-2">
              <span
                className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500"
                aria-label={`Câu hỏi ${currentIndex + 1} trên ${questions.length}`}
              >
                Câu {currentIndex + 1} / {questions.length}
              </span>
              {!result && (
                <span className="text-xs text-slate-400 dark:text-slate-500 lg:hidden">
                  · {answeredCount}/{questions.length} đã chọn
                </span>
              )}
            </div>

            {/* Question card */}
            <article
              className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-6"
              data-testid="grammar-question-card"
            >
              <p className="mb-5 text-base font-bold leading-relaxed text-slate-900 dark:text-slate-100">
                {currentQuestion.question}
              </p>

              <div
                className="space-y-2.5"
                role="radiogroup"
                aria-label="Đáp án"
              >
                {currentQuestion.options.map((option, optIndex) => {
                  const isSelected = currentAnswerIndex === optIndex;
                  const isCorrect = currentResult?.correctOption === optIndex;
                  const isWrong = isSelected && currentResult && !currentResult.isCorrect;
                  return (
                    <button
                      key={optIndex}
                      type="button"
                      disabled={Boolean(result)}
                      onClick={() => selectAnswer(optIndex)}
                      role="radio"
                      aria-checked={isSelected}
                      className={`flex w-full min-h-11 cursor-pointer items-center justify-between rounded-xl border p-3.5 text-left text-sm font-bold transition-all disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${optionStyle(optIndex)}`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-current text-[10px] font-black"
                          aria-hidden="true"
                        >
                          {String.fromCharCode(65 + optIndex)}
                        </span>
                        <span>{option}</span>
                      </div>
                      {currentResult && isCorrect && (
                        <CheckCircle2 size={17} aria-hidden="true" />
                      )}
                      {isWrong && <XCircle size={17} aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            </article>

            {/* Mobile-only: inline theory / feedback below question */}
            <div className="md:hidden" data-testid="grammar-mobile-support">
              {result && currentResult ? (
                <FeedbackPanel qr={currentResult} />
              ) : (
                <GrammarVideoPlayer topic={topic} />
              )}
            </div>
          </div>
        </main>

        {/* ── RIGHT PANE (tablet and desktop) ──────────────────────────── */}
        <aside
          aria-label={result ? "Giải thích đáp án" : "Lý thuyết ngữ pháp"}
          className="hidden md:flex w-64 xl:w-72 shrink-0 flex-col border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto"
          data-testid="grammar-right-pane"
        >
          <div className="p-5">
            {result ? (
              currentResult ? (
                <FeedbackPanel qr={currentResult} />
              ) : (
                <EmptyFeedback />
              )
            ) : hasCurrentAnswer ? (
              <>
                <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 p-3.5 text-xs font-bold text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300">
                  Đã chọn đáp án. Hoàn thành tất cả câu và nhấn{" "}
                  <strong>Nộp bài</strong> để xem giải thích.
                </div>
                <GrammarVideoPlayer topic={topic} />
              </>
            ) : (
              <>
                <EmptyFeedback />
                <div className="mt-4">
                  <GrammarVideoPlayer topic={topic} />
                </div>
              </>
            )}
          </div>
        </aside>
      </div>

      {/* ── BOTTOM NAV ────────────────────────────────────────────────────── */}
      <footer
        className="shrink-0 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 sm:px-6 flex items-center justify-between gap-3"
        aria-label="Điều hướng câu hỏi"
      >
        {/* Prev */}
        <button
          type="button"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((prev) => prev - 1)}
          aria-label="Câu trước"
          className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <ChevronLeft size={17} aria-hidden="true" />
          <span className="hidden sm:inline">Câu trước</span>
        </button>

        {/* Dot indicators */}
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {questions.map((q, i) => (
            <button
              key={q.id}
              type="button"
              onClick={() => setCurrentIndex(i)}
              aria-label={`Câu ${i + 1}`}
              className={`cursor-pointer rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                i === currentIndex ? "h-2.5 w-6" : "size-2.5"
              } ${dotStyle(i)}`}
            />
          ))}
        </div>

        {/* Next / Submit */}
        {!isLastQuestion || result ? (
          <button
            type="button"
            disabled={!result && isLastQuestion}
            onClick={() => setCurrentIndex((prev) => prev + 1)}
            aria-label="Câu tiếp"
            className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:invisible dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <span className="hidden sm:inline">Câu tiếp</span>
            <ChevronRight size={17} aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            disabled={!isAllAnswered || submitAttempt.isPending}
            onClick={() => submitAttempt.mutate()}
            aria-label={
              !isAllAnswered
                ? `Nộp bài (cần trả lời thêm ${questions.length - answeredCount} câu)`
                : "Nộp bài và xem kết quả"
            }
            className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            data-testid="grammar-submit-btn"
          >
            {submitAttempt.isPending ? "Đang chấm…" : "Nộp bài"}
          </button>
        )}
      </footer>
    </div>
  );
};
