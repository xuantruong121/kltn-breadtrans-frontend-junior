"use client";

import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import type { DungeonOutcome, DungeonQuestion } from "@/lib/api/services/dungeon.service";

type Choice = Extract<DungeonQuestion, { type: "choice" }>;

/**
 * A monster's question: four options (keys 1 to 4) and the clock. After an
 * answer the panel shows which option was picked and, on a miss, the right
 * one, until the next question replaces it.
 */
export function QuestionPanel({
  question,
  share,
  started,
  secondsLeft,
  picked,
  outcome,
  disabled,
  onPick,
}: {
  question: Choice;
  share: number;
  started: boolean;
  secondsLeft: number;
  picked: number | null;
  outcome: DungeonOutcome | null;
  disabled: boolean;
  onPick: (index: number) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (disabled || e.metaKey || e.ctrlKey || e.altKey) return;
      const n = Number(e.key);
      if (n >= 1 && n <= question.options.length && !question.removed.includes(n - 1)) {
        e.preventDefault();
        onPick(n - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [disabled, question, onPick]);

  const urgent = started && share < 0.3;
  return (
    <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-black/60 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.5)] sm:p-5">
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-white/10" role="timer" aria-label={`Còn ${secondsLeft} giây`}>
        <div
          className={`h-full rounded-full transition-[width] duration-100 ease-linear ${urgent ? "bg-rose-500" : "bg-amber-400"}`}
          style={{ width: `${(started ? share : 1) * 100}%` }}
        />
      </div>
      <p className="text-center text-lg font-bold leading-snug text-white sm:text-xl">{question.prompt}</p>
      {question.ipa && <p className="mt-1 text-center text-sm text-white/70">/{question.ipa}/</p>}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {question.options.map((option, i) => {
          const gone = question.removed.includes(i);
          const chosen = picked === i;
          const showRight = outcome !== null && outcome.answer === option;
          const showWrong = outcome !== null && chosen && !outcome.right;
          return (
            <motion.button
              key={`${option}-${i}`}
              type="button"
              disabled={disabled || gone}
              onClick={() => onPick(i)}
              whileTap={disabled ? undefined : { scale: 0.97 }}
              className={`flex min-h-12 items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left text-base font-semibold transition-colors ${
                gone
                  ? "border-white/5 bg-white/5 text-white/25 line-through"
                  : showRight
                    ? "border-emerald-400 bg-emerald-500/25 text-emerald-50"
                    : showWrong
                      ? "border-rose-400 bg-rose-500/25 text-rose-50"
                      : chosen
                        ? "border-amber-300 bg-amber-400/20 text-white"
                        : "border-white/15 bg-white/5 text-white hover:border-amber-300/70 hover:bg-white/10"
              }`}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-black/40 text-sm font-bold tabular-nums text-white/80">
                {showRight ? <Check size={15} strokeWidth={3} aria-hidden="true" /> : showWrong ? <X size={15} strokeWidth={3} aria-hidden="true" /> : i + 1}
              </span>
              <span className="min-w-0 break-words">{option}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
