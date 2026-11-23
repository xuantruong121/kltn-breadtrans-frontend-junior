"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play, Square } from "lucide-react";
import { revealProps } from "@/lib/landing/motion";
import { DEMO, chunkWords, litChunks, type WordChunk } from "@/lib/landing/speakingDemo";
import { Loaf } from "./Loaf";
import type { LandingActions } from "./types";
import { useLandingReducedMotion } from "./useLandingReducedMotion";

/** The 18 words in six runs, one run per cut on the loaf. */
const CHUNKS: WordChunk[] = chunkWords(DEMO.words, 6);
const ALL_LIT = CHUNKS.length;

const OVERALL = String(DEMO.overall).replace(".", ",");
const SPOKEN_SCORES = DEMO.words.map((w) => `${w.word} ${w.score}`).join(", ");

/** Slow settle for the loaf as it slides in (expo out). */
const LOAF_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/*
 * Geometry (spec 6.3, sheet "Giant cropped shape"). Every size is in vw so the
 * loaf, its cuts and the demo controls keep the same relation at any width;
 * the numbers were checked against the stadium outline from 360 to 2560px.
 *
 * - Phone: the loaf sits under the copy, 130vw wide, cropped left, right and
 *   bottom; the controls ride on its upper band, above the cuts. The top
 *   padding, the gap above the loaf and the cut shift are kept small so that at
 *   390x844 the scored words end above MobileBottomNav on the first screen.
 * - 640-1023: the same, at 116vw.
 * - 1024 and up: the loaf enters from the right at 47vw, centred on the
 *   section's height; the six cuts sit on its visible left half.
 *
 * The cut row is moved down (translate on each cut) to free the band above it
 * for the controls. The Loaf internals are reached by class (`landing-loaf__…`),
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
  [&_.landing-loaf\_\_cut]:w-[13%] [&_.landing-loaf\_\_cut]:h-[36%] [&_.landing-loaf\_\_cut]:translate-y-[40%]
  sm:[&_.landing-loaf\_\_cut]:w-[10%] sm:[&_.landing-loaf\_\_cut]:h-[38%] sm:[&_.landing-loaf\_\_cut]:translate-y-[39.5%]
  lg:[&_.landing-loaf\_\_cut]:w-[9%] lg:[&_.landing-loaf\_\_cut]:h-[42%] lg:[&_.landing-loaf\_\_cut]:translate-y-[21.4%]`;

const CONTROLS =
  "absolute left-[20.8%] w-[58.5%] bottom-[60.8%] " +
  "sm:left-[17.2%] sm:w-1/2 sm:bottom-[61.3%] " +
  "lg:left-[19%] lg:w-[30%] lg:bottom-[64.5%]";

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

  // Kept to one line on a 360px phone: the controls grow upward on the loaf.
  const status = failed ? "Chưa phát được, hãy thử lại sau." : playing ? "Đang phát câu mẫu." : "";

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

      <div className="relative mt-2 h-[100vw] sm:mt-10 sm:h-[72vw] lg:absolute lg:inset-0 lg:mt-0 lg:h-auto">
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
            <div className="flex items-center gap-x-4">
              <button
                type="button"
                onClick={toggle}
                className="landing-small inline-flex min-h-11 flex-none items-center gap-2 rounded-full bg-(--on-lit) px-5 font-bold text-(--on-loaf) transition-[background-color,scale] duration-150 ease-out hover:bg-(--crust) focus-visible:outline-(--on-lit) active:scale-[0.97]"
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
                <strong className="landing-display block text-(length:--type-lead) text-(--on-lit)">
                  {OVERALL}/10
                </strong>
              </p>
            </div>
            <p className="landing-small mt-2 text-pretty">Câu mẫu và điểm từng từ từ một lượt nộp trong BreadTrans.</p>
            <p aria-live="polite" className={failed ? "landing-small mt-1 font-medium" : "sr-only"}>
              {status}
            </p>
            <p className="sr-only">
              {`Câu mẫu: ${DEMO.sentence} Điểm từng từ, thang 100: ${SPOKEN_SCORES}.`}
            </p>
          </figcaption>
        </motion.figure>
      </div>
    </section>
  );
}

/**
 * The words of one run and their scores, written along the cut (it leans 66deg
 * inside the loaf). Centred by position, not by the cut's grid, which would
 * start-align text longer than the cut is wide. Under 1024px a cut is too short
 * for one line, so each score sits under its word. Shown only while the cut is
 * lit; screen readers get the same data from the caption.
 */
function CutWords({ chunk, on }: { chunk: WordChunk; on: boolean }) {
  return (
    <span
      aria-hidden="true"
      data-on={on}
      className="absolute top-1/2 left-1/2 flex w-max -translate-1/2 -rotate-66 gap-x-[0.35em] leading-none text-(--on-lit) text-(length:--type-small) opacity-0 transition-opacity duration-240 ease-out data-[on=true]:opacity-100 motion-reduce:transition-none sm:text-(length:--type-body) lg:gap-x-[0.55em] lg:text-(length:--type-small) xl:text-(length:--type-body)"
    >
      {chunk.words.map((w, i) => (
        <span key={i} className="flex flex-col items-center gap-y-[0.15em] lg:flex-row lg:items-baseline lg:gap-x-[0.3em]">
          <span className="font-medium">{w.word}</span>
          <span className="font-bold tabular-nums">{w.score}</span>
        </span>
      ))}
    </span>
  );
}
