import { ARENA_STREAK_BADGE } from "./badges.ts";

/**
 * The goal under the record: the "Đấu Sĩ Bất Bại" badge, earned once the
 * longest streak reaches the target; until then, how far the current streak is.
 */
export function streakGoal(current: number, longest: number) {
  const target = ARENA_STREAK_BADGE;
  if (longest >= target) return { done: true, value: target, target, left: 0 };
  const value = Math.min(current, target);
  return { done: false, value, target, left: target - value };
}

/** Under the current win streak: the best one when it is higher, else that this is the best. */
export function streakNote(current: number, longest: number): string {
  if (longest > current) return `dài nhất ${longest}`;
  return current > 0 ? "kỷ lục của bạn" : "chưa có";
}
