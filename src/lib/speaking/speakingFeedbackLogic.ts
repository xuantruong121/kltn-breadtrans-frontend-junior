/**
 * What the Speaking result shows as written feedback, from the backend fields
 * only (`aiFeedback.feedback`, `aiFeedback.suggestions`, `feedbackStatus`).
 *
 * The score and metrics come from Azure and are shown elsewhere. The written
 * feedback is either Azure's own summary ("Điểm phát âm: …", the template the
 * backend writes at grading time) or, for read-aloud tasks, wording that the
 * optional enrichment step rewrote afterwards. A scripted Azure summary only
 * repeats the gauges, so it is not shown again; a free answer's summary also
 * carries speech rate and intonation, so it is.
 */

export type SpeakingFeedbackInput = {
  scripted: boolean;
  feedbackStatus?: string | null;
  feedback?: unknown;
  suggestions?: unknown;
};

export type SpeakingFeedbackView = {
  /** Enrichment still running: the result is final, the wording may change. */
  pending: boolean;
  /** Enrichment ended without new wording; the graded result stands. */
  enrichmentFailed: boolean;
  paragraph: { title: string; text: string; collapsible: boolean } | null;
  suggestions: string[];
};

/** The backend's Azure-derived summary always starts this way. */
const AZURE_SUMMARY = /^Điểm phát âm:/;
/** Longer than this, the paragraph starts collapsed to a few lines. */
export const COLLAPSE_AFTER_CHARS = 320;

const clean = (value: unknown): string =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";

export function selectSpeakingFeedback(
  input: SpeakingFeedbackInput,
): SpeakingFeedbackView {
  const pending =
    input.feedbackStatus === "PENDING" || input.feedbackStatus === "PROCESSING";
  const text = clean(input.feedback);
  const azureSummary = AZURE_SUMMARY.test(text);

  let paragraph: SpeakingFeedbackView["paragraph"] = null;
  if (text && !azureSummary)
    paragraph = {
      title: "Nhận xét chi tiết",
      text,
      collapsible: text.length > COLLAPSE_AFTER_CHARS,
    };
  else if (text && !input.scripted)
    paragraph = { title: "Tóm tắt đánh giá", text, collapsible: false };

  const seen = new Set<string>(paragraph ? [paragraph.text.toLowerCase()] : []);
  const suggestions: string[] = [];
  for (const item of Array.isArray(input.suggestions) ? input.suggestions : []) {
    const s = clean(item);
    if (!s || seen.has(s.toLowerCase())) continue;
    seen.add(s.toLowerCase());
    suggestions.push(s);
  }

  return {
    pending,
    enrichmentFailed: input.feedbackStatus === "FAILED",
    paragraph,
    suggestions,
  };
}
