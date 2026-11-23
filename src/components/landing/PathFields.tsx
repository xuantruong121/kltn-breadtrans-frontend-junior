"use client";

import { motion } from "framer-motion";
import { PATH, PATH_TITLE } from "@/lib/landing/content";
import { revealProps } from "@/lib/landing/motion";
import type { LandingActions } from "./types";
import { useLandingReducedMotion } from "./useLandingReducedMotion";

/** One flat field per step, each a tone deeper than the last; the end of the path turns to ink. */
const FIELDS = [
  "bg-(--surface) text-(--ink)",
  "bg-(--surface-2) text-(--ink)",
  "bg-(--surface-3) text-(--ink)",
  "bg-(--ink) text-(--bg)",
];

/** Each step's cut stands taller than the one before, like the cuts of a scored sentence (% of the cut row). */
const CUT_HEIGHTS = ["55%", "70%", "85%", "100%"];

/**
 * Section 3 (spec 6.4.3, blueprint "One card, four fields"): four colour
 * fields edge to edge. Each carries one large loaf cut, the hero's cut in its
 * flat crust colour, then its clause and the fact under it. No screenshot and
 * no number: the cuts grow from step to step instead.
 *
 * Phone: fields stack. md: two by two. xl: four across. From md up each field
 * is a subgrid of four rows (section title, cut, clause, fact), so the cuts
 * stand on one line and the four clauses start on one baseline, whatever the
 * length of the text around them.
 */
export function PathFields({ actions }: { actions: LandingActions }) {
  void actions; // this section only shows the product
  const reduced = useLandingReducedMotion();
  return (
    <section aria-labelledby="landing-path-title">
      <ol className="grid md:grid-cols-2 md:grid-rows-[repeat(8,auto)] xl:grid-cols-4 xl:grid-rows-[repeat(4,auto)]">
        {PATH.map((step, index) => (
          <li
            key={step.name}
            className={`flex flex-col px-(--gutter) pt-10 pb-12 md:row-span-4 md:grid md:grid-rows-subgrid md:gap-y-0 md:pt-14 md:pb-16 ${FIELDS[index]}`}
          >
            {index === 0 ? (
              <motion.h2
                id="landing-path-title"
                className="landing-display landing-section-title pb-10 md:row-start-1 md:pb-14"
                {...revealProps(reduced, 0)}
              >
                {PATH_TITLE}
              </motion.h2>
            ) : null}

            <motion.div
              aria-hidden="true"
              className="flex h-32 items-end md:row-start-2 md:h-44 xl:h-56"
              {...revealProps(reduced, index + 1)}
            >
              <span
                className="block w-7 origin-bottom-left skew-x-[-24deg] rounded-full bg-(--crust) md:w-11 xl:w-12"
                style={{ height: CUT_HEIGHTS[index] }}
              />
            </motion.div>

            <motion.div className="mt-8 md:row-start-3 md:mt-10" {...revealProps(reduced, index + 2)}>
              <p className="landing-display text-inherit text-(length:--type-lead) leading-[1.15]">{step.name}</p>
            </motion.div>

            <motion.p className="landing-body mt-3 max-w-[40ch] md:row-start-4" {...revealProps(reduced, index + 2)}>
              {step.fact}
            </motion.p>
          </li>
        ))}
      </ol>
    </section>
  );
}
