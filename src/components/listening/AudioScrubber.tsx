"use client";

import type { ChangeEventHandler } from "react";

import { scrubberFill, scrubberProgress } from "@/lib/listening/audioScrubber";

type AudioScrubberProps = {
  /** Current time in seconds. */
  value: number;
  /** Track length in seconds; 0 while it is still unknown. */
  max: number;
  step?: number;
  onChange: ChangeEventHandler<HTMLInputElement>;
  disabled?: boolean;
  ariaLabel: string;
  /** What a screen reader says for the position, e.g. "00:03 / 01:20". */
  valueText?: string;
  /** md: the Nghe hiểu player; sm: the compact Nghe chép bars. */
  size?: "md" | "sm";
  className?: string;
};

/**
 * Seek bar for the listening players, styled like a video progress bar: a grey track,
 * the played part in orange up to the centre of the round thumb, and a slightly thicker
 * track and bigger thumb on hover. The native range input stays on top, so dragging,
 * clicking, keyboard steps and screen readers work as before. The thumb is styled in
 * globals.css (.audio-scrubber).
 */
export function AudioScrubber({
  value,
  max,
  step = 0.1,
  onChange,
  disabled = false,
  ariaLabel,
  valueText,
  size = "md",
  className = "",
}: AudioScrubberProps) {
  const progress = scrubberProgress(value, max);
  // Track 6px (4px compact), 2px thicker while the pointer is over the bar.
  const track = size === "sm" ? "h-1 group-hover:h-1.5" : "h-1.5 group-hover:h-2";

  return (
    <div className={`group relative flex h-5 min-w-0 flex-1 items-center ${disabled ? "opacity-60" : ""} ${className}`}>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 overflow-hidden rounded-full bg-slate-200 transition-[height] duration-150 motion-reduce:transition-none dark:bg-slate-700 ${track}`}
      >
        <div className="h-full rounded-full bg-amber-500" style={{ width: scrubberFill(progress) }} />
      </div>
      <input
        type="range"
        min={0}
        max={max || 100}
        step={step}
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-valuetext={valueText}
        className="audio-scrubber relative h-5 w-full cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed"
      />
    </div>
  );
}
