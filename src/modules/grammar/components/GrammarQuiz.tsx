"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { grammarService } from "@/lib/api/services/grammar.service";
import { useAuthStore } from "@/stores/authStore";
import { GrammarAttemptResult, GrammarTopicDetail } from "../types";
import { GrammarVideoPlayer } from "./GrammarVideoPlayer";
import {
  getNextIndex,
  getPrevIndex,
  isGrammarDirty,
} from "./grammarNavigationUtils";

type QuestionResult = GrammarAttemptResult["questionsResult"][number];

export interface GrammarQuizProps {
  topic: GrammarTopicDetail;
  onDirtyChange?: (isDirty: boolean) => void;
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

const PracticeGuidance: React.FC<{ hasAnswer: boolean }> = ({ hasAnswer }) => (
  <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50/70 p-4 dark:border-sky-900/60 dark:bg-sky-950/40">
    <Info
      size={18}
      className="shrink-0 text-sky-600 dark:text-sky-400 mt-0.5"
      aria-hidden="true"
    />
    <div className="space-y-1">
      <p className="text-xs font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300">
        {hasAnswer ? "Đã ghi nhận lựa chọn" : "Hướng dẫn thực hành"}
      </p>
      <p className="text-xs sm:text-sm font-medium leading-relaxed text-sky-900 dark:text-sky-200">
        {hasAnswer
          ? "Đã lưu đáp án cho câu hỏi này. Hoàn thành tất cả các câu và nhấn Nộp bài để xem kết quả & giải thích chi tiết."
          : "Chọn đáp án đúng ở cột giữa. Sau khi nộp bài, hệ thống sẽ mở khóa giải thích chi tiết cho từng câu."}
      </p>
    </div>
  </div>
);

const FeedbackPanel: React.FC<{ qr: QuestionResult }> = ({ qr }) => (
  <div className="space-y-4" role="status" aria-live="polite">
    {/* Correct / Incorrect banner */}
    <div
      className={`flex items-start gap-3 rounded-2xl border p-4 sm:p-5 ${
        qr.isCorrect
          ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40"
          : "border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40"
      }`}
    >
      {qr.isCorrect ? (
        <CheckCircle2
          size={22}
          className="shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5"
          aria-hidden="true"
        />
      ) : (
        <XCircle
          size={22}
          className="shrink-0 text-rose-600 dark:text-rose-400 mt-0.5"
          aria-hidden="true"
        />
      )}
      <div>
        <p
          className={`text-base font-bold ${
            qr.isCorrect
              ? "text-emerald-900 dark:text-emerald-200"
              : "text-rose-900 dark:text-rose-200"
          }`}
        >
          {qr.isCorrect ? "Chính xác!" : "Chưa chính xác"}
        </p>
        <p
          className={`text-xs mt-0.5 ${
            qr.isCorrect
              ? "text-emerald-700 dark:text-emerald-300"
              : "text-rose-700 dark:text-rose-300"
          }`}
        >
          {qr.isCorrect
            ? "Bạn đã chọn đúng đáp án cho câu hỏi này."
            : "Xem lại đáp án chính xác và lý thuyết bên dưới."}
        </p>
      </div>
    </div>

    {/* Wrong selection: show the correct answer */}
    {!qr.isCorrect && (
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-800/60">
        <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Đáp án đúng
        </p>
        <p className="text-base font-bold text-slate-900 dark:text-slate-100">
          Đáp án {String.fromCharCode(65 + qr.correctOption)}
        </p>
      </div>
    )}

    {/* Explanation (only when present in real data) */}
    {qr.explanation && (
      <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 sm:p-5 dark:border-sky-900/60 dark:bg-sky-950/40">
        <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300">
          Giải thích chi tiết
        </p>
        <p className="text-sm font-medium leading-relaxed text-slate-800 dark:text-slate-200">
          {qr.explanation}
        </p>
      </div>
    )}
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
export const GrammarQuiz: React.FC<GrammarQuizProps> = ({ topic, onDirtyChange }) => {
  const { id: topicId, questions } = topic;
  const queryClient = useQueryClient();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<GrammarAttemptResult | null>(null);

  const answeredCount = Object.keys(answers).length;

  useEffect(() => {
    onDirtyChange?.(isGrammarDirty(answeredCount, Boolean(result)));
  }, [answeredCount, result, onDirtyChange]);

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
  const currentAnswerIndex = answers[String(currentQuestion.id)];
  const isFirstQuestion = currentIndex === 0;
  const isLastQuestion = currentIndex === questions.length - 1;
  const isAllAnswered = answeredCount === questions.length;
  const hasCurrentAnswer = currentAnswerIndex !== undefined;

  const currentResult = result?.questionsResult.find(
    (r) => r.questionId === currentQuestion.id,
  );

  const selectAnswer = (optionIndex: number) => {
    if (result) return;
    setAnswers((prev) => ({
      ...prev,
      [String(currentQuestion.id)]: optionIndex,
    }));
  };

  // Option styling
  const optionStyle = (optIndex: number): string => {
    const isSelected = currentAnswerIndex === optIndex;
    const isCorrect = currentResult?.correctOption === optIndex;
    const isWrong = isSelected && currentResult && !currentResult.isCorrect;

    if (currentResult) {
      if (isCorrect)
        return "border-emerald-500 bg-emerald-50/80 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-200 ring-2 ring-emerald-500/40";
      if (isWrong)
        return "border-rose-500 bg-rose-50/80 text-rose-900 dark:border-rose-500 dark:bg-rose-950/50 dark:text-rose-200 ring-2 ring-rose-500/40";
      return "border-slate-200/70 bg-white/50 text-slate-400 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-600 opacity-60";
    }

    if (isSelected) {
      return "border-amber-500 bg-amber-50/90 text-amber-950 dark:border-amber-500 dark:bg-amber-950/50 dark:text-amber-100 ring-2 ring-amber-500/50 shadow-xs";
    }

    return "border-slate-200 bg-white text-slate-800 hover:border-amber-400 hover:bg-amber-50/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-amber-500/60 dark:hover:bg-amber-950/20";
  };

  const dotStyle = (qIndex: number): string => {
    const q = questions[qIndex];
    const qResult = result?.questionsResult.find((r) => r.questionId === q.id);
    const isAnswered = answers[String(q.id)] !== undefined;

    if (qResult?.isCorrect) return "bg-emerald-500 dark:bg-emerald-400";
    if (qResult) return "bg-rose-500 dark:bg-rose-400";
    if (isAnswered) return "bg-sky-500 dark:bg-sky-400";
    return "bg-slate-200 dark:bg-slate-700";
  };

  const navDotButtonStyle = (qIndex: number): string => {
    const q = questions[qIndex];
    const qResult = result?.questionsResult.find((r) => r.questionId === q.id);
    const isAnswered = answers[String(q.id)] !== undefined;
    const isCurrent = qIndex === currentIndex;
    const base =
      "flex items-center gap-3 w-full rounded-xl border px-3.5 py-3 text-xs sm:text-sm font-semibold text-left transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500";
    let color =
      "border-slate-200 bg-slate-50/70 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400 dark:hover:bg-slate-800";
    if (qResult?.isCorrect)
      color =
        "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300";
    else if (qResult)
      color =
        "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300";
    else if (isAnswered)
      color =
        "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300";
    return `${base} ${color} ${isCurrent ? "ring-2 ring-amber-500 ring-offset-1 shadow-xs" : ""}`;
  };

  return (
    <div
      className="flex flex-1 flex-col min-h-0"
      data-testid="grammar-workspace"
    >
      {/* ── 3-pane body ───────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* ── LEFT PANE (desktop only: wide, readable) ────────────────── */}
        <aside
          aria-label="Điều hướng câu hỏi"
          className="hidden lg:flex lg:w-60 xl:w-72 2xl:w-80 shrink-0 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto"
          data-testid="grammar-left-pane"
        >
          <div className="p-6 space-y-6">
            {/* Topic info */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Chủ đề ngữ pháp
              </p>
              <h2 className="mt-1.5 text-base sm:text-lg font-bold leading-snug text-slate-900 dark:text-slate-100">
                {topic.title}
              </h2>
              <span className="mt-2.5 inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                {topic.level}
              </span>
            </div>

            {/* Progress */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4">
              <div className="mb-2.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <span>Tiến độ thực hành</span>
                <span>
                  {result
                    ? `${result.correctCount}/${result.totalQuestions} đúng`
                    : `${answeredCount}/${questions.length} câu`}
                </span>
              </div>
              <div
                className="h-2 rounded-full bg-slate-200 dark:bg-slate-700"
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
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Danh sách câu hỏi ({questions.length})
              </p>
              <nav aria-label="Danh sách câu hỏi">
                <ol className="flex flex-col gap-2">
                  {questions.map((q, i) => (
                    <li key={q.id}>
                      <button
                        type="button"
                        onClick={() => setCurrentIndex(i)}
                        aria-current={i === currentIndex ? "step" : undefined}
                        aria-label={`Câu ${i + 1}${answers[String(q.id)] !== undefined ? " (đã chọn)" : ""}`}
                        className={navDotButtonStyle(i)}
                      >
                        <span className="flex size-6 sm:size-7 shrink-0 items-center justify-center rounded-lg border border-current text-xs font-bold">
                          {i + 1}
                        </span>
                        <span className="truncate">
                          {q.question}
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              </nav>
            </div>
          </div>
        </aside>

        {/* ── CENTER PANE (Focused Question Model) ─────────────────────── */}
        <main
          className="flex-1 min-h-0 overflow-y-auto bg-slate-50/70 dark:bg-slate-950/70 flex flex-col"
          aria-label="Câu hỏi hiện tại"
        >
          <div className="mx-auto w-full max-w-3xl xl:max-w-4xl 2xl:max-w-5xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10 my-auto">

            {/* Completion banner */}
            {result && (
              <div
                className={`mb-6 flex items-start justify-between gap-4 rounded-2xl border p-5 sm:items-center ${
                  result.correctCount === result.totalQuestions
                    ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40"
                    : "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40"
                }`}
                data-testid="grammar-completion-banner"
              >
                <div>
                  <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Kết quả: {result.correctCount}/{result.totalQuestions} câu đúng
                    {result.rewardXP > 0 && ` · +${result.rewardXP} EXP`}
                    {result.rewardBanh > 0 && ` · +${result.rewardBanh} Bánh Mì`}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Bạn có thể chọn từng câu ở thanh điều hướng để xem lại chi tiết lời giải.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={reset}
                  className="flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <RefreshCw size={15} aria-hidden="true" />
                  Làm lại
                </button>
              </div>
            )}

            {/* Counter bar */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span
                  className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                  aria-label={`Câu hỏi ${currentIndex + 1} trên ${questions.length}`}
                >
                  Câu {currentIndex + 1} / {questions.length}
                </span>
                {hasCurrentAnswer && !result && (
                  <span className="rounded-full bg-sky-100 px-3 py-0.5 text-xs font-bold text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                    Đã chọn đáp án
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {result ? "Chế độ xem lại bài làm" : "Chọn 1 đáp án chính xác nhất"}
              </span>
            </div>

            {/* Question card */}
            <article
              className="mb-6 rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 lg:p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900"
              data-testid="grammar-question-card"
            >
              <p className="mb-8 text-xl sm:text-2xl font-bold leading-relaxed tracking-tight text-slate-900 dark:text-slate-100">
                {currentQuestion.question}
              </p>

              <div
                className="space-y-3.5 sm:space-y-4"
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
                      className={`flex w-full min-h-[64px] sm:min-h-[72px] cursor-pointer items-center justify-between rounded-xl sm:rounded-2xl border p-4 sm:p-5 text-left text-base sm:text-lg font-semibold transition-all disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${optionStyle(optIndex)}`}
                    >
                      <div className="flex items-center gap-4 sm:gap-5">
                        <span
                          className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl border-2 border-current text-xs sm:text-sm font-black shadow-2xs"
                          aria-hidden="true"
                        >
                          {String.fromCharCode(65 + optIndex)}
                        </span>
                        <span className="leading-snug">{option}</span>
                      </div>
                      {currentResult && isCorrect && (
                        <CheckCircle2 size={22} className="shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                      )}
                      {isWrong && (
                        <XCircle size={22} className="shrink-0 text-rose-600 dark:text-rose-400" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>
            </article>

            {/* Mobile-only: inline theory / feedback below question */}
            <div className="md:hidden mt-6" data-testid="grammar-mobile-support">
              {result && currentResult ? (
                <FeedbackPanel qr={currentResult} />
              ) : (
                <GrammarVideoPlayer topic={topic} />
              )}
            </div>
          </div>
        </main>

        {/* ── RIGHT PANE (Theory & Contextual Feedback: Proportional & Breathable) ── */}
        <aside
          aria-label={result ? "Giải thích đáp án" : "Lý thuyết & Hướng dẫn"}
          className="hidden md:flex md:w-80 lg:w-80 xl:w-96 2xl:w-[420px] shrink-0 flex-col border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto"
          data-testid="grammar-right-pane"
        >
          <div className="p-6 sm:p-7 space-y-6">
            {result ? (
              // After submission: Show Feedback First, with Theory accessible below
              <>
                {currentResult && <FeedbackPanel qr={currentResult} />}
                <div className="border-t border-slate-200/80 pt-6 dark:border-slate-800">
                  <GrammarVideoPlayer topic={topic} />
                </div>
              </>
            ) : (
              // Before submission: Clean guidance + Full Theory (No redundant scrolling)
              <>
                <PracticeGuidance hasAnswer={hasCurrentAnswer} />
                <GrammarVideoPlayer topic={topic} />
              </>
            )}
          </div>
        </aside>
      </div>

      {/* ── BOTTOM NAV (Tactile, Clear, Proportional) ────────────────── */}
      <footer
        className="shrink-0 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4 sm:px-8 flex items-center justify-between gap-4"
        aria-label="Điều hướng câu hỏi"
      >
        {/* Prev */}
        <button
          type="button"
          disabled={isFirstQuestion}
          onClick={() => setCurrentIndex((prev) => getPrevIndex(prev))}
          aria-label="Câu trước"
          className="flex cursor-pointer items-center gap-2 rounded-xl sm:rounded-2xl border border-slate-200 bg-white px-5 py-2.5 sm:px-6 sm:py-3 text-sm sm:text-base font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <ChevronLeft size={18} aria-hidden="true" />
          <span className="hidden sm:inline">Câu trước</span>
        </button>

        {/* Dot indicators */}
        <div className="flex items-center gap-2" aria-hidden="true">
          {questions.map((q, i) => (
            <button
              key={q.id}
              type="button"
              onClick={() => setCurrentIndex(i)}
              aria-label={`Câu ${i + 1}`}
              className={`cursor-pointer rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                i === currentIndex ? "h-3 w-8" : "size-3"
              } ${dotStyle(i)}`}
            />
          ))}
        </div>

        {/* Next / Submit */}
        {!isLastQuestion || result ? (
          <button
            type="button"
            disabled={isLastQuestion}
            onClick={() => setCurrentIndex((prev) => getNextIndex(prev, questions.length))}
            aria-label="Câu tiếp"
            className="flex cursor-pointer items-center gap-2 rounded-xl sm:rounded-2xl border border-slate-200 bg-white px-5 py-2.5 sm:px-6 sm:py-3 text-sm sm:text-base font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <span className="hidden sm:inline">Câu tiếp</span>
            <ChevronRight size={18} aria-hidden="true" />
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
            className="flex cursor-pointer items-center gap-2 rounded-xl sm:rounded-2xl bg-emerald-600 px-6 py-2.5 sm:px-7 sm:py-3 text-sm sm:text-base font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 shadow-xs"
            data-testid="grammar-submit-btn"
          >
            {submitAttempt.isPending ? "Đang chấm…" : "Nộp bài"}
          </button>
        )}
      </footer>
    </div>
  );
};
