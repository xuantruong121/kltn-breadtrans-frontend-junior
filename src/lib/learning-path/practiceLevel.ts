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

/**
 * The four levels in order. Since 2026-11-27 (owner) every content item, deck
 * and grammar topic carries one of them; the admin picks from this list.
 */
export const PRACTICE_LEVELS: readonly PracticeLevel[] = ["STARTER", "BASIC", "INTERMEDIATE", "ADVANCED"];

/** Options for a level select: value and Vietnamese label. */
export const PRACTICE_LEVEL_OPTIONS: ReadonlyArray<{ value: PracticeLevel; label: string }> = PRACTICE_LEVELS.map(
  (value) => ({ value, label: PRACTICE_LEVEL_LABEL[value] }),
);

export function isPracticeLevel(value: unknown): value is PracticeLevel {
  return (PRACTICE_LEVELS as readonly unknown[]).includes(value);
}

/** Sort comparator, Mất gốc first; anything else last. */
export function comparePracticeLevel(a: string | null | undefined, b: string | null | undefined): number {
  const rank = (level: string | null | undefined) => {
    const index = (PRACTICE_LEVELS as readonly string[]).indexOf(level ?? "");
    return index < 0 ? PRACTICE_LEVELS.length : index;
  };
  return rank(a) - rank(b);
}

const LEVEL_ORDER = PRACTICE_LEVELS;

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
