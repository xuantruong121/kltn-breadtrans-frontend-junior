import type { ReadingTopicItem } from "./ReadingTopicCard";

export type ReadingCardStatus =
  | "COMPLETED"
  | "IN_PROGRESS"
  | "NOT_STARTED"
  | "LOCKED";

export type DifficultyLevel = "ALL" | "BASIC" | "INTERMEDIATE" | "ADVANCED";

export interface DifficultyConfig {
  label: string;
  badgeClass: string;
  dotClass: string;
}

export const READING_DIFFICULTY_CONFIG: Record<string, DifficultyConfig> = {
  BEGINNER: {
    label: "Cơ bản",
    badgeClass:
      "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
    dotClass: "bg-emerald-500",
  },
  INTERMEDIATE: {
    label: "Trung cấp",
    badgeClass:
      "border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
    dotClass: "bg-amber-500",
  },
  ADVANCED: {
    label: "Nâng cao",
    badgeClass:
      "border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300",
    dotClass: "bg-rose-500",
  },
};

/**
 * Matches reading topic difficulty accommodating level labels.
 */
export function matchesReadingDifficulty(
  level: string,
  selected: DifficultyLevel,
): boolean {
  if (selected === "ALL") return true;
  const normalized = (level || "").toLowerCase();
  if (selected === "BASIC") {
    return (
      normalized.includes("cơ bản") ||
      normalized.includes("basic") ||
      normalized.includes("beginner") ||
      normalized.includes("a1") ||
      normalized.includes("a2")
    );
  }
  if (selected === "INTERMEDIATE") {
    return (
      normalized.includes("trung cấp") ||
      normalized.includes("intermediate") ||
      normalized.includes("b1") ||
      normalized.includes("b2")
    );
  }
  if (selected === "ADVANCED") {
    return (
      normalized.includes("nâng cao") ||
      normalized.includes("advanced") ||
      normalized.includes("c1") ||
      normalized.includes("c2")
    );
  }
  return true;
}

/**
 * Resolves expressive format tag for reading topic.
 */
export function resolveReadingFormatTag(topic: ReadingTopicItem): string {
  const title = (topic.name || topic.title || "").toLowerCase();
  const desc = (topic.vietnameseName || topic.description || "").toLowerCase();

  if (title.includes("part 5") || title.includes("hoàn thành câu") || desc.includes("hoàn thành câu") || title.includes("incomplete")) {
    return "Hoàn thành câu";
  }
  if (title.includes("part 6") || title.includes("điền đoạn văn") || desc.includes("điền đoạn") || title.includes("text completion")) {
    return "Điền đoạn văn";
  }
  if (title.includes("part 7 multi") || title.includes("đoạn kép") || title.includes("đa đoạn") || title.includes("multiple passages")) {
    return "Đoạn kép & Đa đoạn";
  }
  if (title.includes("part 7") || title.includes("email") || title.includes("thư") || title.includes("single passage")) {
    return "Đoạn đơn - Email";
  }
  return "Đọc song ngữ";
}

/**
 * Resolves pedagogical objective description without leaking article content or questions.
 */
export function resolveReadingPedagogicalDescription(
  topic: ReadingTopicItem,
): string {
  const formatTag = resolveReadingFormatTag(topic);

  switch (formatTag) {
    case "Hoàn thành câu":
      return "Phân tích cấu trúc ngữ pháp, phân biệt bẫy từ loại và củng cố liên từ trong câu đơn ngữ cảnh công việc.";
    case "Điền đoạn văn":
      return "Rèn luyện khả năng nhận diện mối liên kết ý, chọn câu phù hợp ngữ cảnh và bổ sung từ nối trong đoạn văn bản.";
    case "Đoạn đơn - Email":
      return "Luyện kỹ thuật đọc lướt (Skimming) và đọc quét (Scanning) để trích xuất thông tin người gửi, mục đích và hạn chót.";
    case "Đoạn kép & Đa đoạn":
      return "Rèn luyện tốc độ đọc lướt và kỹ năng đối chiếu dữ liệu ngữ cảnh giữa hóa đơn, lịch trình và thư từ trao đổi.";
    default:
      return (
        topic.vietnameseName?.trim() ||
        topic.description?.trim() ||
        "Phát triển vốn từ vựng học thuật, tư duy phân tích đoạn văn và kỹ năng đối chiếu dữ liệu ngữ cảnh song ngữ."
      );
  }
}

/**
 * Resolves sub-skill tags with tactile dot indicators.
 */
export function resolveReadingSkillTags(topic: ReadingTopicItem): string[] {
  const formatTag = resolveReadingFormatTag(topic);

  switch (formatTag) {
    case "Hoàn thành câu":
      return ["Bẫy từ loại", "Ngữ pháp cốt lõi"];
    case "Điền đoạn văn":
      return ["Mạch lạc câu", "Từ vựng ngữ cảnh"];
    case "Đoạn đơn - Email":
      return ["Kỹ thuật Skimming", "Quét thông tin Scanning"];
    case "Đoạn kép & Đa đoạn":
      return ["Đối chiếu đa văn bản", "Suy luận dữ liệu"];
    default:
      return ["Kỹ thuật Skimming", "Từ vựng thương mại"];
  }
}

/**
 * Computes reading card status machine.
 */
export function computeReadingCardStatus(params: {
  isAuthenticated: boolean;
  totalArticles: number;
  completedArticles: number;
  isSpotlight?: boolean;
}): ReadingCardStatus {
  const { isAuthenticated, totalArticles, completedArticles, isSpotlight } = params;
  if (!isAuthenticated) return "LOCKED";
  if (totalArticles > 0 && completedArticles >= totalArticles) return "COMPLETED";
  if (completedArticles > 0 || isSpotlight) return "IN_PROGRESS";
  return "NOT_STARTED";
}
