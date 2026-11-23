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
 *   bottom, with the cut row in the middle of its visible part; the controls
 *   (button, score panel, caption) follow under the loaf, on the page, because
 *   the panel does not fit the loaf's band under 1024px. At 390x844 the words
 *   on the cuts end above MobileBottomNav on the first screen.
 * - 640-1023: the same, at 116vw.
 * - 1024 and up: the loaf enters from the right at 47vw, centred on the
 *   section's height; the six cuts sit on its visible left half, made shorter
 *   and moved down (translate on each cut) so the controls ride on the band
 *   above them. Checked from 1024x768 to 1920x1080: the controls stay on the
 *   orange and clear of the cuts. The Loaf internals are reached by class (`landing-loaf__…`),
 * the only way to size them without editing Loaf.tsx or landing.css.
 */
const LOAF_BOX =
  "absolute top-0 m-0 left-[-15vw] w-[130vw] h-[102vw] " +
  "sm:left-[-8vw] sm:w-[116vw] sm:h-[76vw] " +
  "lg:left-[47vw] lg:top-[calc(50%_-_29vw)] lg:w-[100vw] lg:h-[58vw]";

// String.raw keeps `\_` (an escaped underscore for Tailwind) in the runtime
// class too, so the class in the DOM matches the one Tailwind generated.
// Cut row: padding of `.landing-loaf__cuts` (% of the loaf width); each cut's
// width (% of the row), height (% of the loaf) and shift down (% of the cut).
const LOAF_SHAPE = String.raw`h-full aspect-auto
  [&_.landing-loaf\_\_cuts]:px-[17%]
  lg:[&_.landing-loaf\_\_cuts]:pl-[10%] lg:[&_.landing-loaf\_\_cuts]:pr-[50%]
  [&_.landing-loaf\_\_cut]:w-[13%] [&_.landing-loaf\_\_cut]:h-[36%] [&_.landing-loaf\_\_cut]:translate-y-[-10%]
  sm:[&_.landing-loaf\_\_cut]:w-[10%] sm:[&_.landing-loaf\_\_cut]:h-[38%] sm:[&_.landing-loaf\_\_cut]:translate-y-0
  lg:[&_.landing-loaf\_\_cut]:w-[9%] lg:[&_.landing-loaf\_\_cut]:h-[32%] lg:[&_.landing-loaf\_\_cut]:translate-y-[64%]`;

/** The controls on the loaf, from 1024px; under that they follow the loaf instead. */
const CONTROLS = "absolute max-lg:hidden lg:left-[19%] lg:w-[32%] lg:bottom-[49%]";

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
  const controls = { playing, failed, status, chips, resting: !sweeping, onToggle: toggle };

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
          run on under the controls that follow it. */}
      <div className="relative mt-2 h-[78vw] overflow-clip sm:mt-10 sm:h-[62vw] lg:absolute lg:inset-0 lg:mt-0 lg:h-auto lg:overflow-visible">
        <motion.figure
          className={LOAF_BOX}
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
            <DemoControls {...controls} onLoaf />
          </figcaption>
        </motion.figure>
      </div>

      {/* Under 1024px: the same controls under the loaf, on the page. display: none from 1024px. */}
      <div className="landing-container relative z-[1] mt-6 lg:hidden">
        <DemoControls {...controls} onLoaf={false} />
      </div>
    </section>
  );
}

type DemoControlsProps = {
  playing: boolean;
  failed: boolean;
  status: string;
  /** The words shown as chips: the run just lit, or the lowest words at rest. */
  chips: DemoWord[];
  resting: boolean;
  onToggle: () => void;
  /** On the orange loaf (dark text, dark button) or on the page (the page's ink). */
  onLoaf: boolean;
};

/**
 * Play button and overall score, the word chips on a white panel with the
 * three-band legend under them, and the caption. Rendered on the loaf from
 * 1024px and under it below that; the other copy is display: none, so a screen
 * reader meets one.
 */
function DemoControls({ playing, failed, status, chips, resting, onToggle, onLoaf }: DemoControlsProps) {
  const button = onLoaf
    ? "bg-(--on-lit) text-(--on-loaf) focus-visible:outline-(--on-lit)"
    : "bg-(--ink) text-(--bg)";
  return (
    <>
      <div className="flex items-center gap-x-4">
        <button
          type="button"
          onClick={onToggle}
          className={`landing-small inline-flex min-h-11 flex-none items-center gap-2 rounded-full px-5 font-bold transition-[background-color,scale] duration-150 ease-out hover:bg-(--crust) hover:text-(--on-loaf) active:scale-[0.97] ${button}`}
        >
          {playing ? (
            <Square aria-hidden="true" size={15} strokeWidth={2.25} fill="currentColor" />
          ) : (
            <Play aria-hidden="true" size={15} strokeWidth={2.25} fill="currentColor" />
          )}
          {playing ? "Dừng" : "Nghe câu mẫu"}
        </button>
        <p className="leading-tight">
          <span className="landing-small block">Điểm tổng</span>
          <strong className="landing-display block text-inherit text-(length:--type-lead)">{OVERALL}/10</strong>
        </p>
      </div>

      {/* A white panel: the chips and the legend keep the speaking screen's own colours,
          which do not read on orange. */}
      <div className="mt-3 rounded-2xl bg-white px-3 py-2.5 text-[#1c1917]">
        <p className="landing-small font-medium">{resting ? REST_LABEL : "Cụm đang đọc:"}</p>
        <p className="mt-1.5 flex flex-wrap gap-1.5">
          {chips.map((w, i) => {
            const band = BANDS[scoreBand(w.score)];
            return (
              <span
                key={i}
                className={`landing-small inline-flex items-baseline gap-1 rounded-full border px-2.5 py-0.5 font-bold leading-snug whitespace-nowrap tabular-nums ${band.chip}`}
              >
                {w.word.replace(/[.,!?;:]+$/, "")} {w.score}
              </span>
            );
          })}
        </p>
        <p
          role="note"
          aria-label="Chú thích màu điểm từng từ"
          className="landing-small mt-2 flex flex-wrap gap-x-3 gap-y-0.5 font-medium"
        >
          {BAND_ORDER.map((key) => (
            <span key={key} className={`inline-flex items-center gap-1.5 whitespace-nowrap ${BANDS[key].text}`}>
              <span aria-hidden="true" className={`size-2.5 rounded-full ${BANDS[key].dot}`} />
              {BANDS[key].label} {BANDS[key].range}
            </span>
          ))}
        </p>
      </div>

      <p className="landing-small mt-2 text-pretty">Điểm thật của một lượt luyện nói trên BreadTrans.</p>
      <p aria-live="polite" className={failed ? "landing-small mt-1 font-medium" : "sr-only"}>
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
 */
function CutWords({ chunk, on }: { chunk: WordChunk; on: boolean }) {
  return (
    <span
      aria-hidden="true"
      data-on={on}
      className="absolute top-1/2 left-1/2 w-max -translate-1/2 -rotate-66 font-medium leading-none whitespace-nowrap text-(--on-lit) text-(length:--type-small) opacity-0 transition-opacity duration-240 ease-out data-[on=true]:opacity-100 motion-reduce:transition-none sm:text-(length:--type-body)"
    >
      {chunk.words.map((w) => w.word).join(" ")}
    </span>
  );
}
