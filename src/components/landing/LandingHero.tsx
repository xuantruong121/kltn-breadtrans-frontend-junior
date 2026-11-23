"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play, Square } from "lucide-react";
import { revealProps } from "@/lib/landing/motion";
import {
  DEMO,
  SCORE_BAND_LABEL,
  chipBandLabel,
  chipText,
  chunkWords,
  litChunks,
  readingRun,
  runOfEachWord,
  scoreBand,
  type ScoreBand,
  type WordChunk,
} from "@/lib/landing/speakingDemo";
import { Loaf } from "./Loaf";
import type { LandingActions } from "./types";
import { useLandingReducedMotion } from "./useLandingReducedMotion";

/** The 18 words in six runs, one run per cut on the loaf. */
const CHUNKS: WordChunk[] = chunkWords(DEMO.words, 6);
const ALL_LIT = CHUNKS.length;
/** For each word chip, the cut that lights while it is read. */
const RUN_OF_WORD = runOfEachWord(CHUNKS);

const OVERALL = String(DEMO.overall).replace(".", ",");
const PASSED = DEMO.words.filter((w) => scoreBand(w.score) === "pass").length;
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

/** Slow settle for the loaf as it slides in (expo out). */
const LOAF_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/*
 * Geometry (spec 6.3, sheet "Giant cropped shape"). Every size is in vw so the
 * loaf, its cuts and the demo controls keep the same relation at any width;
 * the numbers were checked against the stadium outline from 360 to 2560px.
 *
 * Only the play button (white on its dark fill) rides on the orange; every
 * other text sits on the white panel (owner feedback #6). The cuts carry no
 * words: they light in step with the audio, and the panel's chips show the
 * sentence (owner feedback #7).
 *
 * - Phone: the loaf sits under the copy, 130vw wide, cropped left, right and
 *   bottom. The play button rides on its upper band, above the cuts (spec
 *   6.3); the panel follows under the loaf, on the page. At 390x844 the button
 *   ends above MobileBottomNav on the first screen.
 * - 640-1023: the same, at 116vw.
 * - 1024 and up: the loaf enters from the right at 47vw, centred on the
 *   section's height. The button and the panel sit straight above the six
 *   cuts, one group in the middle of the visible orange. The text is in px
 *   and the loaf in vw, so GROUP places the group with px and vw together.
 *   Checked at 1024x768, 1280x800, 1366x768, 1440x900, 1536x864 and
 *   1920x1080/950, and in short windows down to 600px tall (HERO_HEIGHT): the
 *   button and the panel stay on the orange and every cut stays on the loaf.
 *   The Loaf internals are reached by class (`landing-loaf__…`), the only way
 *   to size them without editing Loaf.tsx or landing.css.
 */
const LOAF_BOX =
  "absolute top-0 m-0 left-[-15vw] w-[130vw] h-[102vw] " +
  "sm:left-[-8vw] sm:w-[116vw] sm:h-[76vw] " +
  // Taller than 58vw only where the section is (1024x768: 688px), up to 68vw: the
  // group needs that height at 1024, where its panel wraps to the most lines.
  // The top is half that height above the centre, so the loaf stays centred.
  "lg:left-[47vw] lg:top-[calc(50%_-_clamp(29vw,50%,34vw))] lg:w-[100vw] lg:h-[clamp(58vw,100%,68vw)]";

/** From 1024px: the four values that place the controls and the cut row as one group (the seam in two ranges). */
const GROUP = [
  // Cut height: no words to hold now, so the cuts are a short strip under the panel: 72px at 1024,
  // all the room the panel leaves there, growing to 160px from 1575px.
  "lg:[--cut-h:clamp(72px,16vw_-_92px,160px)]",
  // Left edge of the group in the loaf box: 133px at 1024, as far left as the button's corner stays on
  // the orange, and 213px at 1920; the group's middle lands 22-54px right of the visible orange's.
  "lg:[--col-l:calc(42px_+_8.93vw)]",
  // Width of the button and panel column: 37vw keeps a 31px right margin at 1024; 40rem (640px) is
  // where the 18 chips fit in three rows.
  "lg:[--col-w:min(37vw,40rem)]",
  // Top of the highest cut, below the loaf's centre line. 1024-1279: 175px down to 130px, where the
  // panel is tallest and the button's top-left corner meets the loaf's curve. From 1280, where the
  // chips fit in fewer rows: 130px down to 34px from 1600px, so the group's middle sits on the line.
  "lg:[--seam:clamp(130px,355px_-_17.6vw,175px)]",
  "xl:[--seam:clamp(34px,530px_-_31.25vw,130px)]",
].join(" ");

