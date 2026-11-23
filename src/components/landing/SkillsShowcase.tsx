"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { motion, useAnimate, useInView } from "framer-motion";
import { LANDING_IMAGES, LANDING_VIDEO } from "@/lib/landing/assets";
import {
  CROPS,
  SKILLS,
  SKILLS_TITLE,
  STAGE_VIDEO_KEY,
  VIDEO_CROP,
  cropMedia,
  cropRatio,
  fitWidth,
  stepIndex,
  type Crop,
} from "@/lib/landing/content";
import { REVEAL_EASE, revealProps } from "@/lib/landing/motion";
import { Loaf } from "./Loaf";
import type { LandingActions } from "./types";
import { prefersReducedMotion, useLandingReducedMotion } from "./useLandingReducedMotion";

/** The page colour of the app behind the screenshots: the margin of the screen on the loaf. */
const SCREEN_PAPER = "#fcfaf8";

/** The signature move (spec 6.6): the stage opens from its left edge, once. */
const SHUTTER_CLOSED = "inset(0% 100% 0% 0%)";
const SHUTTER_OPEN = "inset(0% 0% 0% 0%)";
const SHUTTER_EASE: [number, number, number, number] = [0.65, 0, 0.35, 1];

const VIDEO_INDEX = SKILLS.findIndex((skill) => skill.key === STAGE_VIDEO_KEY);

/**
 * Section 1 (spec 6.4.1, blueprint "Object on a disc" with the loaf for the
 * disc). The names are toggle buttons; the loaf is the stage and holds a real
 * screen of the chosen part, crossfading in 300ms. Nói plays the recording of
 * the speaking result. Name, picture and sentence read as one unit: the
 * sentence sits right under the stage, on the left edge of its screen.
 *
 * Each picture is a tight crop, so its UI text shows at about the size it has
 * in the app; under 768px the stage shows the tighter phone crop, and on a
 * phone the loaf runs past both screen edges to give the screen more room.
 */
