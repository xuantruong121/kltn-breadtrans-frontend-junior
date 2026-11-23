import { Check } from "lucide-react";
import { OPTION_LETTERS, QUESTION_TYPE_LABELS, READING_QUESTION } from "@/lib/landing/fragments";
import { FragmentCard, FragmentHeader } from "./FragmentCard";

/** "NOTICE: The library…" shows its lead word in bold, as the passage does in the app. */
const LEAD = /^([A-Z]+:)\s*([\s\S]*)$/;

/**
 * The reading question after answering: the notice, the question, the four
 * options with the right one marked, and why it is right.
 */
export function FragDoc() {
  const q = READING_QUESTION;
  const [, lead, rest] = LEAD.exec(q.passage) ?? [null, "", q.passage];
  const letter = OPTION_LETTERS[q.correctIndex];
  return (
    <FragmentCard ui="reading-question" className="gap-3.5 p-6">
      <FragmentHeader title={q.quiz} meta={`Câu 1 · ${QUESTION_TYPE_LABELS[q.questionType]}`} lang="en" />

      <p lang="en" className="rounded-2xl bg-slate-50 px-4 py-3.5 text-[15px] font-semibold leading-[1.55] text-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
        {lead ? <strong className="font-bold text-slate-800 dark:text-slate-100">{lead}</strong> : null} {rest}
      </p>

      <p lang="en" className="text-[18px] font-bold">
        {q.question}
      </p>

      <ul lang="en" className="grid grid-cols-1 gap-2 @md:grid-cols-2">
        {q.options.map((text, index) => {
          const correct = index === q.correctIndex;
          return (
            <li
              key={text}
              className={`flex min-h-12 items-center gap-2.5 rounded-2xl border-[1.5px] py-2 pr-3 pl-2 ${
                correct
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "border-slate-200 dark:border-slate-700"
              }`}
            >
              <span
                className={`grid size-[30px] flex-none place-items-center rounded-full text-[14px] font-bold ${
                  correct ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {OPTION_LETTERS[index]}
              </span>
              <span className="min-w-0 flex-1 text-[15px] font-semibold leading-[1.3]">{text}</span>
            </li>
          );
        })}
      </ul>

      <p className="flex items-start gap-2.5 rounded-2xl bg-emerald-50 px-3.5 py-3 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
        <Check size={18} strokeWidth={2.5} aria-hidden="true" className="mt-0.5 flex-none" />
        <span className="text-[15px] font-semibold leading-normal">
          <strong className="font-bold">Đáp án {letter}.</strong> <span lang="en">{q.explanation}</span>
        </span>
      </p>
    </FragmentCard>
  );
}
