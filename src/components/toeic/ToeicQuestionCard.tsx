import { Flag } from "lucide-react";

/**
 * Minimal shape this card actually renders — intentionally looser than the
 * full learner `ToeicQuestionGroup["questions"][number]` type so the Admin
 * "Xem như học viên" preview (whose DTO strictly omits answer-key fields)
 * can reuse this exact component without widening what it exposes.
 */
type Question = {
  questionNumber: number;
  text?: string | null;
  options: string[];
};

/**
 * The single reusable TOEIC L&R question rendering unit — shared between the
 * real learner attempt runtime and the Admin "Xem như học viên" preview, so
 * the two never visually drift apart. Pure presentational: no API calls, no
 * attempt/autosave state. `onSelect` is omitted (or `readOnly` passed) to
 * render a non-interactive / preview-only card.
 */
export function ToeicQuestionCard({
  question,
  selectedIndex,
  onSelect,
  marked = false,
  audioOnly = false,
  readOnly = false,
}: {
  question: Question;
  selectedIndex: number | undefined;
  onSelect?: (optionIndex: number) => void;
  marked?: boolean;
  audioOnly?: boolean;
  readOnly?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-3">
        <h2 className="text-base font-black text-slate-900 dark:text-slate-100 sm:text-lg">
          Câu {question.questionNumber}
          {audioOnly ? " · Chọn đáp án" : question.text ? ` · ${question.text}` : ""}
        </h2>
        {marked && (
          <Flag
            size={16}
            className="text-amber-600 dark:text-amber-400"
            aria-label="Đã đánh dấu xem lại"
          />
        )}
      </div>
      <div className="grid gap-2.5 p-4 sm:grid-cols-2 sm:gap-3">
        {question.options.map((option, optionIndex) => (
          <button
            key={optionIndex}
            type="button"
            disabled={readOnly}
            onClick={readOnly ? undefined : () => onSelect?.(optionIndex)}
            className={`min-h-14 rounded-xl border-2 p-3.5 text-left text-sm font-semibold transition-colors sm:p-4 sm:text-base ${selectedIndex === optionIndex ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 hover:border-amber-300 dark:hover:border-amber-600"} ${readOnly ? "cursor-default" : ""}`}
          >
            <span className="mr-2 font-black">
              {String.fromCharCode(65 + optionIndex)}.
            </span>
            {audioOnly ? (
              <span className="sr-only">
                Lựa chọn {String.fromCharCode(65 + optionIndex)}
              </span>
            ) : (
              option
            )}
          </button>
        ))}
      </div>
    </article>
  );
}

export function ToeicGroupContext({
  group,
  isListening,
}: {
  group: {
    part: number;
    imageUrl?: string | null;
    passageText?: string | null;
  };
  isListening: boolean;
}) {
  if (!group.imageUrl && (isListening || !group.passageText)) return null;
  return (
    <div>
      {group.imageUrl && (
        <img
          src={group.imageUrl}
          alt={`Hình minh họa Part ${group.part}`}
          className="mx-auto mb-6 max-h-96 rounded-xl object-contain"
        />
      )}
      {!isListening && group.passageText && (
        <div className="mb-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 p-5 text-base leading-8 text-slate-800 dark:text-slate-100 sm:text-lg">
          {group.passageText}
        </div>
      )}
    </div>
  );
}
