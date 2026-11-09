"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronRight, DoorOpen } from "lucide-react";
import { DungeonHero } from "./DungeonHero";
import { STORY, type StoryPanel } from "../dungeonStory";
import { Monster } from "./Monster";

const BRICKS =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='24'%3E%3Cpath d='M0 1H48M0 13H48M1 0V12M25 12V24' stroke='%23231310' stroke-width='2'/%3E%3C/svg%3E\")";

/** One panel's picture, made from the game's own characters. */
function Scene({ scene, reduce }: { scene: StoryPanel["scene"]; reduce: boolean }) {
  const float = (delay = 0) => (reduce ? undefined : { animate: { y: [0, -6, 0] }, transition: { duration: 2.4, repeat: Infinity, delay } });
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#3a2219]" style={{ backgroundImage: BRICKS, backgroundSize: "48px 24px" }}>
      {scene === "oven-cold" && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(56,189,248,0.25),transparent_60%)]" />
          {/* the cold oven: a dark arch, no fire */}
          <div className="absolute bottom-0 left-1/2 h-[62%] w-[46%] -translate-x-1/2 rounded-t-[999px] border-[10px] border-[#5b3423] bg-[#120a07]" />
          <motion.div className="absolute bottom-3 left-[18%]" {...float()}>
            <DungeonHero pose="hit" size={120} reduce={reduce} />
          </motion.div>
          {!reduce &&
            [20, 45, 70, 85].map((x, i) => (
              <motion.span
                key={x}
                className="absolute top-0 h-1.5 w-1.5 rounded-full bg-sky-100/70"
                style={{ left: `${x}%` }}
                animate={{ y: [0, 260], opacity: [0, 1, 0] }}
                transition={{ duration: 4, repeat: Infinity, delay: i * 0.9, ease: "linear" }}
              />
            ))}
        </>
      )}
      {scene === "invaders" && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_110%,rgba(239,68,68,0.4),transparent_60%)]" />
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-end gap-1">
            <motion.div {...float(0.2)}>
              <Monster kind="moldy" floor={1} hitKey={0} dead={false} reduce size={110} />
            </motion.div>
            <motion.div {...float()}>
              <Monster kind="sourdough_king" floor={5} hitKey={0} dead={false} reduce size={170} />
            </motion.div>
            <motion.div {...float(0.4)}>
              <Monster kind="mouse" floor={2} hitKey={0} dead={false} reduce size={100} />
            </motion.div>
          </div>
        </>
      )}
      {scene === "spellbook" && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_60%,rgba(251,191,36,0.35),transparent_60%)]" />
          {/* an open recipe book, its words flying out */}
          <div className="absolute bottom-6 left-1/2 flex h-[48%] w-[56%] -translate-x-1/2 overflow-hidden rounded-md shadow-2xl">
            <div className="flex-1 border-r-2 border-amber-900/30 bg-[#fdf3dc] p-3 font-mono text-[11px] font-bold leading-5 text-amber-950/70 sm:text-xs">
              recipe · flour · knead · oven · bake
            </div>
            <div className="flex-1 bg-[#fbecc8] p-3 font-mono text-[11px] font-bold leading-5 text-amber-950/70 sm:text-xs">dough · yeast · rise · crust</div>
          </div>
          {["bake", "knead", "crust", "rise"].map((word, i) => (
            <motion.span
              key={word}
              className="absolute rounded-md border border-amber-300/70 bg-slate-950/85 px-2 py-0.5 font-mono text-xs font-bold text-amber-100"
              style={{ left: `${28 + i * 13}%`, top: "52%" }}
              animate={reduce ? { y: -60 - i * 12 } : { y: [0, -90 - i * 14], opacity: [0, 1, 1, 0.8] }}
              transition={reduce ? undefined : { duration: 2.6, repeat: Infinity, delay: i * 0.35, ease: "easeOut" }}
            >
              {word}
            </motion.span>
          ))}
          <motion.div className="absolute bottom-2 right-[8%]" {...float()}>
            <DungeonHero pose="jump" facing="left" size={110} reduce={reduce} />
          </motion.div>
        </>
      )}
      {scene === "descend" && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_100%,rgba(251,146,60,0.45),transparent_60%)]" />
          {/* steps going down into the glow */}
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="absolute h-[9%] bg-[#24140d]" style={{ left: `${40 + i * 10}%`, bottom: `${48 - i * 10}%`, width: "14%" }} />
          ))}
          <div className="absolute bottom-[50%] left-[14%]">
            <DungeonHero pose="walk" size={110} reduce={reduce} />
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Hầm Bánh Mì's opening (owner 2026-11-09): four panels before the first
 * run, then whenever the learner asks again. Next with the button, Enter or
 * Space; Esc or "Bỏ qua" skips it. It shows before the run starts, so it
 * never eats into the clock.
 */
export function DungeonStory({ onDone, finalLabel = "Xuống hầm" }: { onDone: () => void; finalLabel?: string }) {
  const reduce = Boolean(useReducedMotion());
  const [index, setIndex] = useState(0);
  const last = index === STORY.length - 1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDone();
      else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (last) onDone();
        else setIndex((i) => i + 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [last, onDone]);

  const panel = STORY[index];
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label="Cốt truyện Hầm Bánh Mì">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-amber-300/30 bg-[#140c08] text-white shadow-2xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: -30 }}
            transition={{ duration: 0.35 }}
          >
            <div className="aspect-[16/8] w-full">
              <Scene scene={panel.scene} reduce={reduce} />
            </div>
            <p className="min-h-[5.5rem] px-6 pt-5 text-lg font-semibold leading-relaxed text-amber-50 sm:text-xl">{panel.text}</p>
          </motion.div>
        </AnimatePresence>
        <div className="flex items-center justify-between gap-3 px-6 pb-5 pt-2">
          <div className="flex gap-1.5" aria-label={`Khung ${index + 1}/${STORY.length}`}>
            {STORY.map((_, i) => (
              <span key={i} className={`h-2 rounded-full transition-all ${i === index ? "w-6 bg-amber-400" : "w-2 bg-white/25"}`} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {!last && (
              <button type="button" onClick={onDone} className="rounded-lg px-3 py-2 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white">
                Bỏ qua
              </button>
            )}
            <button
              type="button"
              autoFocus
              onClick={() => (last ? onDone() : setIndex((i) => i + 1))}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 font-extrabold text-white hover:bg-amber-600"
            >
              {last ? (
                <>
                  <DoorOpen size={16} strokeWidth={2.5} aria-hidden="true" />
                  {finalLabel}
                </>
              ) : (
                <>
                  Tiếp
                  <ChevronRight size={16} strokeWidth={2.5} aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
