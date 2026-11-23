import { Check, Play } from "lucide-react";
import { LISTENING_QUESTION, OPTION_LETTERS, titleWithoutSetCode } from "@/lib/landing/fragments";
import { TERMS } from "@/lib/ui/terms";
import { FragmentCard, FragmentHeader } from "./FragmentCard";

/**
 * The listening question card after answering: the clip played through, the
 * question, and the four options with the right one marked. The play control
 * is a picture of the app's, not a working player.
 */
export function FragNghe() {
  const q = LISTENING_QUESTION;
  return (
    <FragmentCard ui="listening-question" className="gap-4 p-6">
      <FragmentHeader title={titleWithoutSetCode(q.quiz)} meta="Câu 1" lang="en" />

      <div className="flex items-center gap-3.5 rounded-[18px] bg-blue-50 py-2.5 pr-3.5 pl-2.5 dark:bg-blue-950/40">
        <span aria-hidden="true" className="grid size-11 flex-none place-items-center rounded-full bg-blue-600 text-white">
          <Play size={18} strokeWidth={2} fill="currentColor" />
        </span>
        <span aria-hidden="true" className="h-1.5 min-w-0 flex-1 rounded-full bg-blue-600" />
        <span className="flex-none text-[13px] font-bold text-blue-800 dark:text-blue-300">Đã nghe</span>
      </div>

      <p className="text-[15px] font-semibold leading-normal text-slate-600 dark:text-slate-300">
        {TERMS.transcript}: <span lang="en">“{q.spoken}”</span>
      </p>

      <p lang="en" className="text-[18px] font-bold">
        {q.question}
      </p>

      <ul lang="en" className="flex flex-col gap-2">
        {q.options.map((text, index) => {
          const correct = index === q.correctIndex;
          return (
            <li
              key={text}
              className={`flex min-h-12 items-center gap-3 rounded-2xl border-[1.5px] py-2 pr-3.5 pl-2 ${
                correct
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "border-slate-200 dark:border-slate-700"
              }`}
            >
              <span
                className={`grid size-8 flex-none place-items-center rounded-full text-[14px] font-bold ${
                  correct ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {OPTION_LETTERS[index]}
              </span>
              <span className="flex-1 text-[16px] font-semibold">{text}</span>
              {correct ? (
                <span lang="vi" className="inline-flex flex-none items-center gap-1 text-[13px] font-bold text-emerald-700 dark:text-emerald-300">
                  <Check size={16} strokeWidth={2.5} aria-hidden="true" />
                  Đáp án đúng
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </FragmentCard>
  );
}
