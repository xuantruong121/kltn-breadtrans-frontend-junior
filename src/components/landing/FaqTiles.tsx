"use client";

import { motion, useReducedMotion } from "framer-motion";
import { revealProps } from "@/lib/landing/motion";
import type { LandingActions } from "./types";

// Stub (Task 2). Task 5 builds the FAQ tiles from FAQ_LIST in legacy-content.ts (spec 6.4.5).
export function FaqTiles({ actions }: { actions: LandingActions }) {
  void actions; // used once Task 5 fills the section
  const reduced = Boolean(useReducedMotion());
  return (
    <section aria-labelledby="landing-faq-title" className="landing-container">
      <motion.h2
        id="landing-faq-title"
        className="landing-display landing-section-title"
        {...revealProps(reduced, 0)}
      >
        Câu hỏi thường gặp
      </motion.h2>
    </section>
  );
}
