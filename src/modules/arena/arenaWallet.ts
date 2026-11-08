/**
 * Queries that show a learner's Bánh Mì, by key prefix. The header reads
 * ["user-stats", id], GamificationBar ["profile", id] and the pet page
 * ["market-balance"]; invalidating by prefix refreshes every copy, so a stake,
 * a payout or a refund shows without reloading the page.
 */
export const WALLET_QUERY_KEYS: readonly (readonly string[])[] = [
  ["user-stats"],
  ["profile"],
  ["market-balance"],
];

/**
 * After a match ends: the wallet, the weekly league and the learner's own
 * place in it (a match pays XP), the arena record and the badges (a win may
 * complete "Đấu Sĩ Bất Bại").
 */
export const MATCH_END_QUERY_KEYS: readonly (readonly string[])[] = [
  ...WALLET_QUERY_KEYS,
  ["leaderboard"],
  ["arena-snippet"],
  ["arena-stats"],
  ["my-badges"],
  ["badge-progress"],
];
