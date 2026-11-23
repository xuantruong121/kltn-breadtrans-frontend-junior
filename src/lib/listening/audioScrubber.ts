/**
 * Pure helpers for the listening audio scrubber (components/listening/AudioScrubber.tsx):
 * how much of the track has played, and how wide the orange played bar is so it ends
 * exactly under the centre of the round thumb, the way a YouTube progress bar does.
 */

/** Diameter of the scrubber thumb in px. globals.css (.audio-scrubber) uses the same value. */
export const SCRUBBER_THUMB_PX = 14;

/** Share of the track already played, 0..1. 0 while the duration is unknown or not a number. */
export function scrubberProgress(value: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
  return Math.min(1, Math.max(0, value / max));
}

/**
 * CSS width of the played bar. A native range thumb travels over the track width minus its
 * own width, so its centre sits at progress * (100% - thumb) + thumb / 2.
 */
export function scrubberFill(progress: number): string {
  return `calc(${progress} * (100% - ${SCRUBBER_THUMB_PX}px) + ${SCRUBBER_THUMB_PX / 2}px)`;
}
