"use client";

import { motion } from "framer-motion";
import { LANDING_IMAGES } from "@/lib/landing/assets";
import { revealProps } from "@/lib/landing/motion";
import type { LandingActions } from "./types";
import { useLandingReducedMotion } from "./useLandingReducedMotion";

/** The one tile radius of the page (--radius-tile in landing.css). */
const TILE = "rounded-(--radius-tile)";

/** A real screen for the photo flank: the word-by-word pronunciation result. */
const PHOTO = LANDING_IMAGES["skill-noi"];

/**
 * The close (spec 6.4.6, blueprint "The action tile"): one row of three
 * tiles. The wide orange tile holds the heading and the register action; the
 * two flanking tiles run off the viewport edges, as if cropped from a longer
 * row: one holds a real screen, the other is a flat field. On a phone the
 * orange tile comes first and the screen follows at full width; the flat
 * field only exists in the desktop row, where it closes the right edge.
 *
 * Text on the tile is dark (--on-lit, #1c1917 in both modes): white on
 * --loaf is 3.2:1, below the 4.5:1 that running text needs (spec 6.7).
 */
export function ActionTile({ actions }: { actions: LandingActions }) {
  const reduced = useLandingReducedMotion();
  return (
    <section aria-labelledby="landing-action-title" className="overflow-x-clip">
      <div className="landing-container lg:max-w-none lg:px-0">
        <div className="grid grid-cols-1 gap-2 lg:-mx-10 lg:grid-cols-[minmax(0,1fr)_min(64%,60rem)_minmax(0,1fr)] lg:gap-3">
          {/* The screen fills its tile; on a phone the crop keeps the four rows of scored words. */}
          <motion.div
            className={`relative order-2 h-[180px] overflow-hidden bg-white sm:h-[240px] lg:order-none lg:h-[360px] ${TILE}`}
            {...revealProps(reduced, 1)}
          >
            <img
              src={PHOTO.src}
              alt={PHOTO.alt}
              width={PHOTO.width}
              height={PHOTO.height}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 size-full object-cover object-[50%_45%]"
            />
          </motion.div>

          <div
            className={`order-1 flex min-h-[300px] flex-col items-start justify-center bg-(--loaf) p-6 text-(--on-lit) sm:p-10 lg:order-none lg:h-[360px] ${TILE}`}
          >
            <motion.h2
              id="landing-action-title"
              className="landing-display landing-section-title text-(--on-lit)"
              {...revealProps(reduced, 0)}
            >
              Bắt đầu với BreadTrans
            </motion.h2>
            <motion.p className="landing-body landing-measure mt-4" {...revealProps(reduced, 1)}>
              Đăng ký bằng email, không cần thẻ ngân hàng, rồi làm bài đánh giá đầu vào để nhận gợi ý bài luyện cho kỹ năng bạn cần cải thiện.
            </motion.p>
            <motion.div className="mt-8 w-full sm:w-auto" {...revealProps(reduced, 2)}>
              <button
                type="button"
                onClick={actions.register}
                className="landing-button w-full bg-(--on-lit) text-(--on-loaf) hover:bg-black focus-visible:outline-(--on-lit) sm:w-auto"
              >
                Đăng ký miễn phí
              </button>
            </motion.div>
          </div>

          <motion.div
            aria-hidden="true"
            className={`hidden bg-(--surface-3) lg:block lg:h-[360px] ${TILE}`}
            {...revealProps(reduced, 2)}
          />
        </div>
      </div>
    </section>
  );
}
