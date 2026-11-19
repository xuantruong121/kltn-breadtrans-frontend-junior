"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { AvatarImage } from "@/components/ui/AvatarImage";
import { BadgeGlyph } from "@/components/ui/BadgeGlyph";
import { resolveAvatarFrame, resolveUserBadge } from "@/lib/avatar/avatarCustomizationLogic";

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
  frame = null,
  badge = null,
}: {
  name: string;
  avatar?: string;
  /** This player's own shop frame and badge from the server, never the viewer's. */
  frame?: string | null;
  badge?: string | null;
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
  const worn = resolveAvatarFrame(frame);
  const pinned = resolveUserBadge(badge);
  const ink = me ? "text-sky-700 dark:text-sky-400" : "text-rose-700 dark:text-rose-400";

  return (
    <div className={`flex min-w-0 flex-1 items-center gap-3 ${me ? "" : "flex-row-reverse text-right"}`}>
      <span className="relative flex h-12 w-12 shrink-0 sm:h-14 sm:w-14">
        {worn && (
          <img
            src={worn.svgUrl}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-[165%] w-[165%] max-w-none -translate-x-1/2 -translate-y-1/2 select-none"
          />
        )}
        <span
          className={`relative z-10 flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-slate-100 text-lg font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200 ${worn ? worn.containerRingClass : `ring-2 ${ring}`}`}
        >
          <AvatarImage src={avatar} alt="" className="h-full w-full object-cover" fallback={name?.[0]?.toUpperCase() || "?"} />
        </span>
        {pinned && (
          <span
            title={pinned.name}
            className="absolute -bottom-0.5 -right-0.5 z-30 flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:h-6 sm:w-6"
          >
            <BadgeGlyph badge={pinned} className="size-3/4" imgClassName="h-full w-full object-contain p-px" />
          </span>
        )}
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
