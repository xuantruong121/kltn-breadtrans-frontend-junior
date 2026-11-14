"use client";

import { dependsOnLevel } from "@/lib/learning-path/levelLock";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, LayoutGrid, Loader2, RotateCcw, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { grammarService } from "@/lib/api/services/grammar.service";
import { useAuthStore } from "@/stores/authStore";
import { GrammarAttemptResult, GrammarTopicDetail } from "../types";
import { SupportPlaceholder, SupportSections, useSectionPrefs } from "./grammarSupportSections";
import { ReportIssueButton } from "@/components/issue-report";
import { GRAMMAR_LAYOUT_CLASSES, getNextIndex, getPrevIndex, isGrammarDirty } from "./grammarNavigationUtils";
import {
  allAnswered,
  answersOf,
  clearWrong,
  grammarTally,
  nextUnanswered,
  optionFromKey,
  optionState,
  wrongQuestionIds,
  type GrammarChecks,
} from "./grammarPracticeLogic";
import { levelLabel } from "@/lib/ui/displayLabels";
import { grammarDisplayTitle } from "@/lib/catalog/displayTitles";

export interface GrammarQuizProps {
  topic: GrammarTopicDetail;
  onDirtyChange?: (isDirty: boolean) => void;
}

const LETTERS = "ABCDEFGH";


/**
 * One grammar topic, graded question by question (owner 2026-11-13): the
 * whole workspace fits the screen, the left column lists the questions, the
 * centre shows one question, the right column explains it as soon as an
 * option is picked. When every question is answered the attempt is saved once,
 * which records progress and feeds the mistake notebook as before.
 */
