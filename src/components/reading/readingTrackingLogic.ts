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

export function readingSubskillLabel(key: string): string {
  return {
    MAIN_IDEA: "Main Idea",
    DETAIL: "Detail",
    INFERENCE: "Inference",
    PURPOSE: "Purpose",
    VOCAB_IN_CONTEXT: "Vocabulary in Context",
    PROMOTION: "Promotion",
    UNKNOWN: "Reading",
  }[key] || key;
}
