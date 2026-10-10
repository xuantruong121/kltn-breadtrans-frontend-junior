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
    MAIN_IDEA: "Ý chính",
    DETAIL: "Chi tiết",
    INFERENCE: "Suy luận",
    PURPOSE: "Mục đích",
    VOCAB_IN_CONTEXT: "Từ vựng trong ngữ cảnh",
    PROMOTION: "Thông tin khuyến mãi",
    READING: "Đọc hiểu",
    UNKNOWN: "Đọc hiểu",
  }[key] || key;
}