export const GrammarQuiz: React.FC<GrammarQuizProps> = ({ topic, onDirtyChange }) => {
  const { id: topicId, questions } = topic;
  const queryClient = useQueryClient();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [checks, setChecks] = useState<GrammarChecks>({});
  const [pending, setPending] = useState<{ questionId: number; option: number } | null>(null);
  const [result, setResult] = useState<GrammarAttemptResult | null>(null);
  const [gridOpen, setGridOpen] = useState(false);
  const [sectionPrefs, toggleSectionPref] = useSectionPrefs();
  const submittedRef = useRef(false);

  const tally = grammarTally(questions, checks);
  const wrongIds = wrongQuestionIds(questions, checks);

  useEffect(() => {
    onDirtyChange?.(isGrammarDirty(tally.answered, Boolean(result)));
  }, [tally.answered, result, onDirtyChange]);

  const submitAttempt = useMutation({
    mutationFn: (answers: Record<string, number>) => grammarService.submitAttempt(topicId, answers),
    onSuccess: (data) => {
      setResult(data);
      const currentUserId = useAuthStore.getState().user?.id;
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["grammar-topics"] }),
        queryClient.invalidateQueries({ queryKey: ["user-stats", currentUserId] }),
        queryClient.invalidateQueries({ queryKey: ["daily-quests"] }),
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
        queryClient.invalidateQueries({ queryKey: ["mistakes"] }),
        queryClient.invalidateQueries({ predicate: (q) => dependsOnLevel(q.queryKey) }),
      ]);
    },
    onError: () => {
      submittedRef.current = false;
      toast.error("Chưa lưu được kết quả bài này. Hãy đăng nhập hoặc thử lại.");
    },
  });

  // Every question answered: save the attempt once.
  useEffect(() => {
    if (!result && !submittedRef.current && allAnswered(questions, checks)) {
      submittedRef.current = true;
      submitAttempt.mutate(answersOf(checks));
    }
  }, [checks, questions, result, submitAttempt]);

  const currentQuestion = questions[currentIndex];
  const currentCheck = currentQuestion ? checks[currentQuestion.id] : undefined;

  const choose = useCallback(
    async (optionIndex: number) => {
      if (!currentQuestion || checks[currentQuestion.id] || pending) return;
      setPending({ questionId: currentQuestion.id, option: optionIndex });
      try {
        const graded = await grammarService.checkAnswer(topicId, currentQuestion.id, optionIndex);
        setChecks((previous) => ({ ...previous, [currentQuestion.id]: graded }));
      } catch {
        toast.error("Chưa chấm được câu này. Hãy thử lại.");
      } finally {
        setPending(null);
      }
    },
    [checks, currentQuestion, pending, topicId],
  );

  const goTo = (index: number) => {
    setCurrentIndex(index);
    setGridOpen(false);
  };

  const retryWrong = () => {
    const firstWrong = questions.findIndex((q) => wrongIds.includes(q.id));
    setChecks((previous) => clearWrong(previous));
    setResult(null);
    submittedRef.current = false;
    if (firstWrong >= 0) goTo(firstWrong);
  };

  const retryAll = () => {
    setChecks({});
    setResult(null);
    submittedRef.current = false;
    goTo(0);
  };

  // ← → move between questions; 1-4 or A-D choose an option.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === "ArrowRight") {
        setCurrentIndex((index) => getNextIndex(index, questions.length));
        return;
      }
      if (event.key === "ArrowLeft") {
        setCurrentIndex((index) => getPrevIndex(index));
        return;
      }
      if (!currentQuestion) return;
      const option = optionFromKey(event.key, currentQuestion.options.length);
      if (option !== null) void choose(option);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choose, currentQuestion, questions.length]);

  if (!questions.length) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center">
        <p className="text-[15px] text-slate-600 dark:text-slate-400">
          Chủ đề này chưa có câu hỏi. Hãy quay lại sau khi nội dung được bổ sung.
        </p>
      </div>
    );
  }

  const optionClass = (optionIndex: number) => {
    const state = optionState(
      optionIndex,
      currentCheck,
      pending?.questionId === currentQuestion.id ? pending.option : null,
    );
    if (state === "correct")
      return "border-emerald-500 bg-emerald-50 text-emerald-900 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-200";
    if (state === "wrong")
      return "border-rose-500 bg-rose-50 text-rose-900 dark:border-rose-600 dark:bg-rose-950/40 dark:text-rose-200";
    if (state === "faded")
      return "border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400";
    if (state === "pending")
      return "border-blue-500 bg-blue-50 text-slate-900 dark:border-blue-500 dark:bg-blue-950/40 dark:text-slate-100";
    return "border-slate-200 bg-white text-slate-900 hover:border-blue-400 hover:bg-blue-50/40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-blue-500/70";
  };

  const rowMark = (questionId: number) => {
    const check = checks[questionId];
    if (!check) return "border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-400";
    return check.isCorrect
      ? "border-emerald-500 bg-emerald-500 text-white dark:border-emerald-500"
      : "border-rose-500 bg-rose-500 text-white dark:border-rose-500";
  };

  const progress = Math.round((tally.answered / tally.total) * 100);

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="grammar-workspace">
      <div className="flex min-h-0 flex-1">
        {/* Left: the topic's questions */}
        <aside
          aria-label="Danh sách câu hỏi"
          className={`${GRAMMAR_LAYOUT_CLASSES.leftPane} min-h-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900`}
          data-testid="grammar-left-pane"
        >
          <div className="border-b border-slate-200 p-5 dark:border-slate-800">
            <p className="text-[13px] font-semibold text-slate-600 dark:text-slate-400">{levelLabel(topic.level)}</p>
            <h2 className="mt-0.5 text-base font-bold leading-snug text-slate-900 dark:text-slate-100">
              {grammarDisplayTitle(topic.id, topic.title)}
            </h2>
            <div
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
              role="progressbar"
              aria-label="Tiến độ"
              aria-valuenow={tally.answered}
              aria-valuemin={0}
              aria-valuemax={tally.total}
            >
              <div className="h-full rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-[13px] text-slate-600 dark:text-slate-400">
              {tally.answered}/{tally.total} câu
              <span className="ml-2 font-semibold text-emerald-700 dark:text-emerald-400">đúng {tally.correct}</span>
              <span className="ml-2 font-semibold text-rose-700 dark:text-rose-400">sai {tally.wrong}</span>
            </p>
          </div>
          <nav aria-label="Các câu" className="min-h-0 flex-1 overflow-y-auto p-2">
            <ol className="space-y-0.5">
              {questions.map((q, i) => (
                <li key={q.id}>
                  <button
                    type="button"
                    onClick={() => goTo(i)}
                    aria-current={i === currentIndex ? "step" : undefined}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      i === currentIndex
                        ? "bg-blue-50 text-slate-900 dark:bg-blue-950/40 dark:text-slate-100"
                        : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <span
                      className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-[13px] font-bold tabular-nums ${rowMark(q.id)}`}
                      aria-hidden="true"
                    >
                      {i + 1}
                    </span>
                    <span className={`min-w-0 flex-1 truncate text-[15px] ${i === currentIndex ? "font-semibold" : ""}`}>
                      {q.question}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>
          {wrongIds.length > 0 && (
            <div className="border-t border-slate-200 p-3 dark:border-slate-800">
              <button
                type="button"
                onClick={retryWrong}
                className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 text-sm font-semibold text-rose-800 transition-colors hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-950/50"
              >
                <RotateCcw size={15} aria-hidden="true" />
                Làm lại câu sai ({wrongIds.length})
              </button>
            </div>
          )}
        </aside>

        {/* Centre: one question */}
        <main
          className="min-h-0 flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950"
          aria-label="Câu hỏi hiện tại"
        >
          <div className={`mx-auto w-full max-w-3xl py-6 ${GRAMMAR_LAYOUT_CLASSES.centerOuterPadding}`}>
            {result && (
              <div
                className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                data-testid="grammar-completion-banner"
              >
                <p className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">
                  Đã xong: {result.correctCount}/{result.totalQuestions} câu đúng
                </p>
                <div className="flex flex-wrap gap-2">
                  {wrongIds.length > 0 && (
                    <button
                      type="button"
                      onClick={retryWrong}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-rose-200 px-3 text-sm font-semibold text-rose-800 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/30"
                    >
                      <RotateCcw size={14} aria-hidden="true" />
                      Làm lại câu sai
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={retryAll}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Làm lại cả bài
                  </button>
                </div>
              </div>
            )}

            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="rounded-full bg-white px-3 py-1 text-[13px] font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800">
                Câu {currentIndex + 1}/{questions.length}
              </span>
              <span className="text-[13px] text-slate-600 dark:text-slate-400">
                {currentCheck ? "Đã chấm câu này" : "Chọn một đáp án (phím 1–4)"}
              </span>
            </div>

            <article
              className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900"
              data-testid="grammar-question-card"
            >
              <p className="text-lg font-semibold leading-relaxed text-slate-900 sm:text-xl dark:text-slate-100">
                {currentQuestion.question}
              </p>
              <div className="mt-5 space-y-2.5" role="radiogroup" aria-label="Đáp án">
                {currentQuestion.options.map((option, optionIndex) => {
                  const state = optionState(
                    optionIndex,
                    currentCheck,
                    pending?.questionId === currentQuestion.id ? pending.option : null,
                  );
                  return (
                    <button
                      key={optionIndex}
                      type="button"
                      role="radio"
                      aria-checked={currentCheck?.selectedOption === optionIndex || state === "pending"}
                      disabled={Boolean(currentCheck) || Boolean(pending)}
                      onClick={() => void choose(optionIndex)}
                      className={`flex min-h-13 w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-base transition-colors disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${optionClass(optionIndex)}`}
                    >
                      <span className="w-6 shrink-0 font-semibold" aria-hidden="true">
                        {LETTERS[optionIndex]}.
                      </span>
                      <span className="min-w-0 flex-1 font-medium">{option}</span>
                      {state === "pending" && <Loader2 size={18} className="shrink-0 animate-spin" aria-label="Đang chấm" />}
                      {state === "correct" && (
                        <Check size={18} strokeWidth={2.5} className="shrink-0 text-emerald-700 dark:text-emerald-400" aria-label="Đáp án đúng" />
                      )}
                      {state === "wrong" && (
                        <X size={18} strokeWidth={2.5} className="shrink-0 text-rose-700 dark:text-rose-400" aria-label="Đáp án bạn chọn" />
                      )}
                    </button>
                  );
                })}
              </div>
            </article>

            {/* Phone: the sections sit under the question once it is answered. */}
            {currentCheck && (
              <div className="mt-4 md:hidden">
                <SupportSections
                  check={currentCheck}
                  topic={topic}
                  prefs={sectionPrefs}
                  onToggle={toggleSectionPref}
                  idPrefix="grammar-phone"
                />
              </div>
            )}
          </div>
        </main>

        {/* Right: nothing but a hint until an option is picked (owner 2026-11-13),
            then the explanation and the key points, each behind a switch. */}
        <aside
          aria-label="Giải thích"
          className={`${GRAMMAR_LAYOUT_CLASSES.rightPane} min-h-0 overflow-y-auto border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900`}
          data-testid="grammar-right-pane"
        >
          <div className="flex flex-1 flex-col p-5">
            {currentCheck ? (
              <SupportSections
                check={currentCheck}
                topic={topic}
                prefs={sectionPrefs}
                onToggle={toggleSectionPref}
                idPrefix="grammar-side"
              />
            ) : (
              <SupportPlaceholder />
            )}
          </div>
        </aside>
      </div>

      {/* Footer: always in view */}
      <footer
        className="relative flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-900"
        aria-label="Chuyển câu"
      >
        <ReportIssueButton
          labelFromSm
          area="GRAMMAR"
          context={{
            route: typeof window !== "undefined" ? window.location.pathname + window.location.search : undefined,
            sourceType: "GRAMMAR_QUESTION",
            sourceId: currentQuestion.id,
            context: {
              topicId: topic.id,
              topicTitle: grammarDisplayTitle(topic.id, topic.title),
              question: currentQuestion.question,
            },
          }}
        />

        <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={currentIndex === 0}
          onClick={() => goTo(getPrevIndex(currentIndex))}
          aria-label="Câu trước"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-300 px-3.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ChevronLeft size={18} aria-hidden="true" />
          <span className="hidden sm:inline">Câu trước</span>
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setGridOpen((open) => !open)}
            aria-expanded={gridOpen}
            aria-label={`Bảng câu hỏi, đang ở câu ${currentIndex + 1}/${questions.length}`}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold tabular-nums text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            <LayoutGrid size={16} aria-hidden="true" />
            {currentIndex + 1}/{questions.length}
          </button>
          {gridOpen && (
            <div className="absolute bottom-full right-0 mb-2 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900">
              <p className="mb-2 text-[13px] text-slate-600 dark:text-slate-400">
                Đã làm {tally.answered}/{tally.total}
              </p>
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, i) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => goTo(i)}
                    aria-label={`Câu ${i + 1}`}
                    className={`flex size-10 items-center justify-center rounded-lg border text-sm font-bold tabular-nums ${rowMark(q.id)} ${
                      i === currentIndex ? "ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-slate-900" : ""
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={currentIndex === questions.length - 1}
          onClick={() => {
            const next = currentCheck ? nextUnanswered(questions, checks, currentIndex) : null;
            goTo(next !== null && next > currentIndex ? next : getNextIndex(currentIndex, questions.length));
          }}
          aria-label="Câu tiếp"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="hidden sm:inline">Câu tiếp</span>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
        </div>
      </footer>
    </div>
  );
};
