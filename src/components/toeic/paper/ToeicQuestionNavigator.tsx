"use client";

import { memo } from "react";
import { Loader2 } from "lucide-react";

import type { ToeicQuestionGroup } from "@/lib/api/services/toeic.service";
import type { PaperPart } from "@/lib/toeic/examPaper";

type Props = {
  parts: PaperPart<ToeicQuestionGroup>[];
  answers: Record<number, number>;
  marked: Set<number>;
  currentQuestionId: number | null;
  timerValue: string;
  saveStatus: string;
  saveError: boolean;
  saving: boolean;
  restoreDisabled: boolean;
  submitting: boolean;
  onJumpQuestion: (questionNumber: number) => void;
  onSubmit: () => void;
  onSave: () => void;
  onRestore: () => void;
};

/**
 * Right sidebar: time left, submit, restore/save, the review hint, then the
 * question numbers grouped by Part (labels only; Part switching lives in the
 * tabs above the questions).
 */
export const ToeicQuestionNavigator = memo(function ToeicQuestionNavigator({
  parts,
  answers,
  marked,
  currentQuestionId,
  timerValue,
  saveStatus,
  saveError,
  saving,
  restoreDisabled,
  submitting,
  onJumpQuestion,
  onSubmit,
  onSave,
  onRestore,
}: Props) {
  return (
    <div className="flex h-full flex-col">
      <p className="text-sm text-slate-600 dark:text-slate-300">Thời gian còn lại:</p>
      <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{timerValue}</p>
      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting}
        className="mt-2 min-h-10 w-full rounded-md border border-blue-600 text-sm font-bold uppercase text-blue-700 transition-colors hover:bg-blue-600 hover:text-white disabled:opacity-60 dark:text-blue-300"
      >
        Nộp bài
      </button>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={onRestore}
          disabled={restoreDisabled || saving}
          title={restoreDisabled ? "Chưa có bản lưu nào khác bài đang làm" : "Lấy lại bản đã lưu gần nhất trên máy chủ"}
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
      <p role="status" className={`mt-1 text-xs ${saveError ? "font-semibold text-rose-600 dark:text-rose-400" : "text-slate-500 dark:text-slate-400"}`}>
        {saveStatus}
      </p>
      <p className="mt-2 text-xs italic leading-5 text-amber-700 dark:text-amber-300">
        Chú ý: bạn có thể click vào số thứ tự câu hỏi trong bài để đánh dấu review
      </p>

      <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1">
        {parts.map((p) => (
          <section key={p.part} aria-label={`Part ${p.part}`}>
            <p className="mb-1 text-sm font-bold text-slate-800 dark:text-slate-100">Part {p.part}</p>
            <div className="grid grid-cols-5 gap-1">
              {p.groups.flatMap((g) =>
                g.questions.map((q) => {
                  const answered = answers[q.id] !== undefined;
                  const flagged = marked.has(q.id);
                  const current = currentQuestionId === q.id;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => onJumpQuestion(q.questionNumber)}
                      aria-label={`Câu ${q.questionNumber}${answered ? ", đã trả lời" : ", chưa trả lời"}${flagged ? ", đánh dấu review" : ""}`}
                      aria-current={current ? "true" : undefined}
                      className={`min-h-7 rounded border text-xs font-semibold tabular-nums transition-colors ${
                        flagged
                          ? "border-amber-400 bg-amber-400 text-amber-950"
                          : answered
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-300 bg-white text-slate-700 hover:border-blue-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                      } ${current ? "ring-2 ring-blue-300 ring-offset-1 dark:ring-blue-700 dark:ring-offset-slate-900" : ""}`}
                    >
                      {q.questionNumber}
                    </button>
                  );
                }),
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
});
