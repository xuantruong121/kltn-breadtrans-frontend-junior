"use client";

import React, { useState } from "react";
import { Check, ChevronRight, LayoutGrid, ListOrdered, X } from "lucide-react";
import {
  DiagnosticUiQuestion,
  groupQuestionsBySection,
  SectionQuestionGroup,
} from "@/lib/diagnostic/diagnosticUiLogic";

interface DiagnosticQuestionNavigatorProps {
  questions: Array<DiagnosticUiQuestion & { section?: string; skill?: string }>;
  currentStep: number;
  answers: Record<string, number | string>;
  onSelectStep: (stepIndex: number) => void;
}

export function DiagnosticQuestionNavigator({
  questions,
  currentStep,
  answers,
  onSelectStep,
}: DiagnosticQuestionNavigatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const groups = groupQuestionsBySection(questions);
  const currentQuestion = questions[currentStep];

  // Identify current group
  const currentGroup = groups.find((g) =>
    g.questions.some((q) => q.index === currentStep),
  ) ?? groups[0];

  const totalAnswered = questions.filter(
    (q) =>
      answers[q.id] !== undefined &&
      (typeof answers[q.id] !== "string" || (answers[q.id] as string).trim() !== ""),
  ).length;

  const currentGroupAnswered = currentGroup
    ? currentGroup.questions.filter(
        (q) =>
          answers[q.id] !== undefined &&
          (typeof answers[q.id] !== "string" ||
            (answers[q.id] as string).trim() !== ""),
      ).length
    : 0;

  const handleSelect = (index: number) => {
    onSelectStep(index);
    setIsOpen(false);
  };

  return (
    <>
      {/* Top Section Progress Bar & Navigator Trigger */}
      <div className="mb-6 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block rounded-md bg-violet-100 px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                {currentGroup?.title ?? "Đánh giá đầu vào"}
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Câu {currentStep + 1} / {questions.length}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Phần này: {currentGroupAnswered}/{currentGroup?.questions.length ?? 0} đã làm • Tổng: {totalAnswered}/{questions.length}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-extrabold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            aria-label="Mở danh sách câu hỏi"
          >
            <LayoutGrid size={15} />
            <span>Danh sách câu</span>
            <span className="ml-1 rounded-full bg-slate-200 px-1.5 py-0.2 text-[10px] font-black dark:bg-slate-700">
              {questions.length}
            </span>
          </button>
        </div>

        {/* Linear Progress Bar */}
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-violet-600 transition-all duration-300 dark:bg-violet-500"
            style={{
              width: `${Math.round(((currentStep + 1) / questions.length) * 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Slide-over Drawer / Modal for Grouped Question Navigation */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs transition-opacity sm:p-6"
          onClick={() => setIsOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="navigator-dialog-title"
        >
          <div
            className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
              <div>
                <h3
                  id="navigator-dialog-title"
                  className="text-lg font-black text-slate-900 dark:text-slate-100"
                >
                  Danh sách câu hỏi
                </h3>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Chọn câu hỏi để chuyển nhanh • {totalAnswered}/{questions.length} câu đã trả lời
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Đóng bảng câu hỏi"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content: Grouped by Section */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {groups.map((group) => {
                const groupAnswered = group.questions.filter(
                  (q) =>
                    answers[q.id] !== undefined &&
                    (typeof answers[q.id] !== "string" ||
                      (answers[q.id] as string).trim() !== ""),
                ).length;

                return (
                  <div key={group.key} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        {group.title}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">
                        {groupAnswered} / {group.questions.length} câu
                      </span>
                    </div>

                    <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-8">
                      {group.questions.map((q) => {
                        const isCurrent = q.index === currentStep;
                        const isAnswered =
                          answers[q.id] !== undefined &&
                          (typeof answers[q.id] !== "string" ||
                            (answers[q.id] as string).trim() !== "");

                        return (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => handleSelect(q.index)}
                            aria-label={`Đi tới câu ${q.index + 1}`}
                            aria-current={isCurrent ? "step" : undefined}
                            className={`relative flex h-10 w-full items-center justify-center rounded-xl text-xs font-black transition-all ${
                              isCurrent
                                ? "bg-violet-600 text-white shadow-md ring-2 ring-violet-600 ring-offset-2 dark:ring-offset-slate-900"
                                : isAnswered
                                  ? "border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                                  : "border border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            <span>{q.index + 1}</span>
                            {isAnswered && !isCurrent && (
                              <Check
                                size={10}
                                className="absolute right-1 top-1 text-emerald-600 dark:text-emerald-400"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer / Legend */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 p-4 text-xs dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="size-3 rounded-md bg-violet-600" />
                  <span className="text-slate-600 dark:text-slate-400">Đang làm</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-3 rounded-md border border-emerald-400 bg-emerald-100 dark:bg-emerald-950/60" />
                  <span className="text-slate-600 dark:text-slate-400">Đã trả lời</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-3 rounded-md border border-slate-300 bg-white dark:bg-slate-800" />
                  <span className="text-slate-600 dark:text-slate-400">Chưa trả lời</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
