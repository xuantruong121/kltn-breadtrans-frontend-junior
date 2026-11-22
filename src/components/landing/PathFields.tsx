"use client";

import { motion, useReducedMotion } from "framer-motion";
import { revealProps } from "@/lib/landing/motion";
import type { LandingActions } from "./types";

// Stub (Task 2). Task 4 builds the four fields of the path (spec 6.4.3).
export function PathFields({ actions }: { actions: LandingActions }) {
  void actions; // used once Task 4 fills the section
  const reduced = Boolean(useReducedMotion());
  return (
    <section aria-labelledby="landing-path-title" className="landing-container">
      <motion.h2
        id="landing-path-title"
        className="landing-display landing-section-title"
        {...revealProps(reduced, 0)}
      >
        Lộ trình
      </motion.h2>
    </section>
  );
}
