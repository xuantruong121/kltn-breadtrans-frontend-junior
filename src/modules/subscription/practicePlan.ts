/**
 * Plan that unlocks a locked practice item. The backend matrix
 * (practice-level.ts, owner 2026-10-30) decides it and the API sends
 * `requiredPlan` on each item: Listening/Reading free except dictation B1+
 * (PLUS); Speaking/Writing B1-B2 PLUS, C1-C2 PRO. The skill rule below is
 * only the fallback for an older response without it: the highest plan the
 * skill can need, so a fallback never under-states the price.
 */
export type PracticeSkillType = "LISTENING" | "READING" | "SPEAKING" | "WRITING";
export type PaidPlanCode = "PLUS" | "PRO";

export function advancedPlanForSkill(skill: PracticeSkillType): PaidPlanCode {
  return skill === "SPEAKING" || skill === "WRITING" ? "PRO" : "PLUS";
}

export function unlockPlanFor(
  skill: PracticeSkillType,
  requiredPlan?: string | null,
): PaidPlanCode {
  if (requiredPlan === "PLUS" || requiredPlan === "PRO") return requiredPlan;
  return advancedPlanForSkill(skill);
}

export function plansHrefFor(plan: PaidPlanCode): string {
  return `/plans?highlight=${plan.toLowerCase()}`;
}
