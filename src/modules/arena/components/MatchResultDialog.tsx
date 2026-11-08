"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import Confetti from "react-confetti";
import { RotateCcw, Wheat, X } from "lucide-react";
import { BreadMascot } from "./BreadMascot";
import { resultCopy } from "../result";

export type RoundRecord = { myCorrect: boolean; myPoints: number; rivalCorrect: boolean; rivalPoints: number };

/** The app's own colours: amber bread, emerald win, sky learner. */
const CONFETTI_COLORS = ["#F59E0B", "#FBBF24", "#FB923C", "#10B981", "#38BDF8", "#FDE68A"];

/** Counts from 0 to `to` once the dialog opens; immediate with reduced motion. */
function useCountUp(to: number, run: boolean, ms = 900) {
  const [value, setValue] = useState(run ? 0 : to);
  useEffect(() => {
    if (!run) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      setValue(Math.round(to * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to, run, ms]);
  return run ? value : to;
}

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 22 } },
};

export function MatchResultDialog({
  outcome,
  forfeitReason,
  myScore,
  rivalScore,
  rivalName,
  stake,
  reward,
  xp,
  xpCapped,
  correct,
  totalRounds,
  onRematch,
  onExit,
}: {
  outcome: "win" | "lose" | "draw";
  forfeitReason: "left" | "disconnected" | null;
  myScore: number;
  rivalScore: number;
  rivalName: string;
  stake: number;
  reward: number;
  /** XP for this match; undefined when the server did not send it. */
  xp?: number;
  xpCapped: boolean;
  correct: number;
  totalRounds: number;
  onRematch: () => void;
  onExit: () => void;
}) {
  const reduce = Boolean(useReducedMotion());
  const exitRef = useRef<HTMLButtonElement>(null);
  useEffect(() => exitRef.current?.focus(), []);

  const copy = resultCopy({ outcome, forfeitReason, rivalName, stake, reward, xp, xpCapped });
  const mine = useCountUp(myScore, !reduce);
  const theirs = useCountUp(rivalScore, !reduce);

  const band = outcome === "win" ? "bg-amber-100 dark:bg-amber-950/50" : outcome === "draw" ? "bg-sky-50 dark:bg-sky-950/40" : "bg-slate-100 dark:bg-slate-800";
  const banhInk =
    copy.banhTone === "up" ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" : copy.banhTone === "down" ? "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300" : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200";

  return (
    <div className="fixed inset-0 z-[100] flex overflow-y-auto bg-slate-900/60 p-4">
      {outcome === "win" && !reduce && <Confetti recycle={false} numberOfPieces={260} colors={CONFETTI_COLORS} gravity={0.18} />}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-title"
        initial={reduce ? false : { scale: 0.85, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 18 }}
        className="m-auto w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-slate-900"
      >
        <div className={`relative flex justify-center pt-6 ${band}`}>
          <motion.div
            initial={reduce ? false : { y: 40, scale: 0.6 }}
            animate={
              reduce
                ? undefined
                : outcome === "win"
                  ? { y: [40, -14, 0, -6, 0], scale: 1 }
                  : outcome === "lose"
                    ? { y: 0, scale: 1, rotate: [0, -6, 4, -2, 0] }
                    : { y: 0, scale: 1 }
            }
            transition={{ duration: 0.9, ease: "easeOut" }}
          >
            <BreadMascot team="me" mood={outcome === "lose" ? "sad" : "happy"} size={108} />
          </motion.div>
        </div>

        <motion.div className="p-6 text-center" variants={container} initial={reduce ? false : "hidden"} animate="show">
          <motion.h2
            id="result-title"
            variants={item}
            className={`text-3xl font-extrabold ${outcome === "win" ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-slate-100"}`}
          >
            {copy.title}
          </motion.h2>
          <motion.p variants={item} className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {copy.line}
          </motion.p>

          <motion.div variants={item} className="mt-5 flex items-center justify-center gap-4" aria-label={`Điểm: bạn ${myScore}, ${rivalName} ${rivalScore}`}>
            <div className="min-w-0 flex-1 text-right">
              <p className="text-4xl font-extrabold tabular-nums text-sky-700 dark:text-sky-400">{mine.toLocaleString("vi-VN")}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Bạn</p>
            </div>
            <span className="text-2xl font-bold text-slate-300 dark:text-slate-600" aria-hidden="true">
              –
            </span>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-4xl font-extrabold tabular-nums text-rose-700 dark:text-rose-400">{theirs.toLocaleString("vi-VN")}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{rivalName}</p>
            </div>
          </motion.div>

          <motion.p variants={item} className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">
            Đúng {correct}/{totalRounds} câu
          </motion.p>

          <motion.div variants={item} className="mt-4 flex justify-center gap-2">
            <motion.span
              initial={reduce ? false : { scale: 0.6 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 12, delay: reduce ? 0 : 0.7 }}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-base font-extrabold tabular-nums ${banhInk}`}
            >
              {copy.banh}
              <Wheat size={16} strokeWidth={2.25} aria-hidden="true" />
              <span className="sr-only">Bánh Mì</span>
            </motion.span>
            {copy.xp && (
              <motion.span
                initial={reduce ? false : { scale: 0.6 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 12, delay: reduce ? 0 : 0.85 }}
                className="inline-flex items-center rounded-full bg-sky-50 px-3.5 py-1.5 text-base font-extrabold tabular-nums text-sky-800 dark:bg-sky-950/40 dark:text-sky-300"
              >
                {copy.xp}
              </motion.span>
            )}
          </motion.div>
          {copy.xpNote && (
            <motion.p variants={item} className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {copy.xpNote}
            </motion.p>
          )}

          <motion.div variants={item} className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
            <button
              type="button"
              onClick={onRematch}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-3 font-extrabold text-white hover:bg-amber-600"
            >
              <RotateCcw size={16} strokeWidth={2.5} aria-hidden="true" />
              Đấu tiếp
            </button>
            <button
              ref={exitRef}
              type="button"
              onClick={onExit}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <X size={16} strokeWidth={2.5} aria-hidden="true" />
              Về sảnh
            </button>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
