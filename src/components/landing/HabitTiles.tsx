"use client";

import { motion, useReducedMotion } from "framer-motion";
import { revealProps } from "@/lib/landing/motion";
import type { LandingActions } from "./types";

// Stub (Task 2). Task 4 builds the colour tiles (spec 6.4.2).
export function HabitTiles({ actions }: { actions: LandingActions }) {
  void actions; // used once Task 4 fills the section
  const reduced = Boolean(useReducedMotion());
  return (
    <section aria-labelledby="landing-habits-title" className="landing-container">
      <motion.h2
        id="landing-habits-title"
        className="landing-display landing-section-title"
        {...revealProps(reduced, 0)}
      >
        Thứ giữ người học quay lại
      </motion.h2>
    </section>
  );
}
