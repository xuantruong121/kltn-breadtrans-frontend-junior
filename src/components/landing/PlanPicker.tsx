"use client";

import { motion, useReducedMotion } from "framer-motion";
import { revealProps } from "@/lib/landing/motion";
import type { LandingActions } from "./types";

// Stub (Task 2). Task 5 builds the plan names and the live price (spec 6.4.4).
export function PlanPicker({ actions }: { actions: LandingActions }) {
  void actions; // used once Task 5 fills the section
  const reduced = Boolean(useReducedMotion());
  return (
    <section aria-labelledby="landing-plans-title" className="landing-container">
      <motion.h2
        id="landing-plans-title"
        className="landing-display landing-section-title"
        {...revealProps(reduced, 0)}
      >
        Gói học
      </motion.h2>
    </section>
  );
}
