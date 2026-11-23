"use client";

import { useEffect, useRef, useState, type ComponentType, type KeyboardEvent } from "react";
import { motion, useAnimate, useInView } from "framer-motion";
import { SKILLS, SKILLS_TITLE, stepIndex, type SkillKey } from "@/lib/landing/content";
import { REVEAL_EASE, revealProps } from "@/lib/landing/motion";
import { FragDoc } from "./fragments/FragDoc";
import { FragFlashcard } from "./fragments/FragFlashcard";
import { FragNghe } from "./fragments/FragNghe";
import { FragNoi } from "./fragments/FragNoi";
import { FragToeic } from "./fragments/FragToeic";
import { FragViet } from "./fragments/FragViet";
import { Loaf } from "./Loaf";
import type { LandingActions } from "./types";
import { prefersReducedMotion, useLandingReducedMotion } from "./useLandingReducedMotion";

/** The coded app fragment of each part (owner feedback #3): sharp at any size, real data. */
const FRAGMENTS: Record<SkillKey, ComponentType> = {
  "skill-noi": FragNoi,
  "skill-nghe": FragNghe,
  "skill-doc": FragDoc,
  "skill-viet": FragViet,
  "skill-luyen-de": FragToeic,
  "skill-flashcard": FragFlashcard,
};

/** The signature move (spec 6.6): the stage opens from its left edge, once. */
const SHUTTER_CLOSED = "inset(0% 100% 0% 0%)";
const SHUTTER_OPEN = "inset(0% 0% 0% 0%)";
const SHUTTER_EASE: [number, number, number, number] = [0.65, 0, 0.35, 1];

/**
 * The loaf's cuts on this stage: on a desktop eleven thin cuts along the whole
 * loaf, so the end ones show on both sides of the card; on a phone seven along
 * the top of a band, above the card. They reach into Loaf's own classes.
 */
const DESKTOP_CUTS =
  "[&_.landing-loaf__cuts]:justify-between [&_.landing-loaf__cuts]:px-[7%] [&_.landing-loaf__cut]:h-[56%] [&_.landing-loaf__cut]:w-5";
const PHONE_CUTS =
  "[&_.landing-loaf__cuts]:items-start [&_.landing-loaf__cuts]:justify-between [&_.landing-loaf__cuts]:px-[12%] [&_.landing-loaf__cuts]:pt-[34px] [&_.landing-loaf__cut]:h-[52px] [&_.landing-loaf__cut]:w-3.5";

/**
 * Section 1 (spec 6.4.1, the approved design boards Main and SkillsPhone).
 * The names are toggle buttons; the stage is the tilted loaf with an upright
 * app card on it, holding a coded fragment of the chosen part with real data.
 * The fact sentence under the stage says what that fragment shows.
 *
 * Desktop: the names run down the left; the card sits centred on the loaf.
 * Under lg: the names wrap into pills; a loaf band sits behind the top of the
 * card. All six fragments stay in the card's grid cell, so switching fades
 * and the page below does not move.
 */
