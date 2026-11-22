"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { motion, useAnimate, useInView, useReducedMotion } from "framer-motion";
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
} from "@/lib/landing/content";
import { REVEAL_EASE, revealProps } from "@/lib/landing/motion";
import { Loaf } from "./Loaf";
import type { LandingActions } from "./types";

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
 * the speaking result.
 */
export function SkillsShowcase({ actions }: { actions: LandingActions }) {
  void actions; // this section only shows the product
  const reduced = Boolean(useReducedMotion());
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
  // stage has been seen it never closes again.
  useEffect(() => {
    if (reduced || entered || armed.current) return;
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
    <section aria-labelledby="landing-skills-title" className="landing-container">
      <div className="grid gap-y-8 lg:grid-cols-[5fr_7fr] lg:grid-rows-[1fr_auto_auto] lg:gap-x-(--gutter) lg:gap-y-6 lg:[grid-template-areas:'title_stage'_'names_stage'_'._fact']">
        <motion.h2
          id="landing-skills-title"
          className="landing-display landing-section-title lg:self-end lg:[grid-area:title]"
          {...revealProps(reduced, 0)}
        >
          {SKILLS_TITLE}
        </motion.h2>

        {/* Phone: one sideways-scrolling line under the loaf. Desktop: a column ending level with the loaf. */}
        <motion.ul
          aria-label="Chọn phần để xem màn hình"
          className="order-3 -mx-(--gutter) flex gap-6 overflow-x-auto px-(--gutter) py-2 [scrollbar-width:none] lg:order-none lg:mx-0 lg:flex-col lg:gap-0 lg:overflow-visible lg:p-0 lg:[grid-area:names] [&::-webkit-scrollbar]:hidden"
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

        <div ref={frame} className="order-2 lg:order-none lg:self-center lg:[grid-area:stage]">
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
                    const crop = isVideo ? VIDEO_CROP : framed;
                    if (!crop) return null;
                    const image = LANDING_IMAGES[skill.key];
                    return (
                      <div
                        key={skill.key}
                        aria-hidden={!on}
                        className={`absolute inset-0 grid place-items-center transition-opacity duration-300 ease-out ${
                          on ? "opacity-100" : "opacity-0"
                        }`}
                      >
                        <div
                          className="relative overflow-hidden"
                          style={{ width: fitWidth(crop), aspectRatio: cropRatio(crop) }}
                        >
                          {isVideo ? (
                            <video
                              ref={videoRef}
                              className="absolute"
                              style={{ ...cropMedia(LANDING_VIDEO, crop), maxWidth: "none" }}
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
                          ) : (
                            <img
                              src={image.src}
                              alt={framed?.alt ?? image.alt}
                              width={image.width}
                              height={image.height}
                              loading="lazy"
                              decoding="async"
                              className="absolute"
                              style={{ ...cropMedia(image, crop), maxWidth: "none" }}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Loaf>
          </div>
        </div>

        <motion.div
          className="order-4 lg:order-none lg:justify-self-end lg:[grid-area:fact]"
          {...revealProps(reduced, 3)}
        >
          <p aria-live="polite" className="landing-body min-h-[4.8em] max-w-[38ch]">
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
