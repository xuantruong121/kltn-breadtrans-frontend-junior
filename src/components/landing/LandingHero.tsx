"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play, Square } from "lucide-react";
import { revealProps } from "@/lib/landing/motion";
import {
  DEMO,
  chunkWords,
  litChunks,
  lowestWords,
  scoreBand,
  type DemoWord,
  type ScoreBand,
  type WordChunk,
} from "@/lib/landing/speakingDemo";
import { Loaf } from "./Loaf";
import type { LandingActions } from "./types";
import { useLandingReducedMotion } from "./useLandingReducedMotion";

/** The 18 words in six runs, one run per cut on the loaf. */
const CHUNKS: WordChunk[] = chunkWords(DEMO.words, 6);
const ALL_LIT = CHUNKS.length;

const OVERALL = String(DEMO.overall).replace(".", ",");
const SPOKEN_SCORES = DEMO.words.map((w) => `${w.word} ${w.score}`).join(", ");
/** At rest, without JavaScript and under reduced motion: how many words passed, then the lowest ones. */
const PASSED = DEMO.words.filter((w) => scoreBand(w.score) === "pass").length;
const REST_LABEL = `${PASSED}/${DEMO.words.length} từ đạt chuẩn. Thấp nhất:`;
const LOWEST = lowestWords(DEMO.words);

/**
 * The word bands of the speaking result screen: its thresholds (scoreBand,
 * from getAccuracyTier), its legend words and its chip colours (the word chips
 * and the legend of src/app/(student)/speaking/[id]/page.tsx). The amber chip is
 * solid here (amber-100, not /80) so nothing of the orange shows through. The
 * chips keep these light colours in dark mode too: they sit on a white panel.
 */
