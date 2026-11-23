"use client";

import { motion, useReducedMotion } from "framer-motion";
import { LANDING_IMAGES } from "@/lib/landing/assets";
import { CROPS, HABITS, HABITS_LEAD, HABITS_TITLE, cropMedia, cropRatio, fitWidth } from "@/lib/landing/content";
import { revealProps } from "@/lib/landing/motion";
import type { LandingActions } from "./types";

/** Flat tile colours, rotating through three fields of the palette. */
const TILE_TONES = ["bg-(--surface)", "bg-(--surface-2)", "bg-(--surface-3)"];

/** The margin around each screenshot, in the colour of its own screen. */
const MARGIN = "3cqmin";
const PAPER = "#fcfaf8";
const PAPER_DARK = "#0c1431"; // the arena screen is dark

/** HABITS[1] is the double-width tile: second in the first row, first on a phone. */
const DOUBLE_INDEX = 1;

/**
 * Section 2 (spec 6.4.2, blueprint "Specimens on colour tiles"): heading and
 * one sentence on the left, five flat tiles on the right, each holding one
 * piece of a real screen. Name and fact sit under the tile; nothing on it.
 */
export function HabitTiles({ actions }: { actions: LandingActions }) {
  void actions; // this section only shows the product
  const reduced = Boolean(useReducedMotion());
  return (
    <section aria-labelledby="landing-habits-title" className="landing-container">
      <div className="grid gap-y-10 lg:grid-cols-12 lg:gap-x-(--gutter)">
        <div className="lg:col-span-4">
          <motion.h2
            id="landing-habits-title"
            className="landing-display landing-section-title"
            {...revealProps(reduced, 0)}
          >
            {HABITS_TITLE}
          </motion.h2>
          <motion.p className="landing-lead mt-6 max-w-[30ch]" {...revealProps(reduced, 1)}>
            {HABITS_LEAD}
          </motion.p>
        </div>

        <ul className="grid grid-cols-2 gap-x-2 gap-y-8 md:grid-cols-3 md:gap-x-2.5 lg:col-span-8">
          {HABITS.map((habit, index) => {
            const image = LANDING_IMAGES[habit.key];
            const crop = CROPS[habit.key];
            if (!crop) return null;
            const double = index === DOUBLE_INDEX;
            return (
              <li key={habit.key} className={double ? "@container order-first col-span-2 md:order-none" : undefined}>
                <motion.div {...revealProps(reduced, index + 2)}>
                  {/* The double tile is 8:5; from md up it takes the height of a 4:5 tile beside it (10px gap). */}
                  <div
                    className={`relative rounded-(--radius-tile) ${TILE_TONES[index % TILE_TONES.length]} ${
                      double ? "aspect-[8/5] md:aspect-auto md:h-[calc(62.5cqw_-_6.25px)]" : "aspect-[4/5]"
                    }`}
                  >
                    <div className="absolute inset-[8%] grid place-items-center [container-type:size]">
                      <div
                        style={{
                          padding: MARGIN,
                          backgroundColor: habit.key === "habit-dau-truong" ? PAPER_DARK : PAPER,
                        }}
                      >
                        <div
                          className="relative overflow-hidden"
                          style={{ width: fitWidth(crop, MARGIN), aspectRatio: cropRatio(crop) }}
                        >
                          <img
                            src={image.src}
                            alt={crop.alt}
                            width={image.width}
                            height={image.height}
                            loading="lazy"
                            decoding="async"
                            className="absolute"
                            style={{ ...cropMedia(image, crop), maxWidth: "none" }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <h3 className="mt-3 text-(length:--type-body) font-medium leading-snug lg:text-(length:--type-lead)">
                    {habit.name}
                  </h3>
                  <p className="landing-muted mt-1 text-(length:--type-small) leading-normal lg:text-(length:--type-body) lg:leading-relaxed">
                    {habit.fact}
                  </p>
                </motion.div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
