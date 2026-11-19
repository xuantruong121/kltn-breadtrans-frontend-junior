export type ReadingTrendDirection = "INSUFFICIENT_DATA" | "IMPROVING" | "DECLINING" | "STABLE";

export function readingTrendLabel(direction: ReadingTrendDirection): string {
  switch (direction) {
    case "IMPROVING":
      return "Đang tăng";
    case "DECLINING":
      return "Đang giảm";
    case "STABLE":
      return "Ổn định";
    default:
      return "Chưa đủ dữ liệu";
  }
}

const READING_SUBSKILL_LABELS: Record<string, string> = {
  MAIN_IDEA: "Nắm ý chính",
  DETAIL: "Tìm thông tin chi tiết",
  SPECIFIC_DETAIL: "Tìm thông tin chi tiết",
  INFERENCE: "Suy luận",
  PURPOSE: "Xác định mục đích",
  VOCAB_IN_CONTEXT: "Hiểu từ trong ngữ cảnh",
  VOCABULARY_IN_CONTEXT: "Hiểu từ trong ngữ cảnh",
  MEANING_IN_CONTEXT: "Hiểu từ trong ngữ cảnh",
  PROMOTION: "Thông tin khuyến mãi",
  READING: "Đọc hiểu chung",
  UNKNOWN: "Đọc hiểu chung",
  // Answer formats, not question types: say nothing more than "reading in general".
  MCQ: "Đọc hiểu chung",
  OPEN_TEXT: "Đọc hiểu chung",
};

/**
 * The Vietnamese name of a reading question type. Stored keys come in several
 * spellings ("DETAIL", "detail", "specific detail"), so they are normalised
 * before the lookup; an unknown key is shown as stored.
 */
export function readingSubskillLabel(key: string): string {
  const normalised = key.trim().toUpperCase().replace(/[\s-]+/g, "_");
  return READING_SUBSKILL_LABELS[normalised] || key;
}
