import { normalizeSectionContent } from "./sectionContent.ts";

/** Known Vietnamese/English headings that could introduce a learning-
 * objectives block. Heading match alone is only a candidate signal — it
 * never hides a Section by itself (see isDuplicateLearningObjectivesSection). */
const OBJECTIVE_HEADING_CANDIDATES = new Set([
  "muc tieu bai hoc",
  "muc tieu",
  "learning objectives",
  "lesson objectives",
  "objectives",
]);

/** trim + lowercase + collapse whitespace + strip harmless trailing
 * punctuation + strip Vietnamese diacritics for heading comparison only
 * (diacritic-insensitive matching keeps "Mục tiêu" recognizable even if an
 * author drops accents; content comparison below keeps diacritics since
 * wording differences matter there). */
function normalizeHeadingForMatch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[:：.。!?！？]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** trim + lowercase + collapse whitespace + strip harmless punctuation.
 * Keeps diacritics — this is for comparing actual wording, not headings. */
function normalizeTextForMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[.,;:!?"'""''()]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Deterministic, non-AI check for whether a Section merely repeats the
 * Lesson's `learningObjectives` (already shown in the header) and can be
 * safely hidden from the learner view. Requires BOTH a recognized objectives
 * heading AND content that textually matches the objectives list in both
 * directions (every objective appears in the Section, and the Section has no
 * other meaningful content) — heading alone never hides a Section, so a
 * genuine INTRO/"Mở đầu" that merely mentions goals is always kept. */
export function isDuplicateLearningObjectivesSection(
  section: { heading?: string; content?: unknown },
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
  if (!OBJECTIVE_HEADING_CANDIDATES.has(heading)) return false;

  const normalizedObjectives = objectives
    .map((item) => normalizeTextForMatch(item))
    .filter(Boolean);

  // Check bullets AND paragraphs together — a Section can mirror the
  // objectives as bullets while still carrying an extra framing paragraph
  // with real, non-duplicate content, which must keep the Section visible.
  const normalized = normalizeSectionContent(section.content);
  const sectionLines = [...normalized.bullets, ...normalized.paragraphs]
    .map((line) => normalizeTextForMatch(line))
    .filter(Boolean);
  if (!sectionLines.length) return false;

  const matches = (needle: string, haystack: string) =>
    needle === haystack || needle.includes(haystack) || haystack.includes(needle);

  const everyObjectiveCovered = normalizedObjectives.every((objective) =>
    sectionLines.some((line) => matches(objective, line)),
  );
  const noExtraContent = sectionLines.every((line) =>
    normalizedObjectives.some((objective) => matches(objective, line)),
  );

  return everyObjectiveCovered && noExtraContent;
}
