/**
 * The round clock, from the server's start time and duration (the server
 * decides when a round ends; the bar only shows it). Pure.
 */
export type TimerPhase = "calm" | "warn" | "danger";

/** Amber from 7 seconds left, rose under 5. */
export const WARN_FROM_MS = 7_000;
export const DANGER_UNDER_MS = 5_000;

export function roundTimer(serverStartTime: number, durationSeconds: number, nowMs: number) {
  const total = Math.max(1, durationSeconds) * 1000;
  const remainingMs = Math.min(total, Math.max(0, serverStartTime + total - nowMs));
  const phase: TimerPhase =
    remainingMs < DANGER_UNDER_MS ? "danger" : remainingMs <= WARN_FROM_MS ? "warn" : "calm";
  return {
    remainingMs,
    /** 1 when the round starts, 0 when it ends. */
    fraction: remainingMs / total,
    /** Whole seconds shown beside the bar: 15 … 1, then 0. */
    seconds: Math.ceil(remainingMs / 1000),
    phase,
  };
}

/** A tick each whole second during the last five, once per second. */
export function shouldTick(previousSeconds: number | null, seconds: number) {
  return seconds > 0 && seconds <= 5 && previousSeconds !== seconds;
}
