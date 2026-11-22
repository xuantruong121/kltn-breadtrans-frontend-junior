"use client";

import { motion, useReducedMotion } from "framer-motion";
import { revealProps } from "@/lib/landing/motion";
import type { LandingActions } from "./types";

// Stub (Task 2). Task 5 builds the BreadTrans mark from loaf blocks, above AppFooter (spec 6.4.7).
export function LoafMark({ actions }: { actions: LandingActions }) {
  void actions; // used once Task 5 fills the section
  const reduced = Boolean(useReducedMotion());
  return (
    <section aria-labelledby="landing-mark-title" className="landing-container">
      <motion.h2
        id="landing-mark-title"
        className="landing-display landing-section-title"
        {...revealProps(reduced, 0)}
      >
        BreadTrans
      </motion.h2>
    </section>
  );
}
