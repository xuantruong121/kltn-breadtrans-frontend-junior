"use client";

import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import { REVEAL_EASE } from "@/lib/landing/motion";
import type { LandingActions } from "./types";
import { useLandingReducedMotion } from "./useLandingReducedMotion";

/**
 * Block heights in % of a row: 60-100, no two neighbours alike, like the cuts
 * when a sentence is scored. Bottoms share one line, so the letters share a
 * baseline.
 */
const BLOCKS: Array<{ letter: string; height: number }> = [
  { letter: "B", height: 100 },
  { letter: "r", height: 72 },
  { letter: "e", height: 86 },
  { letter: "a", height: 64 },
  { letter: "d", height: 94 },
  { letter: "T", height: 100 },
  { letter: "r", height: 68 },
  { letter: "a", height: 82 },
  { letter: "n", height: 62 },
  { letter: "s", height: 90 },
];

/** Letters of a one-word heading rise one after another, 40ms apart (motion.md: 20-40ms). */
const LETTER_STEP_S = 0.04;

function blockMotion(reduced: boolean, index: number) {
  // data-reveal: the landing.css and no-script guards pin it to its final state.
  if (reduced) return { initial: false as const, "data-reveal": true as const };
  return {
    initial: { opacity: 0, y: 32 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true as const, amount: 0.4 },
    transition: { duration: 0.8, delay: index * LETTER_STEP_S, ease: REVEAL_EASE },
    "data-reveal": true as const,
  };
}

/**
 * The close of the landing (spec 6.4.7, blueprint "The mark, built large"):
 * BreadTrans built from loaves stood on end, one letter in each, on a flat
 * band that meets AppFooter below it. AppFooter stays as it is.
 *
 * Sizes are container units (cqi) of the band's content width, so the
 * construction keeps its proportions at every width: one row of ten from 640px,
 * "Bread" over "Trans" on a phone. The letters take the hero step (--type-hero),
 * so the page keeps five type sizes; the cqi cap stops them outgrowing a block
 * on screens wider than the 90rem container.
 */
export function LoafMark({ actions }: { actions: LandingActions }) {
  void actions; // the mark carries no action; AppFooter below holds the links
  const reduced = useLandingReducedMotion();
  return (
    // The negative margin takes back the section gap .landing-stack leaves after
    // the last section, so the band meets AppFooter. Under lg (public)/layout.tsx
    // also pads <main> by 4.5rem + the safe area for MobileBottomNav; the band
    // runs over that padding too, so no strip of page colour shows above the footer.
    <section
      aria-labelledby="landing-mark-title"
      className="mb-[calc(var(--section-gap)*-1_-_4.5rem_-_env(safe-area-inset-bottom))] bg-(--surface-2) py-12 lg:mb-[calc(var(--section-gap)*-1)] lg:py-16"
    >
      <div className="landing-container">
        <h2 id="landing-mark-title" aria-label="BreadTrans" className="@container landing-display">
          <span className="grid grid-cols-5 items-end gap-1 sm:grid-cols-10">
            {BLOCKS.map((block, index) => (
              <motion.span
                key={index}
                aria-hidden="true"
                style={{ "--block": block.height / 100 } as CSSProperties}
                className="flex h-[calc(40cqi*var(--block))] items-end justify-center rounded-full bg-(--loaf) pb-[4cqi] text-[length:min(var(--type-hero),13cqi)] leading-none text-(--on-loaf) sm:h-[calc(22cqi*var(--block))] sm:pb-[2cqi] sm:text-[length:min(var(--type-hero),7cqi)]"
                {...blockMotion(reduced, index)}
              >
                {block.letter}
              </motion.span>
            ))}
          </span>
        </h2>
      </div>
    </section>
  );
}
