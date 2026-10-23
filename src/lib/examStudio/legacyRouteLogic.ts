/**
 * Phase E — decides whether a legacy ToeicAssessment can be edited directly
 * or must route to the canonical Exam Studio. Pure logic, no JSX, so it's
 * testable without a DOM.
 */
export function legacyAssessmentTreatment(
  assessment: { examId?: number | null } | null,
): "EDITABLE" | "REDIRECT_TO_STUDIO" {
  if (assessment?.examId) return "REDIRECT_TO_STUDIO";
  return "EDITABLE";
}
