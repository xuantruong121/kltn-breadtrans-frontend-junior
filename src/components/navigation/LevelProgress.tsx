"use client";

import { useId } from "react";

import { LevelMedalIcon } from "@/components/ui/LevelMedalIcon";
import { formatXp, xpLevelProgress } from "@/lib/gamification/xpLevel";

/**
 * The learner's level and the XP to the next one, under the stats strip of
 * the account menu (owner 2026-11-18). The label sits above the bar and the
 * XP still needed below it; no text inside the bar. The bar fills from the
 * current level's start, so it begins empty again after a level up.
 */
export function LevelProgress({ totalXp }: { totalXp: number | null }) {
  const labelId = useId();
  const helpId = useId();
  const progress = totalXp === null ? null : xpLevelProgress(totalXp);
  // translateX keeps the rounded end of the fill; scaling it would squash it.
  const offset = `${((1 - (progress?.ratio ?? 0)) * 100).toFixed(2)}%`;

  return (
    <div className="mt-2.5 border-t border-slate-200/80 pt-2.5 dark:border-slate-700/70">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span
          id={labelId}
          className="flex min-w-0 items-center gap-1.5 whitespace-nowrap font-extrabold text-sky-700 dark:text-sky-300"
        >
          <LevelMedalIcon className="h-[17px] w-[17px] shrink-0" />
          Cấp {progress ? progress.level : "…"}
        </span>
        {progress && totalXp !== null && (
          <span className="whitespace-nowrap font-semibold tabular-nums text-slate-600 dark:text-slate-300">
            {formatXp(totalXp)} / {formatXp(progress.nextLevelXp)} XP
          </span>
        )}
      </div>

      <div
        role="progressbar"
        aria-labelledby={labelId}
        aria-describedby={helpId}
        aria-valuemin={0}
        aria-valuemax={progress?.span ?? 100}
        aria-valuenow={progress?.earned ?? 0}
        aria-valuetext={
          progress ? `Còn ${formatXp(progress.remaining)} XP để lên Cấp ${progress.nextLevel}` : "Đang tải cấp độ"
        }
        className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
      >
        <div
          className="h-full w-full rounded-full bg-sky-500 motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out dark:bg-sky-400"
          style={{ transform: `translateX(-${offset})` }}
        />
      </div>

      <p id={helpId} className="mt-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
        {progress ? (
          <>
            Còn{" "}
            <span className="font-bold tabular-nums text-slate-800 dark:text-slate-200">
              {formatXp(progress.remaining)} XP
            </span>{" "}
            để lên Cấp {progress.nextLevel}
          </>
        ) : (
          "Đang tải cấp độ…"
        )}
      </p>
    </div>
  );
}
