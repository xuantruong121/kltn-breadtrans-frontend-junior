"use client";

import { memo } from "react";

type Props = {
  questionId: number;
  questionNumber: number;
  text: string | null;
  options: string[];
  selectedIndex: number | undefined;
  marked: boolean;
  /** Part 1-2: options are heard, not printed; only the letters are shown. */
  audioOnly: boolean;
  disabled: boolean;
  onSelect: (questionId: number, optionIndex: number) => void;
  onToggleMark: (questionId: number) => void;
};

/**
 * One question: its number (click to flag it for review), the question text
 * and compact radio choices. Memoized on primitive props so answering one
 * question re-renders only that question.
 */
export const ToeicPaperQuestion = memo(function ToeicPaperQuestion({
  questionId,
  questionNumber,
  text,
  options,
  selectedIndex,
  marked,
  audioOnly,
  disabled,
  onSelect,
  onToggleMark,
}: Props) {
  const labelId = `q-${questionNumber}-label`;
  return (
    <article id={`q-${questionNumber}`} data-question-id={questionId} data-question-number={questionNumber} className="scroll-mt-40 py-3">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onToggleMark(questionId)}
          aria-pressed={marked}
          aria-label={marked ? `Câu ${questionNumber}, đang đánh dấu review. Bấm để bỏ` : `Câu ${questionNumber}. Bấm để đánh dấu review`}
          title="Bấm để đánh dấu review"
          className={`inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full px-2 text-sm font-bold transition-colors ${marked ? "bg-amber-400 text-amber-950 ring-2 ring-amber-200 dark:ring-amber-900" : "bg-blue-50 text-blue-800 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-200"}`}
        >
          {questionNumber}
        </button>
        <div className="min-w-0 flex-1">
          {!audioOnly && text && (
            <p id={labelId} className="pt-1.5 text-base font-medium leading-relaxed text-slate-900 dark:text-slate-100">
              {text}
            </p>
          )}
          <div
            role="radiogroup"
            aria-labelledby={!audioOnly && text ? labelId : undefined}
            aria-label={audioOnly || !text ? `Câu ${questionNumber}` : undefined}
            className={audioOnly ? "flex flex-wrap gap-x-6 gap-y-1 pt-1.5" : "mt-1.5 space-y-0.5"}
          >
            {options.map((option, index) => {
              const letter = String.fromCharCode(65 + index);
              const selected = selectedIndex === index;
              return (
                <label
                  key={index}
                  className={`flex min-h-9 cursor-pointer items-start gap-2.5 rounded-md px-1.5 py-1 text-[15px] leading-relaxed transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  <input
                    type="radio"
                    name={`q-${questionId}`}
                    checked={selected}
                    disabled={disabled}
                    onChange={() => onSelect(questionId, index)}
                    className="mt-1 h-4 w-4 shrink-0 accent-blue-600"
                  />
                  <span className={selected ? "font-semibold text-blue-800 dark:text-blue-200" : "text-slate-800 dark:text-slate-200"}>
                    {letter}.{!audioOnly && ` ${option}`}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </article>
  );
});