// String.raw keeps `\_` (an escaped underscore for Tailwind) in the runtime
// class too, so the class in the DOM matches the one Tailwind generated.
// Cut row: padding of `.landing-loaf__cuts` (% of the loaf width); each cut's
// width (% of the row), height (% of the loaf) and shift down (% of the cut).
// From 1024px the row is centred under the panel (padding = the column's edges),
// the cuts 4.5:1 and one cut width apart (gap), so the six span about 2.4 cut heights.
// translate-y 50% puts the cut's top on the loaf's centre line, then --seam moves it.
const LOAF_SHAPE = String.raw`h-full aspect-auto
  [&_.landing-loaf\_\_cuts]:px-[17%]
  lg:[&_.landing-loaf\_\_cuts]:justify-center
  lg:[&_.landing-loaf\_\_cuts]:gap-[calc(var(--cut-h)_/_4.5)]
  lg:[&_.landing-loaf\_\_cuts]:pl-(--col-l)
  lg:[&_.landing-loaf\_\_cuts]:pr-[calc(100%_-_var(--col-l)_-_var(--col-w))]
  [&_.landing-loaf\_\_cut]:w-[13%] [&_.landing-loaf\_\_cut]:h-[36%] [&_.landing-loaf\_\_cut]:translate-y-[25%]
  sm:[&_.landing-loaf\_\_cut]:w-[10%] sm:[&_.landing-loaf\_\_cut]:h-[38%] sm:[&_.landing-loaf\_\_cut]:translate-y-[30%]
  lg:[&_.landing-loaf\_\_cut]:w-[calc(var(--cut-h)_/_4.5)] lg:[&_.landing-loaf\_\_cut]:h-(--cut-h)
  lg:[&_.landing-loaf\_\_cut]:translate-y-[calc(50%_+_var(--seam))]`;

/**
 * From 1024px the hero fills the screen under the 5rem header, and is never shorter than the group
 * needs to stay on the loaf: 43rem (688px, the hero at 1024x768) under 1280px, where the panel
 * wraps to the most lines, and 40rem from 1280. A shorter window scrolls a little instead.
 */
const HERO_HEIGHT = "lg:max-xl:min-h-[max(calc(100svh_-_5rem),43rem)] xl:min-h-[max(calc(100svh_-_5rem),40rem)]";

/** From 1024px the button and the panel ride on the loaf, their bottom 12px above the highest cut. */
const CONTROLS = "absolute max-lg:hidden lg:left-(--col-l) lg:w-(--col-w) lg:bottom-[calc(50%_-_var(--seam)_+_12px)]";

/** Under 1024px only the play button rides on the loaf, on its upper band. */
const PLAY_ON_LOAF = "absolute lg:hidden left-[20.8%] top-[20%] sm:left-[17.2%] sm:top-[22%]";

