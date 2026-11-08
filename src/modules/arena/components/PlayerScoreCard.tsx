"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { AvatarImage } from "@/components/ui/AvatarImage";

export type RoundMark = "correct" | "wrong" | null;

/** Counts up to the new score instead of jumping. */
function useCountUp(target: number, reduce: boolean) {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (reduce) {
      from.current = target;
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / 600);
      setShown(Math.round(origin + (target - origin) * k));
      if (k < 1) frame = requestAnimationFrame(step);
      else from.current = target;
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, reduce]);
  return reduce ? target : shown;
}

export function PlayerScoreCard({
  name,
  avatar,
  score,
  marks,
  side,
  answeredNow,
  gain,
}: {
  name: string;
  avatar?: string;
  score: number;
  marks: RoundMark[];
  side: "me" | "rival";
  /** The player has answered the current round (shown for the rival). */
  answeredNow: boolean;
  /** Points added in the round just revealed, for the "+130" pop. */
  gain: { key: number; points: number } | null;
}) {
  const reduce = Boolean(useReducedMotion());
  const shown = useCountUp(score, reduce);
  const me = side === "me";
  const ring = me ? "ring-sky-500" : "ring-rose-500";
  const ink = me ? "text-sky-700 dark:text-sky-400" : "text-rose-700 dark:text-rose-400";

  return (
    <div className={`flex min-w-0 flex-1 items-center gap-3 ${me ? "" : "flex-row-reverse text-right"}`}>
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-lg font-bold text-slate-700 ring-2 sm:h-14 sm:w-14 ${ring} dark:bg-slate-800 dark:text-slate-200`}>
        <AvatarImage src={avatar} alt="" className="h-full w-full object-cover" fallback={name?.[0]?.toUpperCase() || "?"} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
          {me ? "Bạn" : name}
          {!me && answeredNow && <span className="ml-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">· đã trả lời</span>}
        </p>
        <p className={`flex items-baseline gap-2 ${me ? "" : "flex-row-reverse"}`}>
          <span className={`text-2xl font-extrabold tabular-nums sm:text-3xl ${ink}`} aria-live="polite">
            {shown.toLocaleString("vi-VN")}
          </span>
          <AnimatePresence>
            {gain && gain.points > 0 && (
              <motion.span
                key={gain.key}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="text-base font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400"
              >
                +{gain.points}
              </motion.span>
            )}
          </AnimatePresence>
        </p>
        <ol className={`mt-1 flex flex-wrap gap-0.5 ${me ? "" : "justify-end"}`} aria-label="Kết quả từng câu">
          {marks.map((mark, i) => (
            <li
              key={i}
              className={`flex h-2.5 w-2.5 items-center justify-center rounded-full ${
                mark === "correct" ? "bg-emerald-500" : mark === "wrong" ? "bg-rose-400" : "bg-slate-200 dark:bg-slate-700"
              }`}
            >
              {mark === "correct" && <Check size={7} strokeWidth={4} className="text-white" aria-hidden="true" />}
              <span className="sr-only">
                Câu {i + 1}: {mark === "correct" ? "đúng" : mark === "wrong" ? "sai" : "chưa chơi"}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
