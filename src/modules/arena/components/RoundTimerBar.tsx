"use client";

import React, { useEffect, useRef, useState } from "react";
import { roundTimer, shouldTick, type TimerPhase } from "../roundTimer";
import { arenaSound } from "../sound/arenaSound";

const BAR: Record<TimerPhase, string> = {
  calm: "bg-sky-500",
  warn: "bg-amber-500",
  danger: "bg-rose-500",
};
const TEXT: Record<TimerPhase, string> = {
  calm: "text-slate-900 dark:text-slate-100",
  warn: "text-amber-700 dark:text-amber-400",
  danger: "text-rose-600 dark:text-rose-400",
};

/**
 * The round clock as a bar that drains from the right. It reads the server's
 * start time and duration, so both players see the same bar; it stops when the
 * round result arrives. Ticks once a second in the last five.
 */
export function RoundTimerBar({
  serverStartTime,
  duration,
  stopped,
}: {
  serverStartTime: number;
  duration: number;
  stopped: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());
  const barRef = useRef<HTMLDivElement>(null);
  const lastTick = useRef<number | null>(null);

  useEffect(() => {
    if (stopped) return;
    let frame = 0;
    const loop = () => {
      const t = Date.now();
      const state = roundTimer(serverStartTime, duration, t);
      if (barRef.current) barRef.current.style.transform = `scaleX(${state.fraction})`;
      if (shouldTick(lastTick.current, state.seconds)) arenaSound.play("tick");
      lastTick.current = state.seconds;
      setNow((previous) => (Math.floor(previous / 250) === Math.floor(t / 250) ? previous : t));
      if (state.remainingMs > 0) frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [serverStartTime, duration, stopped]);

  const state = roundTimer(serverStartTime, duration, now);
  return (
    <div className="flex items-center gap-3" role="timer" aria-label={`Còn ${state.seconds} giây`}>
      <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          ref={barRef}
          className={`h-full origin-left rounded-full transition-colors duration-300 ${BAR[state.phase]}`}
          style={{ transform: `scaleX(${state.fraction})` }}
        />
      </div>
      <span
        aria-hidden="true"
        className={`w-12 text-right text-2xl font-extrabold tabular-nums ${TEXT[state.phase]} ${
          state.phase === "danger" && !stopped ? "motion-safe:animate-pulse" : ""
        }`}
      >
        {state.seconds}
      </span>
    </div>
  );
}
