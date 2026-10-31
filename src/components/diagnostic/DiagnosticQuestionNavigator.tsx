"use client";

import React, { useState } from "react";
import { LayoutGrid, X } from "lucide-react";
import {
  DiagnosticUiQuestion,
  groupQuestionsBySection,
} from "@/lib/diagnostic/diagnosticUiLogic";
import { WRITING_SKIPPED } from "@/lib/diagnostic/diagnosticTaskLogic";

interface DiagnosticQuestionNavigatorProps {
  questions: Array<DiagnosticUiQuestion & { section?: string; skill?: string }>;
  currentStep: number;
  answers: Record<string, number | string>;
  onSelectStep: (stepIndex: number) => void;
}

const GROUP_TITLES: Record<string, string> = {
  LISTENING: "Nghe",
  READING: "Đọc",
  SPEAKING: "Nói",
  WRITING: "Viết",
  LANGUAGE_USE: "Ngữ pháp & Từ vựng",
};

type QuestionState = "answered" | "skipped" | "open";

function stateOf(value: number | string | undefined): QuestionState {
  if (value === undefined) return "open";
  if (value === "SKIPPED" || value === WRITING_SKIPPED) return "skipped";
  if (typeof value === "string" && !value.trim()) return "open";
  return "answered";
}

/**
 * Question list in the assessment's own order. From lg up it is a sticky
 * sidebar next to the question; below that, a compact bar opens the same
 * list in a dialog. Counts come from the learner's answers.
 */
export function DiagnosticQuestionNavigator({
  questions,
  currentStep,
  answers,
  onSelectStep,
}: DiagnosticQuestionNavigatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const groups = groupQuestionsBySection(questions);
  const states = questions.map((q) => stateOf(answers[q.id]));
  const answered = states.filter((s) => s === "answered").length;
  const skipped = states.filter((s) => s === "skipped").length;
  const currentGroup = groups.find((g) => g.questions.some((q) => q.index === currentStep)) ?? groups[0];

  const select = (index: number) => {
    onSelectStep(index);
    setIsOpen(false);
  };

  const grid = (
    <div className="space-y-5">
      {groups.map((group) => {
        const first = group.questions[0].index + 1;
        const last = group.questions[group.questions.length - 1].index + 1;
        return (
          <div key={group.key}>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {GROUP_TITLES[group.key] ?? group.title}
              <span className="font-medium text-slate-500 dark:text-slate-400">
                {" "}
                · câu {first}–{last}
              </span>
            </p>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {group.questions.map((q) => {
                const isCurrent = q.index === currentStep;
                const state = states[q.index];
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => select(q.index)}
                    aria-label={`Câu ${q.index + 1}${state === "answered" ? ", đã làm" : state === "skipped" ? ", đã bỏ qua" : ", chưa làm"}`}
                    aria-current={isCurrent ? "step" : undefined}
                    className={`flex h-10 items-center justify-center rounded-lg text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
                      isCurrent
                        ? "bg-teal-600 text-white"
                        : state === "answered"
                          ? "bg-emerald-100 text-emerald-900 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200"
                          : state === "skipped"
                            ? "bg-slate-200 text-slate-600 line-through hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    {q.index + 1}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  const summary = (
    <p className="text-sm text-slate-600 dark:text-slate-400">
      Đã làm {answered}/{questions.length}
      {skipped > 0 && ` · bỏ qua ${skipped}`}
    </p>
  );

  return (
    <>
      {/* Below lg: compact bar */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 lg:hidden">
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Câu {currentStep + 1}/{questions.length}
            {currentGroup && ` · ${GROUP_TITLES[currentGroup.key] ?? currentGroup.title}`}
          </p>
          {summary}
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-bold text-slate-800 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <LayoutGrid size={16} aria-hidden="true" />
          Danh sách câu
        </button>
      </div>

      {/* From lg: sidebar */}
      <aside
        className="hidden rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:block"
        aria-label="Danh sách câu hỏi"
      >
        <p className="text-lg font-black text-slate-900 dark:text-slate-100">
          Câu {currentStep + 1}/{questions.length}
        </p>
        {summary}
        <div className="mt-5 max-h-[calc(100dvh-14rem)] overflow-y-auto pr-1">{grid}</div>
      </aside>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center lg:hidden"
          onClick={() => setIsOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="navigator-dialog-title"
        >
          <div
            className="flex max-h-[85dvh] w-full max-w-md flex-col rounded-2xl bg-white dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5">
              <div>
                <h3 id="navigator-dialog-title" className="text-lg font-black text-slate-900 dark:text-slate-100">
                  Danh sách câu hỏi
                </h3>
                {summary}
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Đóng danh sách câu hỏi"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">{grid}</div>
          </div>
        </div>
      )}
    </>
  );
}
