import {
  DEMO,
  SCORE_BAND_LABEL,
  chipBandLabel,
  chipText,
  passesStandard,
  scoreBand,
  type ScoreBand,
} from "@/lib/landing/speakingDemo";

const OVERALL = String(DEMO.overall).replace(".", ",");
/** "Đạt chuẩn" as the result screen counts it: 80 or more and errorType "None". */
const PASSED = DEMO.words.filter(passesStandard).length;
const PASS_LABEL = `${PASSED}/${DEMO.words.length} từ đạt chuẩn`;

/**
 * The word bands of the speaking result screen: its thresholds (scoreBand,
 * from getAccuracyTier), its legend words and its chip colours (the word chips
 * and the legend of src/app/(student)/speaking/[id]/page.tsx). The amber chip is
 * solid here (amber-100, not /80) so nothing of the orange shows through. The
 * chips keep these light colours in dark mode too: they sit on a white panel.
 * `reading` is the same band filled solid, for the chips of the run being read
 * (white on emerald-700 and rose-700, amber-950 on amber-400: all above 4.5:1).
 */
const BANDS: Record<ScoreBand, { range: string; chip: string; reading: string; dot: string; text: string }> = {
  pass: {
    range: "≥ 80",
    chip: "border-emerald-300 bg-emerald-50 text-emerald-800",
    reading: "border-emerald-700 bg-emerald-700 text-white",
    dot: "bg-emerald-500",
    text: "text-emerald-800",
  },
  fix: {
    range: "60–79",
    chip: "border-amber-300 bg-amber-100 text-amber-900",
    reading: "border-amber-500 bg-amber-400 text-amber-950",
    dot: "bg-amber-500",
    text: "text-amber-900",
  },
  fail: {
    range: "< 60",
    chip: "border-rose-300 bg-rose-50 text-rose-800",
    reading: "border-rose-700 bg-rose-700 text-white",
    dot: "bg-rose-500",
    text: "text-rose-800",
  },
};
const BAND_ORDER: ScoreBand[] = ["pass", "fix", "fail"];

type HeroScorePanelProps = {
  /** For each word chip, the run (one per cut on the loaf) it belongs to. */
  runOfWord: number[];
  failed: boolean;
  status: string;
  /** The run whose chips are highlighted, -1 for none. */
  reading: number;
  className?: string;
};

/**
 * The hero's white panel: the overall score and how many words passed, the
 * sentence as 18 word chips in their band colours, and the three-band legend.
 * On the loaf from 1024px (under the play button), on the page under the loaf
 * below that; LandingHero renders both, and the copy not in use is display: none.
 */
export function HeroScorePanel({ runOfWord, failed, status, reading, className = "" }: HeroScorePanelProps) {
  // Sizes, one step up from the 18px body step: 19px (1.1875rem) for the label, the
  // pass count and the legend, 20px (1.25rem) for the chips, 32px (2rem) for the score.
  // Spacing scaled up with them from Task 8's 12px panel: 16px sides, 14px top and
  // bottom, 12px between the rows.
  return (
    <div className={`rounded-2xl bg-white px-4 py-3.5 text-[#1c1917] ${className}`}>
      <div className="flex flex-wrap items-end gap-x-5 gap-y-1">
        <p className="leading-none">
          <span className="block text-[length:1.1875rem] font-medium leading-tight">Điểm tổng</span>
          <strong className="landing-display mt-1 block text-inherit text-[length:2rem]">{OVERALL}/10</strong>
        </p>
        <p className="text-[length:1.1875rem] leading-tight font-medium">{PASS_LABEL}</p>
      </div>

      {/* The chips show the words only; the title and the screen-reader text carry the band
          and the score, as the speaking result fragment does. px-2 and a 4px gap fit the
          18 chips in four rows of the 347px panel at 1024. */}
      <p role="group" aria-label="Câu mẫu, tô màu theo điểm từng từ" lang="en" className="mt-3 flex flex-wrap gap-1">
        {DEMO.words.map((w, i) => {
          const band = BANDS[scoreBand(w.score)];
          const on = runOfWord[i] === reading;
          return (
            <span
              key={i}
              title={`${chipText(w)}: ${chipBandLabel(w)}`}
              data-reading={on || undefined}
              className={`inline-block rounded-full border px-2 py-0.5 text-[length:1.25rem] font-bold leading-tight whitespace-nowrap ${on ? band.reading : band.chip}`}
            >
              {chipText(w)}
              <span className="sr-only" lang="vi">{`, ${chipBandLabel(w)}`}</span>
            </span>
          );
        })}
      </p>

      <p
        role="note"
        aria-label="Chú thích màu điểm từng từ"
        className="mt-3 flex flex-wrap gap-x-3 gap-y-0.5 text-[length:1.1875rem] leading-normal font-medium"
      >
        {BAND_ORDER.map((key) => (
          <span key={key} className={`inline-flex items-center gap-1.5 whitespace-nowrap ${BANDS[key].text}`}>
            <span aria-hidden="true" className={`size-2.5 rounded-full ${BANDS[key].dot}`} />
            {SCORE_BAND_LABEL[key]} {BANDS[key].range}
          </span>
        ))}
      </p>

      <p aria-live="polite" className={failed ? "mt-2 text-[length:1.1875rem] leading-normal font-medium" : "sr-only"}>
        {status}
      </p>
    </div>
  );
}
