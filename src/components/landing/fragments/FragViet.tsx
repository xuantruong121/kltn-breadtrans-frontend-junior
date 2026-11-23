import {
  WRITING_PLACEHOLDER,
  WRITING_PROMPT,
  rangeLabel,
  titleWithoutSetCode,
  writingCounter,
  writingTarget,
} from "@/lib/landing/fragments";
import { FragmentCard, FragmentHeader } from "./FragmentCard";

/**
 * The writing prompt card before the learner writes: the task, an empty
 * answer area with the writing page's own placeholder, its word counter at 0
 * and its target line. No feedback is shown, since none was given. The
 * answer area is a picture of the app's, not a text box.
 */
export function FragViet() {
  const w = WRITING_PROMPT;
  return (
    <FragmentCard ui="writing-prompt" className="gap-3.5 p-6">
      <FragmentHeader title={titleWithoutSetCode(w.quiz)} meta={`Email · ${rangeLabel(w.wordRange)} từ`} lang="en" />

      <p className="rounded-2xl bg-slate-50 px-4 py-3.5 text-[16px] font-semibold leading-[1.6] text-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
        {w.prompt}
      </p>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[14px] font-bold text-slate-600 dark:text-slate-300">Bài viết của bạn</span>
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[15px] font-semibold tabular-nums text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {writingCounter(0, w.wordRange)}
          </span>
        </div>
        <div
          aria-hidden="true"
          lang="en"
          className="min-h-[182px] rounded-2xl border-[1.5px] border-slate-200 bg-white px-4 py-3.5 text-[16px] font-semibold leading-[1.6] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
        >
          {WRITING_PLACEHOLDER}
        </div>
        <span className="text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">{writingTarget(w.wordRange)}</span>
      </div>
    </FragmentCard>
  );
}
