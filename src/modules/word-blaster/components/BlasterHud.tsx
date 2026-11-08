"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Flame, Heart, HeartCrack, LogOut } from "lucide-react";
import { SoundToggle } from "@/modules/arena/components/SoundToggle";

/**
 * The glass bar over the night field: lives (a lost one cracks), twenty
 * segments for the blocks (amber broken, red landed), the combo, the mode,
 * sound and the way out.
 */
export const BlasterHud = React.memo(function BlasterHud({
  lives,
  livesLeft,
  total,
  destroyed,
  landed,
  combo,
  modeLabel,
  stake,
  reduce,
  onLeave,
}: {
  lives: number;
  livesLeft: number;
  total: number;
  destroyed: number;
  landed: number;
  combo: number;
  modeLabel: string | null;
  stake: number;
  reduce: boolean;
  onLeave: () => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 px-2 pt-2 sm:px-4 sm:pt-3">
      <div className="pointer-events-auto mx-auto flex max-w-5xl items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/80 px-2.5 py-2 text-white shadow-[0_8px_30px_rgba(0,0,0,0.35)] sm:gap-4 sm:px-4">
        <div className="flex shrink-0 items-center gap-0.5" role="img" aria-label={`Còn ${livesLeft} mạng`}>
          {Array.from({ length: lives }, (_, i) => {
            const on = i < livesLeft;
            return on ? (
              <Heart key={`on-${i}`} size={22} strokeWidth={2.25} className="fill-rose-500 text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.6)]" aria-hidden="true" />
            ) : (
              <motion.span
                key={`off-${i}`}
                initial={reduce ? false : { scale: 1.6, rotate: -18, opacity: 0.4 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 14 }}
              >
                <HeartCrack size={22} strokeWidth={2.25} className="text-slate-500" aria-hidden="true" />
              </motion.span>
            );
          })}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex gap-[3px]" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={destroyed + landed} aria-label={`${destroyed + landed}/${total} khối`}>
            {Array.from({ length: total }, (_, i) => (
              <span
                key={i}
                className={`h-2 flex-1 rounded-full transition-colors duration-300 ${
                  i < destroyed ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]" : i < destroyed + landed ? "bg-rose-500" : "bg-white/15"
                }`}
              />
            ))}
          </div>
          <p className="mt-1 flex items-center gap-2 text-xs font-semibold text-white/75">
            <span className="tabular-nums text-white">
              {destroyed + landed}/{total} khối
            </span>
            {modeLabel && <span className="hidden truncate sm:inline">· {modeLabel}</span>}
            <span className="hidden sm:inline">· cược {stake}</span>
          </p>
        </div>

        <div className="flex h-9 w-[4.5rem] shrink-0 items-center justify-center" aria-live="polite">
          <AnimatePresence>
            {combo >= 2 && (
              <motion.span
                key={combo}
                initial={reduce ? false : { scale: 1.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 16 }}
                className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-1 text-sm font-extrabold tabular-nums text-amber-300 ring-1 ring-amber-400/40"
              >
                <Flame size={15} strokeWidth={2.5} aria-hidden="true" />×{combo}
                <span className="sr-only">combo</span>
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <div className="hidden sm:block">
            <SoundToggle tone="dark" />
          </div>
          <button
            type="button"
            onClick={onLeave}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-white/85 transition-colors hover:bg-rose-500/20 hover:text-rose-200"
          >
            <LogOut size={16} strokeWidth={2.25} aria-hidden="true" />
            Thoát
          </button>
        </div>
      </div>
    </div>
  );
});

/** The big words in the middle: 3, 2, 1, "Bắt đầu!" and "Tăng tốc!". */
export function Callout({ text, tone, reduce }: { text: string | null; tone: "count" | "go" | "speed"; reduce: boolean }) {
  return (
    <div data-blaster-callout className="pointer-events-none absolute inset-x-0 top-[34%] z-30 flex justify-center" aria-live="assertive">
      <AnimatePresence mode="popLayout">
        {text && (
          <motion.p
            key={text}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: tone === "count" ? 2.2 : 0.6, y: tone === "speed" ? 12 : 0 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: tone === "count" ? 0.7 : 1.15 }}
            transition={{ type: "spring", stiffness: 380, damping: 20 }}
            className={
              tone === "count"
                ? "text-8xl font-black tabular-nums text-amber-200 [text-shadow:0_0_40px_rgba(251,191,36,0.65),0_4px_0_rgba(120,53,15,0.8)] sm:text-9xl"
                : tone === "go"
                  ? "text-5xl font-black text-amber-200 [text-shadow:0_0_36px_rgba(251,191,36,0.7),0_3px_0_rgba(120,53,15,0.8)] sm:text-6xl"
                  : "rounded-2xl border border-amber-300/40 bg-slate-950/85 px-6 py-2.5 text-2xl font-extrabold text-amber-200 shadow-[0_0_30px_rgba(251,191,36,0.3)] sm:text-3xl"
            }
          >
            {text}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
