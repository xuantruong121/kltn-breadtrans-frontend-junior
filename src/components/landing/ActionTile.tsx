"use client";

import { motion, useReducedMotion } from "framer-motion";
import { revealProps } from "@/lib/landing/motion";
import type { LandingActions } from "./types";

/** The one tile radius of this part of the page: a 72px FAQ tile is a loaf at 36px. */
const TILE = "rounded-[36px]";

/**
 * The close (spec 6.4.6, blueprint "The action tile"): one row of three
 * tiles. The wide orange tile holds the heading and the register action; the
 * two flanking tiles run off the viewport edges, as if cropped from a longer
 * row. On a phone the orange tile comes first, the flanks follow as a pair.
 *
 * Text on the tile is dark (--on-lit, #1c1917 in both modes): white on
 * --loaf is 3.2:1, below the 4.5:1 that running text needs (spec 6.7).
 */
export function ActionTile({ actions }: { actions: LandingActions }) {
  const reduced = Boolean(useReducedMotion());
  return (
    <section aria-labelledby="landing-action-title" className="overflow-x-clip">
      <div className="landing-container lg:max-w-none lg:px-0">
        <div className="grid grid-cols-2 gap-2 lg:-mx-10 lg:grid-cols-[minmax(0,1fr)_min(64%,60rem)_minmax(0,1fr)] lg:gap-3">
          {/* Photo slot. The spec wants a real photograph here (a found bread picture,
              spec 6.5, credited in LoafMark); this branch has none, so the tile stays a
              flat field until one is added. Put it in as an <img> with object-cover,
              width, height, alt and loading="lazy", and add its credit line in LoafMark. */}
          <motion.div
            aria-hidden="true"
            className={`order-2 h-[120px] bg-(--surface-2) lg:order-none lg:h-[360px] ${TILE}`}
            {...revealProps(reduced, 1)}
          />

          <div
            className={`order-1 col-span-2 flex min-h-[300px] flex-col items-start justify-center bg-(--loaf) p-6 text-(--on-lit) sm:p-10 lg:order-none lg:col-span-1 lg:h-[360px] ${TILE}`}
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
            className={`order-3 h-[120px] bg-(--surface-3) lg:order-none lg:h-[360px] ${TILE}`}
            {...revealProps(reduced, 2)}
          />
        </div>
      </div>
    </section>
  );
}
