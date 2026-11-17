/**
 * What the learner's open pages refetch when the server says a submission's
 * rewards are applied (socket "user:progress_updated"). Rewards run from a
 * queue after the request, so the page cannot refetch on submit alone; before
 * this the streak only moved after a reload (owner 2026-11-17).
 *
 * One-element keys are prefixes: ["user-stats"] refreshes
 * ["user-stats", userId] too.
 */
export const PROGRESS_QUERY_KEYS: readonly (readonly string[])[] = [
  ["user-stats"],
  ["profile"],
  ["market-balance"],
  ["dashboard-today"],
  ["myQuests"],
  ["daily-quests"],
  ["my-pet"],
  ["user-skills-summary"],
  ["learning-history"],
];
