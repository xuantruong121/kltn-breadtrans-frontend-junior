"use client";

import { motion } from "framer-motion";
import { LANDING_IMAGES } from "@/lib/landing/assets";
import { CROPS, PATH, PATH_TITLE, cropMedia, cropRatio, fitWidth } from "@/lib/landing/content";
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

/** The page colour of the app behind the screenshots: the sheet each crop sits on. */
const SCREEN_PAPER = "#fcfaf8";

/**
 * Section 3 (spec 6.4.3, blueprint "One card, four fields"): four colour
 * fields edge to edge, each with a same-size sheet showing a real screen of
 * its step, and a clause that opens with its order word. No card is invented:
 * the product has none that a learner carries through all four steps.
 *
 * Phone: fields stack. md: two by two. xl: four across. From md up each field
 * is a subgrid, so the sheets and the clauses line up across a row.
 */
export function PathFields({ actions }: { actions: LandingActions }) {
  void actions; // this section only shows the product
  const reduced = useLandingReducedMotion();
  return (
    <section aria-labelledby="landing-path-title">
      <ol className="grid md:min-h-[128svh] md:grid-cols-2 md:grid-rows-[auto_1fr_auto_auto_1fr_auto] xl:min-h-[84svh] xl:grid-cols-4 xl:grid-rows-[auto_1fr_auto]">
        {PATH.map((step, index) => {
          const image = LANDING_IMAGES[step.key];
          const crop = CROPS[step.key];
          if (!crop) return null;
          return (
            <li
              key={step.key}
              className={`flex min-h-[64svh] flex-col gap-8 px-(--gutter) py-10 md:row-span-3 md:grid md:min-h-0 md:grid-rows-subgrid md:gap-y-10 md:py-8 ${FIELDS[index]}`}
            >
              {index === 0 ? (
                <motion.h2
                  id="landing-path-title"
                  className="landing-display landing-section-title md:row-start-1"
                  {...revealProps(reduced, 0)}
                >
                  {PATH_TITLE}
                </motion.h2>
              ) : null}

              <motion.div className="order-2 md:order-none md:row-start-2 md:self-center" {...revealProps(reduced, index + 1)}>
                <div
                  className="relative aspect-[4/3] w-full max-w-[22rem] md:mx-auto md:w-[86%] md:max-w-none"
                  style={{ backgroundColor: SCREEN_PAPER }}
                >
                  <div className="absolute inset-x-[3%] inset-y-[4%] grid place-items-center [container-type:size]">
                    <div className="relative overflow-hidden" style={{ width: fitWidth(crop), aspectRatio: cropRatio(crop) }}>
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
              </motion.div>

              <motion.div className="order-1 md:order-none md:row-start-3 md:self-end" {...revealProps(reduced, index + 2)}>
                <p className="landing-display text-inherit text-(length:--type-lead) leading-[1.15]">{step.name}</p>
                <p className="landing-body mt-3 max-w-[40ch]">{step.fact}</p>
              </motion.div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
