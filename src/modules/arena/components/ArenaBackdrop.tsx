"use client";

import React, { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * The stage behind a match: a warm sky, a wheat field that sways, and crumbs
 * and grains drifting up. Drawn in code, no image to load; decorative only
 * and still when the learner asks for reduced motion. The parent must be
 * `relative isolate overflow-hidden`; the scene fills it.
 */
export function ArenaBackdrop() {
  const reduce = Boolean(useReducedMotion());
  // Fixed positions, so the server and the browser draw the same scene.
  const motes = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        left: (i * 37 + 11) % 100,
        size: 4 + ((i * 7) % 6),
        delay: (i * 1.3) % 9,
        duration: 11 + ((i * 5) % 8),
        grain: i % 3 === 0,
      })),
    []
  );
  const stalks = useMemo(() => Array.from({ length: 26 }, (_, i) => ({ h: 40 + ((i * 17) % 34) })), []);

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-gradient-to-b from-amber-50 via-orange-50 to-amber-100 dark:from-slate-950 dark:via-slate-900 dark:to-amber-950/60" />

      {/* sun */}
      <motion.div
        className="absolute -top-24 right-[8%] h-72 w-72 rounded-full bg-amber-200/60 blur-2xl dark:bg-amber-500/10"
        animate={reduce ? undefined : { scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* clouds */}
      {[
        { top: "12%", w: 220, d: 70, delay: 0 },
        { top: "26%", w: 160, d: 90, delay: 25 },
      ].map((c, i) => (
        <motion.div
          key={i}
          className="absolute h-10 rounded-full bg-white/70 dark:bg-slate-700/30"
          style={{ top: c.top, width: c.w }}
          initial={{ x: "-30vw" }}
          animate={reduce ? { x: "20vw" } : { x: ["-30vw", "110vw"] }}
          transition={{ duration: c.d, delay: c.delay, repeat: Infinity, ease: "linear" }}
        />
      ))}

      {/* drifting crumbs and grains */}
      {!reduce &&
        motes.map((m, i) => (
          <motion.span
            key={i}
            className={`absolute bottom-0 ${m.grain ? "rounded-[50%] bg-amber-500/50" : "rounded-full bg-orange-300/60 dark:bg-amber-400/30"}`}
            style={{ left: `${m.left}%`, width: m.size, height: m.grain ? m.size * 1.8 : m.size }}
            animate={{ y: [0, -700], x: [0, i % 2 ? 24 : -24, 0], opacity: [0, 1, 0], rotate: [0, 180] }}
            transition={{ duration: m.duration, delay: m.delay, repeat: Infinity, ease: "easeOut" }}
          />
        ))}

      {/* wheat field */}
      <svg className="absolute inset-x-0 bottom-0 h-40 w-full sm:h-52" viewBox="0 0 104 60" preserveAspectRatio="none">
        <path d="M0 38 Q 26 28 52 36 T 104 32 V60 H0Z" className="fill-amber-200 dark:fill-amber-900/50" />
        <path d="M0 46 Q 30 38 60 46 T 104 42 V60 H0Z" className="fill-amber-300/80 dark:fill-amber-800/50" />
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex h-28 items-end justify-around px-2 sm:h-36">
        {stalks.map((s, i) => (
          <motion.svg
            key={i}
            width="14"
            height={s.h * 1.6}
            viewBox="0 0 14 80"
            className="origin-bottom text-amber-500/80 dark:text-amber-600/50"
            animate={reduce ? undefined : { rotate: [-4, 4, -4] }}
            transition={{ duration: 3.2 + (i % 5) * 0.4, repeat: Infinity, ease: "easeInOut", delay: (i % 7) * 0.3 }}
            fill="currentColor"
          >
            <rect x="6.3" y="22" width="1.4" height="58" />
            {[0, 1, 2, 3].map((k) => (
              <g key={k}>
                <ellipse cx="4.5" cy={6 + k * 5} rx="2.6" ry="1.5" transform={`rotate(-30 4.5 ${6 + k * 5})`} />
                <ellipse cx="9.5" cy={6 + k * 5} rx="2.6" ry="1.5" transform={`rotate(30 9.5 ${6 + k * 5})`} />
              </g>
            ))}
          </motion.svg>
        ))}
      </div>
    </div>
  );
}
