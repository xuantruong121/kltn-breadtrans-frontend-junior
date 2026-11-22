"use client";

import { motion, useReducedMotion } from "framer-motion";
import { revealProps } from "@/lib/landing/motion";
import type { LandingActions } from "./types";

// Stub (Task 2). Task 5 builds the action tile (spec 6.4.6).
export function ActionTile({ actions }: { actions: LandingActions }) {
  const reduced = Boolean(useReducedMotion());
  return (
    <section aria-labelledby="landing-action-title" className="landing-container">
      <motion.h2
        id="landing-action-title"
        className="landing-display landing-section-title"
        {...revealProps(reduced, 0)}
      >
        Bắt đầu với BreadTrans
      </motion.h2>
      <motion.div className="mt-8" {...revealProps(reduced, 1)}>
        <button type="button" className="landing-button" onClick={actions.register}>
          Đăng ký miễn phí
        </button>
      </motion.div>
    </section>
  );
}
