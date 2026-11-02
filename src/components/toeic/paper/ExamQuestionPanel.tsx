"use client";

import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

export type PanelQuestion = {
  key: number;
  number: number;
  answered: boolean;
  flagged: boolean;
  current: boolean;
};

export type PanelSection = { key: string | number; label: string; questions: PanelQuestion[] };

type Props = {
  sections: PanelSection[];
  timerValue: string;
  saveStatus: string;
  saveError: boolean;
  saving: boolean;
  restoreDisabled: boolean;
  restoreTitle: string;
  submitting: boolean;
  onJumpQuestion: (questionNumber: number) => void;
  onSubmit: () => void;
  onSave: () => void;
  onRestore: () => void;
  /** Shown right under Nộp bài, for a message about the submit itself. */
  notice?: ReactNode;
};

/**
 * Right sidebar of every exam room: time left, submit, restore/save, the review
 * hint, then the question numbers (labels only; switching lives in the tabs).
 */
export function ExamQuestionPanel({
  sections,
  timerValue,
  saveStatus,
  saveError,
  saving,
  restoreDisabled,
  restoreTitle,
  submitting,
  onJumpQuestion,
  onSubmit,
  onSave,
  onRestore,
  notice,
}: Props) {
  return (
    <div className="flex h-full flex-col">
      <p className="text-sm text-slate-600 dark:text-slate-300">Thời gian còn lại:</p>
      <p role="timer" aria-label="Thời gian còn lại" className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
        {timerValue}
      </p>
      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting}
        className="mt-2 min-h-10 w-full rounded-md border border-blue-600 text-sm font-bold uppercase text-blue-700 transition-colors hover:bg-blue-600 hover:text-white disabled:opacity-60 dark:text-blue-300"
      >
        Nộp bài
      </button>
      {notice}
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={onRestore}
          disabled={restoreDisabled || saving}
          title={restoreTitle}
          className="min-h-9 rounded-md border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Khôi phục
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex min-h-9 items-center justify-center gap-1 rounded-md border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {saving && <Loader2 size={13} className="animate-spin" aria-hidden="true" />}
          Lưu bài làm
        </button>
      </div>
      <p role="status" className={`mt-1 text-xs ${saveError ? "font-semibold text-rose-700 dark:text-rose-400" : "text-slate-600 dark:text-slate-400"}`}>
        {saveStatus}
      </p>
      <p className="mt-2 text-xs italic leading-5 text-amber-700 dark:text-amber-300">
        Chú ý: bạn có thể click vào số thứ tự câu hỏi trong bài để đánh dấu review
      </p>

      <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1">
        {sections.map((section) => (
          <section key={section.key} aria-label={section.label}>
            <p className="mb-1 text-sm font-bold text-slate-800 dark:text-slate-100">{section.label}</p>
            <div className="grid grid-cols-5 gap-1">
              {section.questions.map((q) => (
                <button
                  key={q.key}
                  type="button"
                  onClick={() => onJumpQuestion(q.number)}
                  aria-label={`Câu ${q.number}${q.answered ? ", đã trả lời" : ", chưa trả lời"}${q.flagged ? ", đánh dấu review" : ""}`}
                  aria-current={q.current ? "true" : undefined}
                  className={`min-h-7 rounded border text-xs font-semibold tabular-nums transition-colors ${
                    q.flagged
                      ? "border-amber-400 bg-amber-400 text-amber-950"
                      : q.answered
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:border-blue-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                  } ${q.current ? "ring-2 ring-blue-300 ring-offset-1 dark:ring-blue-700 dark:ring-offset-slate-900" : ""}`}
                >
                  {q.number}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