export function LandingHero({ actions }: { actions: LandingActions }) {
  const reduced = useLandingReducedMotion();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  // At rest every cut is lit, so the server HTML, a visitor without
  // JavaScript and a reduced-motion visitor all see the whole loaf lit.
  const [lit, setLit] = useState(ALL_LIT);
  const [failed, setFailed] = useState(false);

  const rest = () => {
    setPlaying(false);
    setLit(ALL_LIT);
  };

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      rest();
      return;
    }
    setFailed(false);
    setPlaying(true);
    // Reduced motion: the audio plays, the cuts stay lit and nothing sweeps.
    setLit(reduced ? ALL_LIT : 0);
    audio.currentTime = 0;
    audio.play().catch((error: unknown) => {
      // pause() before playback started rejects with AbortError: a stop, not a failure.
      if (error instanceof DOMException && error.name === "AbortError") return;
      setFailed(true);
      rest();
    });
  };

  useEffect(() => {
    const audio = audioRef.current;
    return () => audio?.pause();
  }, []);

  const status = failed ? "Chưa phát được, hãy thử lại sau." : playing ? "Đang phát câu mẫu." : "";
  // While the cuts sweep, the chips of the run just lit are highlighted; at rest and
  // under reduced motion none is.
  const reading = playing && !reduced ? readingRun(lit, ALL_LIT) : -1;
  const panel = { failed, status, reading };

  return (
    <section
      aria-labelledby="landing-hero-title"
      className={`relative flex flex-col overflow-clip lg:justify-center ${HERO_HEIGHT}`}
    >
      <div className="landing-container relative z-[1] pt-[clamp(1rem,3svh,3rem)] sm:pt-16 lg:pointer-events-none lg:py-16">
        {/* --hero-col: what is left of 44vw after the container's own offset, so
            the copy always ends short of the loaf (its left edge is at 47vw). */}
        <div className="lg:pointer-events-auto lg:max-w-(--hero-col) lg:[--hero-col:min(40vw,calc(44vw_-_max(0px,(100vw_-_90rem)_/_2)_-_var(--gutter)))]">
          <h1
            id="landing-hero-title"
            className="landing-display landing-hero-title lg:text-[length:min(clamp(4rem,6.4vw,6.25rem),calc(var(--hero-col)_/_5.8))]"
          >
            <motion.span className="block" {...revealProps(reduced, 0)}>
              Nói một câu,
            </motion.span>{" "}
            <motion.span className="block" {...revealProps(reduced, 1)}>
              chấm từng từ
            </motion.span>
          </h1>
          <motion.p
            className="landing-body mt-4 max-w-[34rem] text-pretty sm:mt-5 lg:mt-6"
            {...revealProps(reduced, 2)}
          >
            Tự học tiếng Anh qua Nghe, Nói, Đọc, Viết với phản hồi ngay sau khi nộp, luyện đề theo cấu
            trúc TOEIC do BreadTrans biên soạn, bắt đầu miễn phí.
          </motion.p>
          <motion.div
            className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 sm:mt-7 lg:mt-9"
            {...revealProps(reduced, 3)}
          >
            <button type="button" className="landing-button" onClick={actions.register}>
              Bắt đầu học miễn phí
            </button>
            <button
              type="button"
              className="landing-link"
              onClick={() => actions.protectedGo("bài đánh giá đầu vào", "/diagnostic")}
            >
              Làm bài đánh giá đầu vào
            </button>
          </motion.div>
        </div>
      </div>

      {/* Under 1024px this box crops the loaf at its bottom edge, so the loaf does not
          run on under the score panel that follows it. */}
      <div className="relative mt-2 h-[84vw] overflow-clip sm:mt-10 sm:h-[70vw] lg:absolute lg:inset-0 lg:mt-0 lg:h-auto lg:overflow-visible">
        {/* Under reduced motion the [data-reveal] guard in landing.css pins this figure to
            its final place from the first paint, before useLandingReducedMotion turns true. */}
        <motion.figure
          className={`${LOAF_BOX} ${GROUP}`}
          data-reveal
          initial={reduced ? false : { opacity: 0, x: 56 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.1, delay: 0.15, ease: LOAF_EASE }}
        >
          <Loaf cuts={ALL_LIT} litCount={lit} className={LOAF_SHAPE} />
          <audio
            ref={audioRef}
            src={DEMO.audioSrc}
            preload="none"
            onTimeUpdate={(event) => {
              if (!playing || reduced) return;
              const audio = event.currentTarget;
              setLit(litChunks(audio.currentTime, audio.duration, CHUNKS));
            }}
            onEnded={rest}
            onPause={rest}
            onError={() => {
              setFailed(true);
              rest();
            }}
          />
          <figcaption className={CONTROLS}>
            <PlayButton playing={playing} onToggle={toggle} />
            <ScorePanel {...panel} className="mt-3" />
          </figcaption>
          <div className={PLAY_ON_LOAF}>
            <PlayButton playing={playing} onToggle={toggle} />
          </div>
        </motion.figure>
      </div>

      {/* Under 1024px the score panel follows the loaf, on the page. display: none from 1024px. */}
      <div className="landing-container relative z-[1] mt-6 lg:hidden">
        <ScorePanel {...panel} />
      </div>
    </section>
  );
}

/**
 * The play button, dark with a white label: the only text on the orange. In the
 * figcaption from 1024px, on the loaf's upper band under that. The copy not in
 * use is display: none, so a screen reader meets one.
 */
function PlayButton({ playing, onToggle }: { playing: boolean; onToggle: () => void }) {
  // The body step (18px) on a 48px pill under 1024px; from 1024px one step up, 20px on a 52px
  // pill with a 20px icon.
  return (
    <button
      type="button"
      onClick={onToggle}
      className="landing-body inline-flex min-h-12 flex-none items-center gap-2 rounded-full bg-(--on-lit) px-6 font-bold leading-tight text-(--on-loaf) transition-[background-color,scale] duration-150 ease-out hover:bg-(--crust) focus-visible:outline-(--on-lit) active:scale-[0.97] lg:min-h-13 lg:px-7 lg:text-[length:1.25rem]"
    >
      {playing ? (
        <Square aria-hidden="true" size={18} strokeWidth={2.25} fill="currentColor" className="lg:size-5" />
      ) : (
        <Play aria-hidden="true" size={18} strokeWidth={2.25} fill="currentColor" className="lg:size-5" />
      )}
      {playing ? "Dừng" : "Nghe câu mẫu"}
    </button>
  );
}

type ScorePanelProps = {
  failed: boolean;
  status: string;
  /** The run whose chips are highlighted, -1 for none. */
  reading: number;
  className?: string;
};

/**
 * The white panel: the overall score and how many words passed, the sentence as
 * 18 word chips in their band colours, and the three-band legend. On the loaf
 * from 1024px (under the play button), on the page under the loaf below that;
 * the copy not in use is display: none.
 */
function ScorePanel({ failed, status, reading, className = "" }: ScorePanelProps) {
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
          const on = RUN_OF_WORD[i] === reading;
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
