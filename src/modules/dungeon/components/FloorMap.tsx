"use client";

import React from "react";
import { motion } from "framer-motion";
import { Check, Crown } from "lucide-react";
import { DungeonHero } from "./DungeonHero";
import { FLOORS_PER_CHAPTER, chapterFor } from "../dungeonStory";

/**
 * The map shown as a floor opens (owner 2026-11-09: small stages): the
 * chapter's five floors on a path, those passed ticked, the boss's with a
 * crown, and the hero stepping down to the current one. A new chapter gets
 * its name card first. `compact` is the smaller map over the topping choice,
 * where it stays until the learner picks (owner: the opening map went by too fast).
 */
export function FloorMap({ floor, reduce, compact = false }: { floor: number; reduce: boolean; compact?: boolean }) {
  const chapter = chapterFor(floor);
  const boss = floor === chapter.bossFloor;
  const nodeX = (i: number) => 10 + i * 20; // percent across the path
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.3 }}
      className={`rounded-2xl border shadow-2xl ${compact ? "w-[min(32rem,94vw)] px-4 pb-3 pt-3" : "w-[min(36rem,92vw)] px-5 pb-5 pt-4"} ${boss ? "border-rose-400/50 bg-[#2a0d12]" : "border-amber-300/40 bg-[#140c08]"}`}
    >
      <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-amber-200/80">
        {compact ? `Tiếp theo · Chương ${chapter.number}` : `Chương ${chapter.number}`}
      </p>
      <motion.p
        initial={reduce || !chapter.starts ? false : { opacity: 0, y: 8, letterSpacing: "0.3em" }}
        animate={{ opacity: 1, y: 0, letterSpacing: "0em" }}
        transition={{ duration: 0.6 }}
        className={`text-center font-black text-amber-100 ${compact ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"}`}
      >
        {chapter.name}
      </motion.p>
      <div className={`relative ${compact ? "mt-5 h-20" : "mt-6 h-24"}`}>
        {/* the path */}
        <div className="absolute left-[10%] right-[10%] top-[38%] border-t-[3px] border-dashed border-amber-200/30" />
        <motion.div
          className="absolute left-[10%] top-[38%] border-t-[3px] border-amber-300"
          initial={{ width: `${Math.max(0, chapter.step - 1) * 20}%` }}
          animate={{ width: `${chapter.step * 20}%` }}
          transition={{ duration: reduce ? 0 : 0.8, delay: reduce ? 0 : 0.3 }}
        />
        {Array.from({ length: FLOORS_PER_CHAPTER }, (_, i) => {
          const n = chapter.first + i;
          const done = n < floor;
          const here = n === floor;
          const isBoss = n === chapter.bossFloor;
          return (
            <div key={n} className="absolute top-[38%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={{ left: `${nodeX(i)}%` }}>
              <motion.span
                animate={here && !reduce ? { scale: [1, 1.15, 1] } : undefined}
                transition={{ duration: 1.2, repeat: Infinity }}
                className={`flex items-center justify-center rounded-full border-2 font-black ${isBoss ? "size-11" : "size-9"} ${
                  here
                    ? isBoss
                      ? "border-rose-300 bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.6)]"
                      : "border-amber-200 bg-amber-500 text-white shadow-[0_0_18px_rgba(251,191,36,0.6)]"
                    : done
                      ? "border-emerald-300/70 bg-emerald-600/80 text-white"
                      : "border-white/25 bg-black/50 text-white/60"
                }`}
              >
                {isBoss ? <Crown size={isBoss ? 18 : 15} strokeWidth={2.5} aria-hidden="true" /> : done ? <Check size={15} strokeWidth={3} aria-hidden="true" /> : n}
              </motion.span>
              <span className={`mt-1 whitespace-nowrap text-[11px] font-bold ${here ? "text-amber-100" : "text-white/50"}`}>
                {here ? `Tầng ${n}` : isBoss ? "Boss" : `Tầng ${n}`}
              </span>
            </div>
          );
        })}
        {/* the mascot walks from the last floor to this one */}
        <motion.div
          className="absolute top-[38%] -translate-x-1/2 -translate-y-[115%]"
          initial={{ left: `${nodeX(Math.max(0, chapter.step - 1))}%` }}
          animate={{ left: `${nodeX(chapter.step)}%` }}
          transition={{ duration: reduce ? 0 : 0.8, delay: reduce ? 0 : 0.3, ease: "easeInOut" }}
        >
          <DungeonHero pose="walk" size={58} reduce={reduce} />
        </motion.div>
      </div>
      {boss && <p className="mt-1 text-center text-sm font-bold text-rose-200">Boss canh giữ cuối chương. Gõ đúng từ để hạ!</p>}
    </motion.div>
  );
}
