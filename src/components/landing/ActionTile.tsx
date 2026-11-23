"use client";

import { motion } from "framer-motion";
import { revealProps } from "@/lib/landing/motion";
import type { LandingActions } from "./types";
import { useLandingReducedMotion } from "./useLandingReducedMotion";

/**
 * The close (spec 6.4.6, blueprint "The action tile"): one wide orange tile
 * inside the page margins, with the --radius-tile corners of the other filled
 * tiles. The heading takes the left of the tile; the sentence and the register
 * action stand on the right, on the heading's last line. On a phone they stack.
 *
 * Text on the tile is dark (--on-lit, #1c1917 in both modes): white on
 * --loaf is 3.2:1, below the 4.5:1 that running text needs (spec 6.7).
 */
export function ActionTile({ actions }: { actions: LandingActions }) {
  const reduced = useLandingReducedMotion();
  return (
    <section aria-labelledby="landing-action-title" className="landing-container">
      <div className="flex min-h-[300px] flex-col justify-center rounded-(--radius-tile) bg-(--loaf) p-6 text-(--on-lit) sm:p-10 lg:grid lg:min-h-[360px] lg:grid-cols-12 lg:items-end lg:gap-x-8 lg:p-16">
        <motion.h2
          id="landing-action-title"
          className="landing-display landing-section-title text-(--on-lit) lg:col-span-6"
          {...revealProps(reduced, 0)}
        >
          Bắt đầu với BreadTrans
        </motion.h2>
        <div className="mt-4 lg:col-span-5 lg:col-start-8 lg:mt-0">
          <motion.p className="landing-body landing-measure" {...revealProps(reduced, 1)}>
            Đăng ký bằng email, không cần thẻ ngân hàng, rồi làm bài đánh giá đầu vào để nhận gợi ý bài luyện cho kỹ năng bạn cần cải thiện.
          </motion.p>
          <motion.div className="mt-8 w-full sm:w-auto lg:mt-6" {...revealProps(reduced, 2)}>
            <button
              type="button"
              onClick={actions.register}
              className="landing-button w-full bg-(--on-lit) text-(--on-loaf) hover:bg-black focus-visible:outline-(--on-lit) sm:w-auto"
            >
              Đăng ký miễn phí
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
