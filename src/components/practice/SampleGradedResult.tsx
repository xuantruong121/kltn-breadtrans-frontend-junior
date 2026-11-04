"use client";

import { PracticeWritingDetail } from "@/components/writing/PracticeWritingDetail";
import { SAMPLE_SPEAKING, SAMPLE_WRITING } from "@/lib/practice/sampleGradedResult";

/**
 * A fixed sample of what grading returns, for a locked Speaking or Writing
 * item. Labelled as a sample: it is not the learner's work.
 */
export function SampleGradedResult({ skill }: { skill: "SPEAKING" | "WRITING" }) {
  return (
    <section
      aria-labelledby="sample-result-title"
      className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left dark:border-slate-700 dark:bg-slate-800/50"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 id="sample-result-title" className="text-sm font-bold text-slate-900 dark:text-slate-100">
          {skill === "SPEAKING" ? "Một bài nói được chấm sẽ trông thế này" : "Một bài viết được chấm sẽ trông thế này"}
        </h3>
        <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300">
          Bài mẫu
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
        Ví dụ minh hoạ, không phải bài của bạn. Điểm là chỉ số luyện tập nội bộ của BreadTrans, không phải điểm thi chính thức.
      </p>

      {skill === "SPEAKING" ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            <span className="font-semibold text-slate-900 dark:text-slate-100">Đề: </span>
            {SAMPLE_SPEAKING.prompt}
          </p>
          <p className="rounded-lg bg-white p-3 text-sm italic text-slate-800 dark:bg-slate-900 dark:text-slate-200">
            “{SAMPLE_SPEAKING.transcript}”
          </p>
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Điểm luyện Speaking: {SAMPLE_SPEAKING.overallScore}/10
          </p>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SAMPLE_SPEAKING.criteria.map((c) => (
              <div key={c.label} className="rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
                <dt className="text-xs text-slate-600 dark:text-slate-400">{c.label}</dt>
                <dd className="font-bold tabular-nums text-slate-900 dark:text-slate-100">{c.value}%</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm text-slate-700 dark:text-slate-300">{SAMPLE_SPEAKING.feedback}</p>
          <ul className="space-y-1 text-sm">
            {SAMPLE_SPEAKING.words.map((w) => (
              <li key={w.word} className="text-slate-700 dark:text-slate-300">
                <span className="rounded bg-amber-100 px-1 font-semibold text-amber-900 dark:bg-amber-950/50 dark:text-amber-300">
                  {w.word}
                </span>{" "}
                {w.score}% · {w.tip}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            <span className="font-semibold text-slate-900 dark:text-slate-100">Đề: </span>
            {SAMPLE_WRITING.prompt}
          </p>
          <p className="rounded-lg bg-white p-3 text-sm text-slate-800 dark:bg-slate-900 dark:text-slate-200">
            {SAMPLE_WRITING.answer}
          </p>
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Điểm luyện Writing: {SAMPLE_WRITING.score}/{SAMPLE_WRITING.maxScore}
          </p>
          <PracticeWritingDetail detail={SAMPLE_WRITING.detail} sample />
        </div>
      )}
    </section>
  );
}
