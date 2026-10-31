/**
 * Internal practice levels ("mức luyện tập đề xuất", owner decision
 * 2026-10-30). BreadTrans practice levels only: never CEFR, never a
 * certificate. Mirrors backend learning-path/placement.logic.ts.
 */
export type PracticeLevel = "STARTER" | "BASIC" | "INTERMEDIATE" | "ADVANCED";
export type PracticeSkill = "LISTENING" | "READING" | "SPEAKING" | "WRITING";

export type PracticePlacement = {
  skills: Record<PracticeSkill, PracticeLevel | null>;
  overall: PracticeLevel | null;
  partial: boolean;
};

export const PRACTICE_LEVEL_LABEL: Record<PracticeLevel, string> = {
  STARTER: "Mất gốc",
  BASIC: "Cơ bản",
  INTERMEDIATE: "Trung cấp",
  ADVANCED: "Nâng cao",
};

export const PRACTICE_SKILL_LABEL: Record<PracticeSkill, string> = {
  LISTENING: "Nghe",
  READING: "Đọc",
  SPEAKING: "Nói",
  WRITING: "Viết",
};

export const PRACTICE_SKILL_ORDER: PracticeSkill[] = ["LISTENING", "READING", "SPEAKING", "WRITING"];

const LEVEL_ORDER: PracticeLevel[] = ["STARTER", "BASIC", "INTERMEDIATE", "ADVANCED"];

/** Skills placed under the overall level: what the learner should work on first. */
export function skillsBelowOverall(
  skills: Partial<Record<PracticeSkill, PracticeLevel | null>>,
  overall: PracticeLevel | null | undefined,
): PracticeSkill[] {
  if (!overall) return [];
  const rank = LEVEL_ORDER.indexOf(overall);
  return PRACTICE_SKILL_ORDER.filter((skill) => {
    const level = skills[skill];
    return Boolean(level) && LEVEL_ORDER.indexOf(level!) < rank;
  });
}

export function prioritySkillsText(skills: PracticeSkill[]): string {
  return skills.map((skill) => PRACTICE_SKILL_LABEL[skill]).join(", ");
}

export function practiceLevelLabel(level: PracticeLevel | null | undefined): string {
  return level ? PRACTICE_LEVEL_LABEL[level] : "Chưa xác định";
}
