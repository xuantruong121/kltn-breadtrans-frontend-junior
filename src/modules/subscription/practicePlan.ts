/**
 * Plan that unlocks a locked practice item, mirroring the backend matrix
 * (practice-level.ts): Listening/Reading B1+ need PLUS, Speaking/Writing B1+
 * need PRO. The API sends `requiredPlan` on each item; the skill rule is only
 * the fallback for an older response without it.
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
