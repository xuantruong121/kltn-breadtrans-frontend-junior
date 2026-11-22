"use client";

import { motion, useReducedMotion } from "framer-motion";
import { revealProps } from "@/lib/landing/motion";
import type { LandingActions } from "./types";

// Stub (Task 2). Task 3 builds the hero: the giant loaf and the speaking demo (spec 6.3).
export function LandingHero({ actions }: { actions: LandingActions }) {
  const reduced = Boolean(useReducedMotion());
  return (
    <section aria-labelledby="landing-hero-title" className="landing-container pt-16">
      <motion.h1
        id="landing-hero-title"
        className="landing-display landing-hero-title"
        {...revealProps(reduced, 0)}
      >
        Nói một câu, chấm từng từ
      </motion.h1>
      <motion.div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3" {...revealProps(reduced, 1)}>
        <button type="button" className="landing-button" onClick={actions.register}>
          Bắt đầu học miễn phí
        </button>
        <button
          type="button"
          className="landing-link"
          onClick={() => actions.protectedGo("bài đánh giá đầu vào", "/diagnostic")}
        >
          Làm bài đánh giá đầu vào
        </button>
        <button type="button" className="landing-link" onClick={actions.login}>
          Đã có tài khoản? Đăng nhập
        </button>
      </motion.div>
    </section>
  );
}
