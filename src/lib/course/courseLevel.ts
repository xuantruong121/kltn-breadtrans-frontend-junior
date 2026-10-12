export type CourseLevelFilter = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

/**
 * Maps the level labels returned by the catalog API to the filter vocabulary.
 * The API may return CEFR ranges (for example, A1-A2) while the filter uses
 * the broader learner-facing groups.
 */
export function getCourseLevelFilterKey(
  level: string | null | undefined,
): CourseLevelFilter | null {
  if (!level) return null;

  const normalized = level
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, "");

  if (
    normalized === "BEGINNER" ||
    normalized === "BASIC" ||
    normalized === "COBAN" ||
    /^(?:A1|A2)(?:-A[12])?$/.test(normalized)
  ) {
    return "BEGINNER";
  }

  if (
    normalized === "INTERMEDIATE" ||
    normalized === "TRUNGCAP" ||
    /^(?:B1|B2)(?:-B[12])?$/.test(normalized)
  ) {
    return "INTERMEDIATE";
  }

  if (
    normalized === "ADVANCED" ||
    normalized === "NANGCAO" ||
    /^(?:C1|C2)(?:-C[12])?$/.test(normalized) ||
    normalized === "B2-C1"
  ) {
    return "ADVANCED";
  }

  return null;
}
