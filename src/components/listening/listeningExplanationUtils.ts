import type { QuestionExplanation } from "@/lib/api/services/quiz.service";

export interface ParsedStructuredExplanation {
  type: "structured";
  vi: string;
  evidence?: string;
  keyPhrase?: string;
  vocabularyNote?: string;
}

export interface ParsedLegacyExplanation {
  type: "legacy";
  text: string;
  fallbackNotice: string;
}

export type ParsedExplanation =
  | ParsedStructuredExplanation
  | ParsedLegacyExplanation;

/**
 * Pure pedagogical explanation parser.
 * - Extracts primary Vietnamese explanation (vi)
 * - Safely extracts optional evidence, keyPhrase, vocabularyNote
 * - Gracefully falls back to labeled legacy view if only plain text exists
 * - Returns null if no explanation exists (prevents rendering empty cards)
 */
export function parseQuestionExplanation(
  explanation: QuestionExplanation | unknown,
): ParsedExplanation | null {
  if (!explanation) return null;

  // Structured object with `vi`
  if (typeof explanation === "object" && explanation !== null) {
    const obj = explanation as Record<string, unknown>;
    const vi = typeof obj.vi === "string" ? obj.vi.trim() : "";
    if (vi) {
      const evidence =
        typeof obj.evidence === "string" && obj.evidence.trim()
          ? obj.evidence.trim()
          : undefined;
      const keyPhrase =
        typeof obj.keyPhrase === "string" && obj.keyPhrase.trim()
          ? obj.keyPhrase.trim()
          : undefined;
      const vocabularyNote =
        typeof obj.vocabularyNote === "string" && obj.vocabularyNote.trim()
          ? obj.vocabularyNote.trim()
          : undefined;

      return {
        type: "structured",
        vi,
        evidence,
        keyPhrase,
        vocabularyNote,
      };
    }
  }

  // Plain string or legacy object without `vi`
  let legacyText = "";
  if (typeof explanation === "string") {
    legacyText = explanation.trim();
  } else if (typeof explanation === "object" && explanation !== null) {
    const obj = explanation as Record<string, unknown>;
    if (typeof obj.text === "string") legacyText = obj.text.trim();
    else if (typeof obj.content === "string") legacyText = obj.content.trim();
  }

  if (!legacyText) return null;

  return {
    type: "legacy",
    text: legacyText,
    fallbackNotice: "Giải thích chi tiết đang được cập nhật.",
  };
}
