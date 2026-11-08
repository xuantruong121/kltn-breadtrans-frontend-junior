/**
 * The weekly league as the backend runs it (gamification.service.ts,
 * triggerWeeklyCron): five tiers stored by their Vietnamese names, ranked by
 * the week's XP; at 00:01 on Monday (Asia/Ho_Chi_Minh) the top 20 % of each
 * tier move up, the bottom 20 % move down and the week's XP returns to 0.
 */
export const LEAGUE_TIERS = ["Đồng", "Bạc", "Vàng", "Bạch Kim", "Kim Cương"] as const;
export type LeagueTier = (typeof LEAGUE_TIERS)[number];

export const DEFAULT_TIER: LeagueTier = "Đồng";

export function isLeagueTier(value: unknown): value is LeagueTier {
  return typeof value === "string" && (LEAGUE_TIERS as readonly string[]).includes(value);
}

/** Query for one tab: a tier name, or "ALL" for every tier together. */
export function leagueQuery(tab: LeagueTier | "ALL"): { tier?: LeagueTier; scope: "tier" | "all" } {
  return tab === "ALL" ? { scope: "all" } : { tier: tab, scope: "tier" };
}

/**
 * Promotion and demotion zones for a tier of `size` learners, as the cron
 * computes them: ranks 1..promoteCount move up; ranks from demoteFrom move down.
 * The lowest tier never moves down and the highest never moves up.
 */
export function leagueZones(size: number, tier: LeagueTier) {
  const index = LEAGUE_TIERS.indexOf(tier);
  const n = Math.max(0, Math.floor(size));
  const promoteCount = n === 0 || index === LEAGUE_TIERS.length - 1 ? 0 : Math.max(1, Math.floor(n * 0.2));
  // The cron's bottomStart, as a 1-based rank; nobody is demoted from the lowest tier.
  const bottomStart = Math.max(n - Math.floor(n * 0.2), Math.max(1, Math.floor(n * 0.2)));
  const demoteFrom = index === 0 || bottomStart >= n ? null : bottomStart + 1;
  return { promoteCount, demoteFrom };
}

/**
 * XP still needed to enter the promotion zone: one more than the learner at
 * the cut-off, or 0 when already inside. Null when the tier has no promotion
 * or the cut-off learner is not in the list.
 */
export function xpToPromotion(
  myRank: number,
  myXp: number,
  promoteCount: number,
  entries: ReadonlyArray<{ rank: number; weeklyExp: number }>,
): number | null {
  if (promoteCount <= 0) return null;
  if (myRank <= promoteCount) return 0;
  const cutoff = entries.find((entry) => entry.rank === promoteCount);
  if (!cutoff) return null;
  return Math.max(1, cutoff.weeklyExp - myXp + 1);
}

/**
 * XP needed to climb out of the demotion zone: one more than the learner just
 * above it. Null when not in the zone or that learner is not in the list.
 */
export function xpToLeaveDemotion(
  myRank: number,
  myXp: number,
  demoteFrom: number | null,
  entries: ReadonlyArray<{ rank: number; weeklyExp: number }>,
): number | null {
  if (demoteFrom === null || myRank < demoteFrom) return null;
  const safe = entries.find((entry) => entry.rank === demoteFrom - 1);
  if (!safe) return null;
  return Math.max(1, safe.weeklyExp - myXp + 1);
}

/** "2 ngày 05:12" or "05:12:09" until the reset. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86_400);
  const hh = String(Math.floor((total % 86_400) / 3600)).padStart(2, "0");
  const mm = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return days > 0 ? `${days} ngày ${hh}:${mm}` : `${hh}:${mm}:${ss}`;
}

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The next league reset: Monday 00:01 in Vietnam (UTC+7, no daylight saving). */
export function nextLeagueReset(nowMs: number): number {
  const local = nowMs + VN_OFFSET_MS;
  const day = new Date(local).getUTCDay(); // 0 Sunday … 6 Saturday, in VN time
  const midnight = local - (local % DAY_MS);
  let reset = midnight + ((8 - day) % 7) * DAY_MS + 60_000;
  if (reset <= local) reset += 7 * DAY_MS;
  return reset - VN_OFFSET_MS;
}
