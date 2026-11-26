/**
 * What the learner's open pages refetch when the server says something of
 * theirs changed outside this page (owner 2026-11-17: no more "F5 to see it").
 *
 * One-element keys are prefixes: ["user-stats"] refreshes
 * ["user-stats", userId] too. Only lists and totals are here, never the
 * detail of an exercise being done, so nothing a learner is typing resets.
 */

/**
 * Socket "user:progress_updated": a submission's rewards and progress were
 * applied after the request (XP, streak, Bánh Mì, quests, badges, the
 * mistakes it found, a practice level it unlocked).
 */
export const PROGRESS_QUERY_KEYS: readonly (readonly string[])[] = [
  ["user-stats"],
  ["profile"],
  ["market-balance"],
  ["dashboard-today"],
  ["myQuests"],
  ["daily-quests"],
  ["my-pet"],
  ["my-badges"],
  ["user-skills-summary"],
  // the dashboard's "Kết quả học tập"
  ["learning-summary"],
  ["learning-history"],
  ["mistakes"],
  ["notifications"],
  ["learning-path-profile"],
  ["learning-path-progress"],
  ["learning-path-today"],
  ["learning-path-week"],
  ["listeningPractices"],
  ["listening-practices"],
  ["reading-exercises"],
  ["speaking-exercises"],
  ["writing-topics"],
];

/**
 * Socket "user:plan_updated": a plan was granted, confirmed, extended or
 * revoked, often by someone else (an admin, the PayOS webhook). The plan, the
 * shields it gave, what it unlocks and its notice.
 */
export const PLAN_UPDATE_QUERY_KEYS: readonly (readonly string[])[] = [
  ["effective-plan"],
  ["plan-catalog"],
  ["my-plan-purchases"],
  ["plan-expiry-summary"],
  ["plan-daily-usage"],
  ["user-stats"],
  ["profile"],
  ["notifications"],
  ["vocab-topics"],
  ["listeningPractices"],
  ["listening-practices"],
  ["reading-exercises"],
  ["speaking-exercises"],
  ["writing-topics"],
];
