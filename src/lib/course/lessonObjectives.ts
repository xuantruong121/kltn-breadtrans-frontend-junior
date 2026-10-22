/** Known Vietnamese/English headings that identify a learning-objectives
 * block. These are specific objectives headings, not generic ones a
 * "Mở đầu"/intro section would use, so a heading match alone is a reliable
 * signal. */
const OBJECTIVE_HEADING_CANDIDATES = new Set([
  "muc tieu bai hoc",
  "muc tieu",
  "learning objectives",
  "lesson objectives",
  "objectives",
]);

/** trim + lowercase + collapse whitespace + strip harmless trailing
 * punctuation + strip Vietnamese diacritics for heading comparison
 * (diacritic-insensitive matching keeps "Mục tiêu" recognizable even if an
 * author drops accents). */
function normalizeHeadingForMatch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[:：.。!?！？]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Deterministic, non-AI check for whether a Section is a learning-objectives
 * block that duplicates the Lesson's `learningObjectives` (already shown in
 * the page header) and can be safely hidden from the learner view. Hides the
 * Section whenever it carries a recognized objectives heading AND the Lesson
 * actually has objectives to show in the header — the heading candidates are
 * specific objectives headings, not ones a genuine intro would use, so
 * heading alone is sufficient. */
export function isDuplicateLearningObjectivesSection(
  section: { heading?: string },
  learningObjectives: unknown,
): boolean {
  const objectives = Array.isArray(learningObjectives)
    ? learningObjectives.filter(
        (item): item is string =>
          typeof item === "string" && Boolean(item.trim()),
      )
    : [];
  if (!objectives.length) return false;

  const heading = normalizeHeadingForMatch(section.heading ?? "");
  return OBJECTIVE_HEADING_CANDIDATES.has(heading);
}
