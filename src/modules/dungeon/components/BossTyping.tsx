"use client";

import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { CornerDownLeft, Crown } from "lucide-react";
import type { DungeonOutcome, DungeonQuestion } from "@/lib/api/services/dungeon.service";
import { fitsHint, typedCells } from "../dungeonLogic";

type Typed = Extract<DungeonQuestion, { type: "typed" }>;

/**
 * A boss's question: the Vietnamese meaning, one cell per letter of the
 * English word, and an input. Enter sends it; a letter that cannot fit the
 * cells is refused. After a miss the right word shows in the cells.
 */
export function BossTyping({
  question,
  share,
  started,
  secondsLeft,
  value,
  outcome,
  disabled,
  shakeKey,
  onChange,
  onSubmit,
  compact = false,
}: {
  question: Typed;
  share: number;
  started: boolean;
  secondsLeft: number;
  value: string;
  outcome: DungeonOutcome | null;
  disabled: boolean;
  shakeKey: number;
  /** A short screen: smaller cells and tighter spacing. */
  compact?: boolean;
  onChange: (next: string) => void;
  onSubmit: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled, question]);

  const cells = typedCells(question.hint, question.revealed, outcome && !outcome.right ? outcome.answer : value);
  const missed = outcome !== null && !outcome.right;
  const urgent = started && share < 0.3;
  return (
    <motion.form
      animate={shakeKey === 0 ? undefined : { x: shakeKey % 2 ? [0, -9, 8, -4, 0] : [0, 9, -8, 4, 0] }}
      transition={{ duration: 0.24 }}
      onSubmit={(e) => {
        e.preventDefault();
        if (!disabled && value.trim()) onSubmit();
      }}
      data-dungeon-answers
      className={`w-full max-w-2xl rounded-2xl border border-rose-400/30 bg-black/65 shadow-[0_20px_60px_rgba(0,0,0,0.5)] ${compact ? "p-3" : "p-4 sm:p-5"}`}
    >
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-white/10" role="timer" aria-label={`Còn ${secondsLeft} giây`}>
        <div className={`h-full rounded-full transition-[width] duration-100 ease-linear ${urgent ? "bg-rose-500" : "bg-amber-400"}`} style={{ width: `${(started ? share : 1) * 100}%` }} />
      </div>
      <p className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wide text-rose-200">
        <Crown size={14} strokeWidth={2.5} aria-hidden="true" />
        Gõ từ tiếng Anh để hạ boss
      </p>
      <p className={`text-center font-bold leading-snug text-white ${compact ? "mt-1 text-lg sm:text-xl" : "mt-2 text-xl sm:text-2xl"}`}>
        {question.prompt}
        {question.pos && <span className="ml-2 align-middle text-sm font-semibold text-white/60">({question.pos})</span>}
      </p>
      <p className={`flex flex-wrap justify-center gap-x-4 gap-y-2 font-mono font-bold ${compact ? "mt-2 text-xl" : "mt-4 text-2xl"}`} aria-label={`Từ có ${question.hint.replace(/ /g, "").length} chữ cái`}>
        {cells.map((word, w) => (
          <span key={w} className="inline-flex max-w-full flex-wrap justify-center gap-1">
            {word.map((c, i) => (
              <span
                key={i}
                className={`inline-flex items-end justify-center border-b-[3px] pb-0.5 ${compact ? "h-8 w-[clamp(1.1rem,6vw,1.75rem)]" : "h-10 w-[clamp(1.1rem,6.5vw,2rem)]"} ${
                  missed ? "border-rose-400 text-rose-200" : c.state === "typed" ? "border-amber-300 text-amber-100" : c.state === "revealed" ? "border-white/40 text-white/45" : "border-white/40"
                }`}
              >
                {c.char || " "}
              </span>
            ))}
          </span>
        ))}
      </p>
      <div className={`flex gap-2 ${compact ? "mt-2" : "mt-4"}`}>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            const next = e.target.value.toLowerCase();
            if (fitsHint(question.hint, next)) onChange(next);
          }}
          disabled={disabled}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="send"
          aria-label="Gõ từ tiếng Anh rồi nhấn Enter"
          placeholder={compact ? "Gõ từ" : "Gõ từ rồi nhấn Enter"}
          className="min-w-0 flex-1 rounded-xl border-2 border-white/15 bg-black/40 px-3 py-2.5 font-mono text-lg font-bold text-amber-50 caret-amber-300 outline-none placeholder:font-sans placeholder:font-medium placeholder:text-white/40 focus:border-amber-300/70"
        />
        <button type="submit" disabled={disabled || !value.trim()} className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 font-extrabold text-white transition-colors hover:bg-amber-600 disabled:opacity-50">
          <CornerDownLeft size={17} strokeWidth={2.5} aria-hidden="true" />
          Đánh
        </button>
      </div>
    </motion.form>
  );
}
