/**
 * Exam length by product and exam type, as in the ETS structure the backend
 * template registry uses. A full test has a fixed length (the server applies it
 * whatever the form sends); only L&R part practice takes a length the admin
 * chooses.
 */
export type ExamVariant = "TOEIC_LR" | "TOEIC_SW" | "TOEIC_4_SKILLS";
export type ExamType = "FULL_TEST" | "PRACTICE_BY_PART";
export type PartGroup = "LISTENING" | "READING";

export const FULL_TEST_MINUTES: Record<ExamVariant, number> = {
  TOEIC_LR: 120,
  TOEIC_SW: 80,
  TOEIC_4_SKILLS: 200,
};

const FULL_TEST_BREAKDOWN: Record<ExamVariant, string> = {
  TOEIC_LR: "Listening 45 + Reading 75 phút",
  TOEIC_SW: "Speaking 20 + Writing 60 phút",
  TOEIC_4_SKILLS: "Listening & Reading 120 + Speaking 20 + Writing 60 phút",
};

const FULL_TEST_LABEL: Record<ExamVariant, string> = {
  TOEIC_LR: "Full Test 200 câu",
  TOEIC_SW: "Full Test (11 câu nói, 8 câu viết)",
  TOEIC_4_SKILLS: "Full Test (L&R, Speaking, Writing)",
};

/** Part practice follows the ETS section its Parts belong to. */
export const PART_GROUP_MINUTES: Record<PartGroup, number> = { LISTENING: 45, READING: 75 };

export const PART_GROUP_LABEL: Record<PartGroup, string> = {
  LISTENING: "Part 1–4 (Listening)",
  READING: "Part 5–7 (Reading)",
};

const variantOf = (code: string): ExamVariant =>
  code === "TOEIC_SW" || code === "TOEIC_4_SKILLS" ? code : "TOEIC_LR";

/** Part practice exists for Listening & Reading only. */
export function allowedExamTypes(variantCode: string): ExamType[] {
  return variantOf(variantCode) === "TOEIC_LR" ? ["FULL_TEST", "PRACTICE_BY_PART"] : ["FULL_TEST"];
}

export function examTypeLabel(variantCode: string, type: ExamType): string {
  return type === "FULL_TEST" ? FULL_TEST_LABEL[variantOf(variantCode)] : "Luyện tập theo Part";
}

/** A full test, or any exam that is not L&R, keeps the ETS length. */
export function durationLocked(variantCode: string, type: string | undefined): boolean {
  return type !== "PRACTICE_BY_PART" || variantOf(variantCode) !== "TOEIC_LR";
}

export function defaultExamMinutes(variantCode: string, type: string | undefined, partGroup: PartGroup): number {
  return durationLocked(variantCode, type) ? FULL_TEST_MINUTES[variantOf(variantCode)] : PART_GROUP_MINUTES[partGroup];
}

/** How the fixed length is made up, shown under a locked duration. */
export function durationBreakdown(variantCode: string): string {
  return FULL_TEST_BREAKDOWN[variantOf(variantCode)];
}

/** The type kept when the product changes: a type the new product does not offer becomes a full test. */
export function examTypeFor(variantCode: string, type: ExamType): ExamType {
  return allowedExamTypes(variantCode).includes(type) ? type : "FULL_TEST";
}
