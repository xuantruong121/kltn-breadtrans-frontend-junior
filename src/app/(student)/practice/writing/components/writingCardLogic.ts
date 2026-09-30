import type { WritingTopicItem } from "./WritingTopicCard";

export type WritingCardStatus =
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

export const WRITING_DIFFICULTY_CONFIG: Record<string, DifficultyConfig> = {
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
 * Matches writing topic difficulty.
 */
export function matchesWritingDifficulty(
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
 * Resolves expressive format tag for writing topic.
 */
export function resolveWritingFormatTag(topic: WritingTopicItem): string {
  const type = (topic.type || topic.taskType || "").toUpperCase();
  const title = (topic.topicName || topic.title || "").toLowerCase();

  if (type === "WRITING_PICTURE" || title.includes("tranh") || title.includes("picture")) {
    return "Viết theo tranh";
  }
  if (type === "WRITING_EMAIL" || title.includes("email") || title.includes("thư")) {
    return "Phản hồi Email";
  }
  if (type === "WRITING_OPINION" || title.includes("quan điểm") || title.includes("essay") || title.includes("luận")) {
    return "Viết luận quan điểm";
  }
  return "Viết câu";
}

/**
 * Resolves pedagogical objective description without leaking prompts or sample essays.
 */
export function resolveWritingPedagogicalDescription(
  topic: WritingTopicItem,
): string {
  const formatTag = resolveWritingFormatTag(topic);

  switch (formatTag) {
    case "Viết theo tranh":
      return "Rèn luyện sử dụng từ loại và giới từ mô tả hành động, quan hệ không gian dựa trên hình ảnh thực tế.";
    case "Phản hồi Email":
      return "Thực hành sử dụng liên từ chỉ nguyên nhân - kết quả và văn phong trang trọng để viết email giải quyết phàn nàn.";
    case "Viết luận quan điểm":
      return "Phát triển lập luận mạch lạc, tổ chức ý tưởng và cung cấp dẫn chứng cụ thể hỗ trợ quan điểm cá nhân.";
    default:
      return (
        topic.description?.trim() ||
        "Luyện tập cấu trúc ngữ pháp chuẩn xác, kết hợp từ vựng tự nhiên và nâng cao độ mạch lạc khi viết câu tiếng Anh."
      );
  }
}

/**
 * Resolves sub-skill tags with tactile dot indicators.
 */
export function resolveWritingSkillTags(topic: WritingTopicItem): string[] {
  const formatTag = resolveWritingFormatTag(topic);

  switch (formatTag) {
    case "Viết theo tranh":
      return ["Mệnh đề quan hệ", "Giới từ không gian"];
    case "Phản hồi Email":
      return ["Văn phong trang trọng", "Cấu trúc email phản hồi"];
    case "Viết luận quan điểm":
      return ["Tổ chức luận điểm", "Liên từ nối mạch lạc"];
    default:
      return ["Ngữ pháp cốt lõi", "Từ vựng ngữ cảnh"];
  }
}

/**
 * Computes writing card status machine.
 */
export function computeWritingCardStatus(params: {
  isAuthenticated: boolean;
  isCompleted?: boolean;
  isSpotlight?: boolean;
}): WritingCardStatus {
  const { isAuthenticated, isCompleted, isSpotlight } = params;
  if (!isAuthenticated) return "LOCKED";
  if (isCompleted) return "COMPLETED";
  if (isSpotlight) return "IN_PROGRESS";
  return "NOT_STARTED";
}