export function SkillsShowcase({ actions }: { actions: LandingActions }) {
  void actions; // this section only shows the product
  const reduced = useLandingReducedMotion();
  const [active, setActive] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  // The clip box is animated; the observer watches its unclipped parent.
  const [stage, animate] = useAnimate<HTMLDivElement>();
  const frame = useRef<HTMLDivElement>(null);
  const entered = useInView(frame, { once: true, amount: 0.3 });
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
    animate(stage.current, { clipPath: SHUTTER_OPEN }, { duration: 1.1, delay: 0.15, ease: SHUTTER_EASE }).then(() => {
      // Open, the clip would still cut the loaf where it runs past the stage box.
      if (stage.current) stage.current.style.clipPath = "none";
    });
    animate("[data-shutter-zoom]", { scale: 1 }, { duration: 1.5, delay: 0.15, ease: REVEAL_EASE });
  }, [entered, animate, stage]);

  const onNameKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = stepIndex(event.key, index, SKILLS.length);
    if (next === null) return;
    event.preventDefault();
    setActive(next);
    buttons.current[next]?.focus();
  };

  return (
    <section aria-labelledby="landing-skills-title" className="landing-container overflow-x-clip">
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:items-start lg:gap-x-12 lg:gap-y-2">
        <div className="flex flex-col gap-6 lg:gap-12 lg:pt-[72px]">
          <motion.h2 id="landing-skills-title" className="landing-display landing-section-title" {...revealProps(reduced, 0)}>
            {SKILLS_TITLE}
          </motion.h2>

          {/* Under lg the names wrap into pills (no hidden sideways scroll); from lg a column. */}
          <motion.ul
            aria-label="Chọn phần để xem"
            className="flex flex-wrap gap-2 lg:flex-col lg:flex-nowrap lg:gap-1"
            {...revealProps(reduced, 1)}
          >
            {SKILLS.map((skill, index) => {
              const on = index === active;
              return (
                <li key={skill.key}>
                  <button
                    ref={(element) => {
                      buttons.current[index] = element;
                    }}
                    type="button"
                    aria-pressed={on}
                    tabIndex={on ? 0 : -1}
                    onClick={() => setActive(index)}
                    onKeyDown={(event) => onNameKey(event, index)}
                    className={`flex min-h-11 cursor-pointer items-center whitespace-nowrap rounded-full px-4 text-[16px] font-semibold leading-tight transition-[color,background-color,scale] duration-150 ease-out active:scale-[0.98] lg:min-h-14 lg:gap-[18px] lg:rounded-none lg:bg-transparent lg:px-0 lg:text-left lg:text-[28px] lg:tracking-[-0.01em] ${
                      on
                        ? "bg-(--ink) text-(--bg) lg:text-(--ink)"
                        : "bg-(--surface) text-(--ink) lg:text-(--quiet) lg:hover:text-(--ink)"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`hidden h-[30px] w-2.5 flex-none skew-x-[-24deg] rounded-full bg-(--crust) transition-opacity duration-150 lg:inline-block ${
                        on ? "opacity-100" : "opacity-0"
                      }`}
                    />
                    {skill.name}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        </div>

        <div className="flex flex-col gap-6 lg:gap-7">
          <div ref={frame}>
            {/* The clip box of the shutter. */}
            <div ref={stage} className="relative pt-24 lg:flex lg:min-h-[640px] lg:items-center lg:justify-center lg:py-[70px]">
              <div aria-hidden="true" className="absolute inset-x-0 top-[70px] bottom-[70px] max-lg:hidden">
                <Loaf cuts={11} className={`h-full aspect-auto ${DESKTOP_CUTS}`} />
              </div>
              <div aria-hidden="true" className="absolute -inset-x-6 top-0 h-[200px] lg:hidden">
                <Loaf cuts={7} className={`h-full aspect-auto ${PHONE_CUTS}`} />
              </div>

              <div data-shutter-zoom className="relative grid lg:w-[min(540px,80%)]">
                {SKILLS.map((skill, index) => {
                  const on = index === active;
                  const Fragment = FRAGMENTS[skill.key];
                  return (
                    <div
                      key={skill.key}
                      aria-hidden={!on}
                      className={`flex transition-[opacity,visibility] duration-300 ease-out [grid-area:1/1] lg:self-center ${
                        on ? "visible opacity-100" : "invisible opacity-0"
                      }`}
                    >
                      <Fragment />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <motion.p
            aria-live="polite"
            className="min-h-[4.8em] max-w-[40rem] text-[17px] leading-[1.6] text-(--muted) lg:min-h-[3.2em] lg:max-w-[46rem] lg:pl-[14%] lg:text-[18px]"
            {...revealProps(reduced, 3)}
          >
            {SKILLS[active].fact}
          </motion.p>
        </div>
      </div>
    </section>
  );
}
