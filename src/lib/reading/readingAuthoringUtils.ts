export const READING_MICRO_SKILLS = [
  "DETAIL",
  "PURPOSE",
  "INFERENCE",
  "MAIN_IDEA",
  "PROMOTION",
  "VOCAB_IN_CONTEXT",
] as const;

export type ReadingCorrectOption =
  | { available: true; answer: string; index: number }
  | { available: false; reason: string };

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function resolveReadingAuthoringAnswer(
  content: unknown,
): ReadingCorrectOption {
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return { available: false, reason: "Nội dung câu hỏi không hợp lệ" };
  }
  const value = content as Record<string, unknown>;
  const options = value.options;
  const index = value.correctIndex;
  if (Array.isArray(options) && Number.isInteger(index)) {
    const numericIndex = index as number;
    if (numericIndex < 0 || numericIndex >= options.length) {
      return { available: false, reason: "correctIndex ngoài phạm vi" };
    }
    const answer = asText(options[numericIndex]);
    if (!answer) return { available: false, reason: "Đáp án chuẩn bị trống" };
    const legacy = asText(value.correct) ?? asText(value.correctAnswer);
    if (legacy && legacy !== answer) {
      return {
        available: false,
        reason: "Đáp án canonical và legacy không khớp",
      };
    }
    return { available: true, answer, index: numericIndex };
  }
  if (Array.isArray(options) && index !== undefined) {
    return { available: false, reason: "correctIndex phải là số nguyên" };
  }
  const legacy = asText(value.correct) ?? asText(value.correctAnswer);
  return legacy
    ? { available: true, answer: legacy, index: -1 }
    : { available: false, reason: "Chưa có đáp án chuẩn" };
}
