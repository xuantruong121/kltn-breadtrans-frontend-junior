"use client";

import { motion, useReducedMotion } from "framer-motion";
import { revealProps } from "@/lib/landing/motion";
import type { LandingActions } from "./types";

// Stub (Task 2). Task 4 builds the skill list and the loaf stage (spec 6.4.1).
export function SkillsShowcase({ actions }: { actions: LandingActions }) {
  void actions; // used once Task 4 fills the section
  const reduced = Boolean(useReducedMotion());
  return (
    <section aria-labelledby="landing-skills-title" className="landing-container">
      <motion.h2
        id="landing-skills-title"
        className="landing-display landing-section-title"
        {...revealProps(reduced, 0)}
      >
        Bốn kỹ năng và luyện đề
      </motion.h2>
    </section>
  );
}
