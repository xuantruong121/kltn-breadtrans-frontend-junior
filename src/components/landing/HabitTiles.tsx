"use client";

import type { ComponentType } from "react";
import { motion } from "framer-motion";
import { HABITS, HABITS_LEAD, HABITS_TITLE, type HabitKey } from "@/lib/landing/content";
import { revealProps } from "@/lib/landing/motion";
import { TileArena } from "./fragments/TileArena";
import { TilePet } from "./fragments/TilePet";
import { TileRank } from "./fragments/TileRank";
import { TileShop } from "./fragments/TileShop";
import { TileStreak } from "./fragments/TileStreak";
import type { LandingActions } from "./types";
import { useLandingReducedMotion } from "./useLandingReducedMotion";

/**
 * Each tile: its coded app fragment (owner feedback #4) and its flat tone.
 * The shop is the double-width tile: two columns from lg, and first, across
 * both columns, on a two-column tablet grid.
 */
const TILES: Record<HabitKey, { Fragment: ComponentType; tone: string; place?: string }> = {
  "habit-thu-ao": { Fragment: TilePet, tone: "bg-(--surface-2)" },
  "habit-banh-mi": { Fragment: TileShop, tone: "bg-(--surface)", place: "md:order-first md:col-span-2 lg:order-none" },
  "habit-chuoi-ngay": { Fragment: TileStreak, tone: "bg-(--surface)" },
  "habit-dau-truong": { Fragment: TileArena, tone: "bg-(--surface-3)" },
  "habit-xep-hang": { Fragment: TileRank, tone: "bg-(--surface-2)" },
};

/**
 * Section 2 (spec 6.4.2, the approved design boards Habits and HabitsPhone):
 * the heading and one sentence above five tiles. Each tile is a flat tone
 * panel holding the white app card of a real piece of the app; its name and
 * fact sit under the panel.
 */
export function HabitTiles({ actions }: { actions: LandingActions }) {
  void actions; // this section only shows the product
  const reduced = useLandingReducedMotion();
  return (
    <section aria-labelledby="landing-habits-title" className="landing-container">
      <div className="flex flex-col gap-10 lg:gap-14">
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-end lg:gap-12">
          <motion.h2 id="landing-habits-title" className="landing-display landing-section-title" {...revealProps(reduced, 0)}>
            {HABITS_TITLE}
          </motion.h2>
          <motion.p className="max-w-[620px] text-[18px] leading-normal lg:text-[22px] lg:leading-[1.45]" {...revealProps(reduced, 1)}>
            {HABITS_LEAD}
          </motion.p>
        </div>

        <ul className="grid grid-cols-1 gap-y-10 md:grid-cols-2 md:gap-x-6 lg:grid-cols-3 lg:gap-y-12">
          {HABITS.map((habit, index) => {
            const { Fragment, tone, place = "" } = TILES[habit.key];
            return (
              <li key={habit.key} className={`flex ${place}`}>
                <motion.div className="flex w-full flex-col gap-3.5 lg:gap-[18px]" {...revealProps(reduced, index + 2)}>
                  <div className={`flex flex-1 items-center rounded-(--radius-tile) p-3.5 md:p-5 lg:p-7 ${tone}`}>
                    <Fragment />
                  </div>
                  <div className="flex flex-col gap-1 px-1 lg:px-0">
                    <h3 className="text-[20px] font-semibold leading-snug lg:text-[22px]">{habit.name}</h3>
                    <p className="text-[16px] leading-[1.55] text-(--muted) lg:text-[17px]">{habit.fact}</p>
                  </div>
                </motion.div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
