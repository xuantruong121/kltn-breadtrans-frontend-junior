/**
 * A learner's level from total XP, the same rule as the backend's xpLevel
 * (ranking.logic.ts) that the ranking page shows: level L starts at
 * 50 · L · (L − 1) XP in total, so Cấp 2 at 100, Cấp 3 at 300, Cấp 5 at
 * 1.000, and each level takes 100 XP more than the one before. No React.
 */
export function levelStartXp(level: number): number {
  return 50 * level * (level - 1);
}

export function xpLevel(totalXp: number): number {
  const xp = Number.isFinite(totalXp) ? Math.max(0, totalXp) : 0;
  let level = Math.floor((1 + Math.sqrt(1 + (8 * xp) / 100)) / 2);
  // Guard the floating point at exact thresholds, as the backend does.
  while (levelStartXp(level + 1) <= xp) level += 1;
  while (level > 1 && levelStartXp(level) > xp) level -= 1;
  return Math.max(1, level);
}

export type XpLevelProgress = {
  level: number;
  nextLevel: number;
  levelStartXp: number;
  nextLevelXp: number;
  /** XP earned inside the current level. */
  earned: number;
  /** XP the current level takes from its start to the next level. */
  span: number;
  remaining: number;
  /** 0 to 1: how full the bar is. */
  ratio: number;
};

/**
 * The bar fills between the current level's start and the next level's, not
 * over the whole total, so it starts empty again right after a level up.
 */
export function xpLevelProgress(totalXp: number): XpLevelProgress {
  const xp = Number.isFinite(totalXp) ? Math.max(0, totalXp) : 0;
  const level = xpLevel(xp);
  const start = levelStartXp(level);
  const next = levelStartXp(level + 1);
  const span = next - start;
  const earned = xp - start;
  return {
    level,
    nextLevel: level + 1,
    levelStartXp: start,
    nextLevelXp: next,
    earned,
    span,
    remaining: next - xp,
    ratio: Math.min(1, Math.max(0, earned / span)),
  };
}

/** 1436 -> "1.436", the Vietnamese thousands mark, without relying on ICU. */
export function formatXp(value: number): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
