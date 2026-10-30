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

export function practiceLevelLabel(level: PracticeLevel | null | undefined): string {
  return level ? PRACTICE_LEVEL_LABEL[level] : "Chưa xác định";
}
