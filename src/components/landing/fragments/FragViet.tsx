import { WRITING_PROMPT, rangeLabel } from "@/lib/landing/fragments";
import { FragmentCard, FragmentHeader } from "./FragmentCard";

/**
 * The writing prompt card before the learner writes: the task, an empty
 * answer area and the word counter at 0. No feedback is shown, since none
 * was given. The answer area is a picture of the app's, not a text box.
 */
export function FragViet() {
  const w = WRITING_PROMPT;
  const range = rangeLabel(w.wordRange);
  return (
    <FragmentCard ui="writing-prompt" className="gap-3.5 p-6">
      <FragmentHeader title={w.quiz} meta={`Email · ${range} từ`} lang="en" />

      <p className="rounded-2xl bg-slate-50 px-4 py-3.5 text-[16px] font-semibold leading-[1.6] text-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
        {w.prompt}
      </p>

      <div className="flex flex-col gap-2">
        <span className="text-[14px] font-bold text-slate-600 dark:text-slate-300">Bài viết của bạn</span>
        <div
          aria-hidden="true"
          lang="en"
          className="min-h-[182px] rounded-2xl border-[1.5px] border-slate-200 bg-white px-4 py-3.5 text-[16px] font-semibold leading-[1.6] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
        >
          Dear Organising Team,
        </div>
        <div className="flex items-center justify-between gap-3 text-[13px] font-bold text-slate-500 dark:text-slate-400">
          <span>{`Số từ: 0 / ${range}`}</span>
          <span>Chưa nộp</span>
        </div>
      </div>
    </FragmentCard>
  );
}
