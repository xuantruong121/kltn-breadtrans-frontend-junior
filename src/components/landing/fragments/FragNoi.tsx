import {
  SPEAKING_RESULT,
  WORD_LEGEND,
  bandOf,
  formatDecimal,
  wordBandLabel,
  wordTitle,
  type WordBand,
} from "@/lib/landing/fragments";
import { FragmentCard, FragmentHeader } from "./FragmentCard";

/**
 * The word chips and legend of the speaking result screen
 * (src/app/(student)/speaking/[id]/page.tsx), with that screen's classes
 * and dark variants. A chip shows the word only; its title carries the band
 * and the score.
 */
const CHIP: Record<WordBand, string> = {
  pass: "border-emerald-300 bg-emerald-50 text-emerald-800 underline decoration-emerald-500 decoration-2 underline-offset-[6px] dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  fix: "border-amber-300 bg-amber-100/80 text-amber-900 underline decoration-amber-500 decoration-wavy decoration-2 underline-offset-[6px] dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  fail: "border-rose-300 bg-rose-50 text-rose-800 underline decoration-rose-500 decoration-wavy decoration-2 underline-offset-[6px] dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
  omit: "border-rose-300 bg-rose-50 text-rose-700 line-through decoration-rose-500 decoration-2 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-400",
};

const LEGEND: Record<WordBand, { dot: string; text: string }> = {
  pass: { dot: "bg-emerald-500", text: "text-emerald-800 underline decoration-emerald-500 decoration-2 underline-offset-4 dark:text-emerald-300" },
  fix: { dot: "bg-amber-500", text: "text-amber-900 underline decoration-amber-500 decoration-wavy underline-offset-4 dark:text-amber-300" },
  fail: { dot: "bg-rose-500", text: "text-rose-800 underline decoration-rose-500 decoration-wavy underline-offset-4 dark:text-rose-400" },
  omit: { dot: "bg-rose-500", text: "text-rose-700 line-through decoration-rose-500 decoration-2 dark:text-rose-400" },
};

const SUB_SCORES = [
  { label: "Chính xác", value: SPEAKING_RESULT.accuracy },
  { label: "Trôi chảy", value: SPEAKING_RESULT.fluency },
  { label: "Đầy đủ", value: SPEAKING_RESULT.completeness },
];

export function FragNoi() {
  const r = SPEAKING_RESULT;
  return (
    <FragmentCard ui="speaking-result" className="gap-[18px] p-6">
      <FragmentHeader title={r.title} meta={`${r.setLevel} · Kết quả chấm`} lang="en" />

      <dl className="grid grid-cols-2 gap-2 @md:grid-cols-4">
        <div className="flex flex-col gap-0.5 rounded-[14px] bg-amber-50 px-3 py-2.5 dark:bg-amber-950/40">
          <dt className="text-[13px] font-bold text-amber-800 dark:text-amber-300">Tổng</dt>
          <dd className="text-[24px] font-bold leading-[1.1] text-amber-900 dark:text-amber-200">
            {formatDecimal(r.overall)}
            <span className="text-[14px] text-amber-800 dark:text-amber-300">/10</span>
          </dd>
        </div>
        {SUB_SCORES.map((s) => (
          <div key={s.label} className="flex flex-col gap-0.5 rounded-[14px] bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60">
            <dt className="text-[13px] font-bold text-slate-500 dark:text-slate-400">{s.label}</dt>
            <dd className="text-[24px] font-bold leading-[1.1]">{s.value}</dd>
          </div>
        ))}
      </dl>

      <div role="group" aria-label="Câu đọc, tô màu theo điểm từng từ" lang="en" className="flex flex-wrap gap-1.5">
        {r.words.map((word, index) => (
          <span
            key={index}
            title={wordTitle(word)}
            className={`inline-block rounded-[14px] border px-2.5 pt-[3px] pb-1.5 text-[16px] font-bold ${CHIP[bandOf(word)]}`}
          >
            {word.text}
            <span className="sr-only" lang="vi">{`, ${wordBandLabel(word)}`}</span>
          </span>
        ))}
      </div>

      <div
        role="note"
        aria-label="Chú thích màu sắc phát âm"
        className="flex flex-wrap gap-x-[18px] gap-y-2 border-t border-slate-100 pt-3.5 text-[13px] font-bold dark:border-slate-800"
      >
        {WORD_LEGEND.map((item) => (
          <span key={item.band} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className={`size-2.5 rounded-full ${LEGEND[item.band].dot}`} />
            <span className={LEGEND[item.band].text}>{item.label}</span>
          </span>
        ))}
      </div>
    </FragmentCard>
  );
}