const BANDS: Record<ScoreBand, { label: string; range: string; chip: string; dot: string; text: string }> = {
  pass: {
    label: "Đạt chuẩn",
    range: "≥ 80",
    chip: "border-emerald-300 bg-emerald-50 text-emerald-800",
    dot: "bg-emerald-500",
    text: "text-emerald-800",
  },
  fix: {
    label: "Cần chỉnh lại",
    range: "60–79",
    chip: "border-amber-300 bg-amber-100 text-amber-900",
    dot: "bg-amber-500",
    text: "text-amber-900",
  },
  fail: {
    label: "Chưa đạt",
    range: "< 60",
    chip: "border-rose-300 bg-rose-50 text-rose-800",
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
 * - Phone: the loaf sits under the copy, 130vw wide, cropped left, right and
 *   bottom. The play button and the overall score ride on its upper band,
 *   above the cuts (spec 6.3); the score panel and the caption follow under
 *   the loaf, on the page, because they do not fit the band under 1024px. At
 *   390x844 the button and the words on the cuts end above MobileBottomNav on
 *   the first screen.
 * - 640-1023: the same, at 116vw.
 * - 1024 and up: the loaf enters from the right at 47vw, centred on the
 *   section's height. The controls sit straight above the six cuts, one group
 *   in the middle of the visible orange (owner feedback #5). The text is in px
 *   and the loaf in vw, so GROUP places the group with px and vw together.
 *   Checked at 1024x768, 1280x800, 1366x768, 1440x900, 1536x864 and
 *   1920x1080/950: the controls stay on the orange, every cut stays on the
 *   loaf and every word inside its cut. The Loaf internals are reached by
 *   class (`landing-loaf__…`), the only way to size them without editing
 *   Loaf.tsx or landing.css.
 */
const LOAF_BOX =
  "absolute top-0 m-0 left-[-15vw] w-[130vw] h-[102vw] " +
  "sm:left-[-8vw] sm:w-[116vw] sm:h-[76vw] " +
  // Taller than 58vw only where the section is (1024x768: 688px), up to 68vw: the
  // group needs that height at 1024, where its controls wrap to the most lines.
  "lg:left-[47vw] lg:top-[calc(50%_-_clamp(29vw,50%,34vw))] lg:w-[100vw] lg:h-[clamp(58vw,100%,68vw)]";

/** From 1024px: the four values that place the controls and the cut row as one group. */
const GROUP = [
  // Cut height: 196px holds the longest run ("Friday from eight") at 21px with 5px to spare.
  "lg:[--cut-h:clamp(196px,14vw,240px)]",
  // Left edge of the group in the loaf box: 184px at 1024, 261px at 1920, the middle of the visible orange.
  "lg:[--col-l:calc(96px_+_8.6vw)]",
  // Width of the controls column; the cut tops span the same width under it.
  "lg:[--col-w:min(31vw,34rem)]",
  // Top of the highest cut against the loaf's centre line: 42px below at 1024 (the controls are
  // tallest there), 61px above at 1920 (the cut row is the taller half), so the group stays centred.
  "lg:[--seam:clamp(-61px,160px_-_11.5vw,42px)]",
].join(" ");

// String.raw keeps `\_` (an escaped underscore for Tailwind) in the runtime
// class too, so the class in the DOM matches the one Tailwind generated.
// Cut row: padding of `.landing-loaf__cuts` (% of the loaf width); each cut's
// width (% of the row), height (% of the loaf) and shift down (% of the cut).
// From 1024px the row spans the controls column, each cut's top 0.22 of its height
// (tan 24deg / 2, the lean) right of its box, and the cut keeps a 5.2:1 shape.
// translate-y 50% puts the cut's top on the loaf's centre line, then --seam moves it.
const LOAF_SHAPE = String.raw`h-full aspect-auto
  [&_.landing-loaf\_\_cuts]:px-[17%]
  lg:[&_.landing-loaf\_\_cuts]:justify-between
  lg:[&_.landing-loaf\_\_cuts]:pl-[calc(var(--col-l)_-_var(--cut-h)_*_0.22)]
  lg:[&_.landing-loaf\_\_cuts]:pr-[calc(100%_-_var(--col-l)_-_var(--col-w)_+_var(--cut-h)_*_0.22)]
  [&_.landing-loaf\_\_cut]:w-[13%] [&_.landing-loaf\_\_cut]:h-[36%] [&_.landing-loaf\_\_cut]:translate-y-[25%]
  sm:[&_.landing-loaf\_\_cut]:w-[10%] sm:[&_.landing-loaf\_\_cut]:h-[38%] sm:[&_.landing-loaf\_\_cut]:translate-y-[30%]
  lg:[&_.landing-loaf\_\_cut]:w-[calc(var(--cut-h)_/_5.2)] lg:[&_.landing-loaf\_\_cut]:h-(--cut-h)
  lg:[&_.landing-loaf\_\_cut]:translate-y-[calc(50%_+_var(--seam))]`;

/** From 1024px every control rides on the loaf, its bottom 12px above the highest cut. */
const CONTROLS = "absolute max-lg:hidden lg:left-(--col-l) lg:w-(--col-w) lg:bottom-[calc(50%_-_var(--seam)_+_12px)]";

/** Under 1024px only the play button and the overall score ride on the loaf, on its upper band. */
const PLAY_ON_LOAF = "absolute lg:hidden left-[20.8%] top-[20%] sm:left-[17.2%] sm:top-[22%]";

export function LandingHero({ actions }: { actions: LandingActions }) {
  const reduced = useLandingReducedMotion();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  // At rest every cut is lit, so the server HTML, a visitor without
  // JavaScript and a reduced-motion visitor all see the whole scored sentence.
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
  // While the cuts sweep, the chips are the run just lit; otherwise the lowest words.
  const sweeping = playing && !reduced;
  const chips = sweeping ? CHUNKS[Math.max(0, lit - 1)].words : LOWEST;
  const panel = { failed, status, chips, resting: !sweeping };

  return (
    <section
      aria-labelledby="landing-hero-title"
      className="relative flex flex-col overflow-clip lg:min-h-[calc(100svh_-_5rem)] lg:justify-center"
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
        <motion.figure
          className={`${LOAF_BOX} ${GROUP}`}
          data-reveal
          initial={reduced ? false : { opacity: 0, x: 56 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.1, delay: 0.15, ease: LOAF_EASE }}
        >
          <Loaf
            cuts={ALL_LIT}
            litCount={lit}
            className={LOAF_SHAPE}
            renderCut={(index, on) => <CutWords chunk={CHUNKS[index]} on={on} />}
          />
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
          {/* Text on the loaf uses --on-lit (dark in both themes): white on this
              orange is under 4.5:1 for text this size. */}
          <figcaption className={`${CONTROLS} text-(--on-lit)`}>
            <PlayRow playing={playing} onToggle={toggle} />
            <ScorePanel {...panel} className="mt-3" />
          </figcaption>
          <div className={`${PLAY_ON_LOAF} text-(--on-lit)`}>
            <PlayRow playing={playing} onToggle={toggle} />
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
 * The play button and the overall score. Always on the orange loaf (dark text,
 * dark button): in the figcaption from 1024px, on the loaf's upper band under
 * that. The copy not in use is display: none, so a screen reader meets one.
 */
function PlayRow({ playing, onToggle }: { playing: boolean; onToggle: () => void }) {
  // From 640px the row reads at the body step (18px), with a 48px button and an 18px icon to match;
  // under 640 it stays at 15px, where the larger score would touch the sixth cut at 360px.
  return (
    <div className="flex items-center gap-x-4">
      <button
        type="button"
        onClick={onToggle}
        className="landing-small inline-flex min-h-11 flex-none items-center gap-2 rounded-full bg-(--on-lit) px-5 font-bold text-(--on-loaf) transition-[background-color,scale] duration-150 ease-out hover:bg-(--crust) focus-visible:outline-(--on-lit) active:scale-[0.97] sm:min-h-12 sm:px-6 sm:text-(length:--type-body)"
      >
        {playing ? (
          <Square aria-hidden="true" size={15} strokeWidth={2.25} fill="currentColor" className="sm:size-[18px]" />
        ) : (
          <Play aria-hidden="true" size={15} strokeWidth={2.25} fill="currentColor" className="sm:size-[18px]" />
        )}
        {playing ? "Dừng" : "Nghe câu mẫu"}
      </button>
      <p className="leading-tight">
        <span className="landing-small block sm:text-(length:--type-body) sm:leading-tight">Điểm tổng</span>
        <strong className="landing-display block text-inherit text-(length:--type-lead)">{OVERALL}/10</strong>
      </p>
    </div>
  );
}

type ScorePanelProps = {
  failed: boolean;
  status: string;
  /** The words shown as chips: the run just lit, or the lowest words at rest. */
  chips: DemoWord[];
  resting: boolean;
  className?: string;
};

/**
 * The word chips on a white panel with the three-band legend under them, the
 * caption, the play status and the full scores for screen readers. On the
 * loaf from 1024px (under the play row), on the page under the loaf below that;
 * the copy not in use is display: none.
 */
function ScorePanel({ failed, status, chips, resting, className = "" }: ScorePanelProps) {
  return (
    <>
      {/* A white panel: the chips and the legend keep the speaking screen's own colours,
          which do not read on orange. Its text is at the body step (18px) at every width;
          from 1024px it is as wide as its longest line, so it does not run past the cut row. */}
      <div className={`rounded-2xl bg-white px-3 py-2.5 text-[#1c1917] lg:w-fit ${className}`}>
        <p className="landing-body leading-normal font-medium">{resting ? REST_LABEL : "Cụm đang đọc:"}</p>
        <p className="mt-1.5 flex flex-wrap gap-1.5">
          {chips.map((w, i) => {
            const band = BANDS[scoreBand(w.score)];
            return (
              <span
                key={i}
                className={`landing-body inline-flex items-baseline gap-1 rounded-full border px-2.5 py-0.5 font-bold leading-snug whitespace-nowrap tabular-nums ${band.chip}`}
              >
                {w.word.replace(/[.,!?;:]+$/, "")} {w.score}
              </span>
            );
          })}
        </p>
        <p
          role="note"
          aria-label="Chú thích màu điểm từng từ"
          className="landing-body leading-normal mt-2 flex flex-wrap gap-x-3 gap-y-0.5 font-medium"
        >
          {BAND_ORDER.map((key) => (
            <span key={key} className={`inline-flex items-center gap-1.5 whitespace-nowrap ${BANDS[key].text}`}>
              <span aria-hidden="true" className={`size-2.5 rounded-full ${BANDS[key].dot}`} />
              {BANDS[key].label} {BANDS[key].range}
            </span>
          ))}
        </p>
      </div>

      <p className="landing-body leading-normal mt-2 text-pretty">Điểm thật của một lượt luyện nói trên BreadTrans.</p>
      <p aria-live="polite" className={failed ? "landing-body leading-normal mt-1 font-medium" : "sr-only"}>
        {status}
      </p>
      <p className="sr-only">{`Câu mẫu: ${DEMO.sentence} Điểm từng từ, thang 100: ${SPOKEN_SCORES}.`}</p>
    </>
  );
}

/**
 * The words of one run, written along the cut (it leans 66deg inside the loaf).
 * Centred by position, not by the cut's grid, which would start-align text
 * longer than the cut is wide. Shown only while the cut is lit. The scores sit
 * on their own line in the caption; screen readers get every score there too.
 * From 1024px the words are 21px (1.3125rem, the 18px body step plus a sixth),
 * which --cut-h is sized to hold.
 */
function CutWords({ chunk, on }: { chunk: WordChunk; on: boolean }) {
  return (
    <span
      aria-hidden="true"
      data-on={on}
      className="absolute top-1/2 left-1/2 w-max -translate-1/2 -rotate-66 font-medium leading-none whitespace-nowrap text-(--on-lit) text-(length:--type-small) opacity-0 transition-opacity duration-240 ease-out data-[on=true]:opacity-100 motion-reduce:transition-none sm:text-(length:--type-body) lg:text-[length:1.3125rem]"
    >
      {chunk.words.map((w) => w.word).join(" ")}
    </span>
  );
}
