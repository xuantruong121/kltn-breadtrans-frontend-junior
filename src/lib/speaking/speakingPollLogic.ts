/**
 * How the speaking page keeps asking for a submission's grade.
 *
 * The worker retries a grading up to 4 times with 1, 5 and 15 minute waits,
 * so a final result (graded or FAILED) can arrive about 21 minutes after the
 * recording. Polling fast for the first ~8 minutes and then stopping left the
 * page on "đang chấm" forever when the realtime event did not arrive.
 * After the fast phase it now checks every 30 seconds, up to 40 minutes.
 */
export const SPEAKING_FAST_POLL_ATTEMPTS = 120;
export const SPEAKING_SLOW_POLL_MS = 30_000;
export const SPEAKING_POLL_LIMIT_MS = 40 * 60_000;

export type SpeakingPollStep =
  | { kind: "stop" }
  | { kind: "wait"; delayMs: number; slowPhaseStarted: boolean };

export function speakingPollStep(attempt: number, elapsedMs: number): SpeakingPollStep {
  if (elapsedMs > SPEAKING_POLL_LIMIT_MS) return { kind: "stop" };
  if (attempt > SPEAKING_FAST_POLL_ATTEMPTS)
    return {
      kind: "wait",
      delayMs: SPEAKING_SLOW_POLL_MS,
      slowPhaseStarted: attempt === SPEAKING_FAST_POLL_ATTEMPTS + 1,
    };
  const delayMs = attempt === 0 ? 0 : attempt <= 5 ? 1000 : attempt <= 15 ? 2000 : 5000;
  return { kind: "wait", delayMs, slowPhaseStarted: false };
}