export function SkillsShowcase({ actions }: { actions: LandingActions }) {
  void actions; // this section only shows the product
  const reduced = useLandingReducedMotion();
  const [active, setActive] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  // The clip box is animated; the observers watch its unclipped parent.
  const [stage, animate] = useAnimate<HTMLDivElement>();
  const frame = useRef<HTMLDivElement>(null);
  const entered = useInView(frame, { once: true, amount: 0.3 });
  const onScreen = useInView(frame, { amount: 0.2 });
  const armed = useRef(false);

  // Close the shutter only after hydration: the server HTML, a visitor without
  // JavaScript and a reduced-motion visitor all get the open stage. Once the
  // stage has been seen it never closes again. `reduced` is still false in the
  // hydration commit, so the media query is read directly as well.
  useEffect(() => {
    if (reduced || prefersReducedMotion() || entered || armed.current) return;
    armed.current = true;
    animate(stage.current, { clipPath: SHUTTER_CLOSED }, { duration: 0 });
    animate("[data-shutter-zoom]", { scale: 1.12 }, { duration: 0 });
  }, [reduced, entered, animate, stage]);

  useEffect(() => {
    if (!entered || !armed.current) return;
    animate(stage.current, { clipPath: SHUTTER_OPEN }, { duration: 1.1, delay: 0.15, ease: SHUTTER_EASE });
    animate("[data-shutter-zoom]", { scale: 1 }, { duration: 1.5, delay: 0.15, ease: REVEAL_EASE });
  }, [entered, animate, stage]);

  // The recording loops muted while Nói is chosen and on screen. Reduced motion
  // starts it paused on its poster; the button below plays or stops it.
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoChoice, setVideoChoice] = useState<boolean | null>(null);
  // The label follows what the video does, so server and client render the same text.
  const [videoPlaying, setVideoPlaying] = useState(false);
  const wantVideo = (videoChoice ?? !reduced) && active === VIDEO_INDEX && onScreen;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (wantVideo) {
      video.muted = true; // the server HTML may lack the muted attribute; browsers only autoplay muted video
      video.play().catch(() => undefined);
    } else video.pause();
  }, [wantVideo]);

  const toggleVideo = () => {
    const video = videoRef.current;
    if (!video) return;
    if (videoPlaying) {
      setVideoChoice(false);
      video.pause();
    } else {
      setVideoChoice(true);
      video.muted = true;
      video.play().catch(() => undefined);
    }
  };

  const onNameKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = stepIndex(event.key, index, SKILLS.length);
    if (next === null) return;
    event.preventDefault();
    setActive(next);
    buttons.current[next]?.focus();
  };

  return (
    <section aria-labelledby="landing-skills-title" className="landing-container overflow-x-clip">
      <div className="grid gap-y-6 lg:grid-cols-[4fr_8fr] lg:grid-rows-[1fr_auto_auto] lg:gap-x-(--gutter) lg:gap-y-2 lg:[grid-template-areas:'title_stage'_'names_stage'_'._fact']">
        <motion.h2
          id="landing-skills-title"
          className="landing-display landing-section-title lg:self-end lg:[grid-area:title]"
          {...revealProps(reduced, 0)}
        >
          {SKILLS_TITLE}
        </motion.h2>

        {/* Phone: the names wrap above the loaf (a row cut at the screen edge reads
            as clipped). Desktop: a column ending level with the loaf. */}
        <motion.ul
          aria-label="Chọn phần để xem màn hình"
          className="order-2 flex flex-wrap gap-x-6 lg:order-none lg:mt-4 lg:flex-col lg:flex-nowrap lg:gap-0 lg:[grid-area:names]"
          {...revealProps(reduced, 1)}
        >
          {SKILLS.map((skill, index) => {
            const on = index === active;
            return (
              <li key={skill.key} className="shrink-0">
                <button
                  ref={(element) => {
                    buttons.current[index] = element;
                  }}
                  type="button"
                  aria-pressed={on}
                  tabIndex={on ? 0 : -1}
                  onClick={() => setActive(index)}
                  onKeyDown={(event) => onNameKey(event, index)}
                  className={`landing-display flex min-h-11 cursor-pointer items-center gap-3 whitespace-nowrap text-left text-(length:--type-lead) leading-[1.15] transition-[color,scale] duration-150 ease-out active:scale-[0.98] lg:text-(length:--type-section) ${
                    on ? "text-(--ink)" : "text-(--muted) hover:text-(--ink)"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`landing-cut-bullet transition-opacity duration-150 ${on ? "opacity-100" : "opacity-0"}`}
                  />
                  {skill.name}
                </button>
              </li>
            );
          })}
        </motion.ul>

        {/* On a phone the frame is 120vw wide, centred: the loaf runs past both edges. */}
        <div
          ref={frame}
          className="order-3 max-sm:-mx-[calc(10vw+var(--gutter))] lg:order-none lg:self-center lg:[grid-area:stage]"
        >
          {/* The padding keeps the turned loaf inside the clip box of the shutter. */}
          <div ref={stage} className="py-[4%]">
            <Loaf cuts={0} className="aspect-[2/1]">
              {/* The screen: 72% of the loaf each way, upright, fully inside the loaf. */}
              <div
                className="absolute inset-x-[17.86%] inset-y-[26%] overflow-hidden"
                style={{ backgroundColor: SCREEN_PAPER }}
              >
                <div data-shutter-zoom className="absolute inset-x-[1.5%] inset-y-[3%] [container-type:size]">
                  {SKILLS.map((skill, index) => {
                    const on = index === active;
                    const isVideo = skill.key === STAGE_VIDEO_KEY;
                    const framed = CROPS[skill.key];
                    if (!isVideo && !framed) return null;
                    const image = LANDING_IMAGES[skill.key];
                    return (
                      <div
                        key={skill.key}
                        aria-hidden={!on}
                        className={`absolute inset-0 grid place-items-center transition-opacity duration-300 ease-out ${
                          on ? "opacity-100" : "opacity-0"
                        }`}
                      >
                        {isVideo ? (
                          <CropBox crop={VIDEO_CROP}>
                            <video
                              ref={videoRef}
                              className="absolute"
                              style={{ ...cropMedia(LANDING_VIDEO, VIDEO_CROP), maxWidth: "none" }}
                              width={LANDING_VIDEO.width}
                              height={LANDING_VIDEO.height}
                              poster={LANDING_VIDEO.poster}
                              aria-label={LANDING_VIDEO.label}
                              muted
                              loop
                              playsInline
                              preload="none"
                              onPlay={() => setVideoPlaying(true)}
                              onPause={() => setVideoPlaying(false)}
                            >
                              <source src={LANDING_VIDEO.src} type="video/webm" />
                            </video>
                          </CropBox>
                        ) : framed ? (
                          // Two crops of one file: the browser loads it once.
                          ([
                            [framed.phone ?? framed, "md:hidden"],
                            [framed, "max-md:hidden"],
                          ] as const).map(([crop, hide]) => (
                            <CropBox key={hide} crop={crop} className={hide}>
                              <img
                                src={image.src}
                                alt={framed.alt}
                                width={image.width}
                                height={image.height}
                                loading="lazy"
                                decoding="async"
                                className="absolute"
                                style={{ ...cropMedia(image, crop), maxWidth: "none" }}
                              />
                            </CropBox>
                          ))
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Loaf>
          </div>
        </div>

        {/* Right under the stage, on the left edge of its screen (the screen starts
            14% into the loaf), so it reads with the picture above it. */}
        <motion.div
          className="order-4 -mt-2 lg:order-none lg:mt-0 lg:pl-[14%] lg:[grid-area:fact]"
          {...revealProps(reduced, 3)}
        >
          <p aria-live="polite" className="landing-lead min-h-[5.8em] max-w-[40ch] lg:min-h-[4.35em]">
            {SKILLS[active].fact}
          </p>
          {/* Kept in the layout when hidden, so the page below does not jump. */}
          <button
            type="button"
            className={`landing-link landing-small ${active === VIDEO_INDEX ? "" : "invisible"}`}
            onClick={toggleVideo}
          >
            {videoPlaying ? "Dừng đoạn quay" : "Phát đoạn quay"}
          </button>
        </motion.div>
      </div>
    </section>
  );
}

/** A box with the crop's aspect ratio, as large as fits the stage's screen; the picture inside is placed by cropMedia. */
function CropBox({ crop, className = "", children }: { crop: Crop; className?: string; children: ReactNode }) {
  return (
    <div
      className={`relative overflow-hidden [grid-area:1/1] ${className}`}
      style={{ width: fitWidth(crop), aspectRatio: cropRatio(crop) }}
    >
      {children}
    </div>
  );
}
