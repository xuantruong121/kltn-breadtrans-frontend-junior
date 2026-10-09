import type { ReadingTopicItem } from "./ReadingTopicCard";

export interface ReadingTopicProgressSource {
  totalArticles?: number | null;
  completedArticles?: number | null;
  quizzes?: unknown[] | null;
}

export interface ReadingExerciseProgressSource {
  completionStatus?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | null;
}

export function summarizeReadingExerciseProgress(
  exercises: ReadingExerciseProgressSource[],
): { totalExercises: number; completedExercises: number; completionPercent: number } {
  const completedExercises = exercises.filter(
    (exercise) => exercise.completionStatus === "COMPLETED",
  ).length;
  const totalExercises = exercises.length;
  return {
    totalExercises,
    completedExercises,
    completionPercent:
      totalExercises > 0
        ? Math.min(100, Math.round((completedExercises / totalExercises) * 100))
        : 0,
  };
}

/** Reading cards represent topics; keep the hub and catalog on that unit. */
export function summarizeReadingTopicProgress(
  topics: ReadingTopicProgressSource[],
): { totalTopics: number; completedTopics: number; completionPercent: number } {
  const completedTopics = topics.filter((topic) => {
    const total =
      Number.isFinite(topic.totalArticles) && (topic.totalArticles ?? 0) > 0
        ? Math.floor(topic.totalArticles as number)
        : Array.isArray(topic.quizzes)
          ? topic.quizzes.length
          : 0;
    const completed = Number.isFinite(topic.completedArticles)
      ? Math.max(0, Math.floor(topic.completedArticles ?? 0))
      : 0;
    return total > 0 && completed >= total;
  }).length;
  const totalTopics = topics.length;
  return {
    totalTopics,
    completedTopics,
    completionPercent:
      totalTopics > 0
        ? Math.min(100, Math.round((completedTopics / totalTopics) * 100))
        : 0,
  };
}

export type ReadingCardStatus =
  | "COMPLETED"
  | "IN_PROGRESS"
  | "NOT_STARTED"
  | "LOCKED";

export type DifficultyLevel = "ALL" | "BASIC" | "INTERMEDIATE" | "ADVANCED";
export type ExerciseCategory = "ALL" | "READING" | "GRAMMAR";

export interface DifficultyConfig {
  label: string;
  badgeClass: string;
  dotClass: string;
}

export const READING_DIFFICULTY_CONFIG: Record<string, DifficultyConfig> = {
  BASIC: {
    label: "Cơ bản",
    badgeClass:
      "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
    dotClass: "bg-emerald-500",
  },
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
 * Authoritatively resolves standard DifficultyLevel from CEFR level or item metadata.
 * A1-A2 / Beginner -> BASIC (Cơ bản)
 * B1-B2 / Intermediate -> INTERMEDIATE (Trung cấp)
 * C1-C2 / Advanced -> ADVANCED (Nâng cao)
 */
export function resolveExerciseDifficulty(item: {
  level?: string | null;
  name?: string | null;
  title?: string | null;
  vietnameseName?: string | null;
}): DifficultyLevel {
  const rawLevel = (item.level || "").trim().toUpperCase();

  // 1. Structured Level check
  if (
    rawLevel === "ADVANCED" ||
    rawLevel.includes("C1") ||
    rawLevel.includes("C2") ||
    rawLevel.includes("NÂNG CAO")
  ) {
    return "ADVANCED";
  }
  if (
    rawLevel === "INTERMEDIATE" ||
    rawLevel.includes("B1") ||
    rawLevel.includes("B2") ||
    rawLevel.includes("TRUNG CẤP")
  ) {
    return "INTERMEDIATE";
  }
  if (
    rawLevel === "BEGINNER" ||
    rawLevel === "BASIC" ||
    rawLevel.includes("A1") ||
    rawLevel.includes("A2") ||
    rawLevel.includes("CƠ BẢN")
  ) {
    return "BASIC";
  }

  // 2. Fallback to name/title/vietnameseName
  const combined = `${item.name || ""} ${item.title || ""} ${item.vietnameseName || ""}`.toUpperCase();
  if (combined.includes("C1") || combined.includes("C2") || combined.includes("NÂNG CAO")) {
    return "ADVANCED";
  }
  if (combined.includes("B1") || combined.includes("B2") || combined.includes("TRUNG CẤP")) {
    return "INTERMEDIATE";
  }
  return "BASIC";
}

/**
 * Matches reading or grammar exercise difficulty.
 */
export function matchesReadingDifficulty(
  levelOrItem:
    | string
    | {
        level?: string | null;
        name?: string | null;
        title?: string | null;
        vietnameseName?: string | null;
      },
  selected: DifficultyLevel,
): boolean {
  if (selected === "ALL") return true;
  const resolved =
    typeof levelOrItem === "string"
      ? resolveExerciseDifficulty({ level: levelOrItem })
      : resolveExerciseDifficulty(levelOrItem);
  return resolved === selected;
}

/**
 * Matches category filter (ALL, READING, GRAMMAR).
 */
export function matchesExerciseCategory(
  itemCategory: "READING" | "GRAMMAR",
  selectedCategory: ExerciseCategory,
): boolean {
  if (selectedCategory === "ALL") return true;
  return itemCategory === selectedCategory;
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
  return "Đọc hiểu";
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
        topic.description?.trim() ||
        topic.vietnameseName?.trim() ||
        "Phát triển vốn từ vựng và kỹ năng phân tích thông tin trong các đoạn văn theo ngữ cảnh thực tế."
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
 * Authoritatively checks if a reading topic is locked based on backend contracts.
 */
export function isReadingTopicLocked(topic: {
  isLocked?: boolean;
  quizzes?: Array<{ isLocked?: boolean }>;
}): boolean {
  if (topic.isLocked !== undefined) return Boolean(topic.isLocked);
  if (Array.isArray(topic.quizzes) && topic.quizzes.length > 0) {
    return topic.quizzes.every((q) => Boolean(q.isLocked));
  }
  return false;
}

/**
 * Computes reading card status machine.
 */
export function computeReadingCardStatus(params: {
  isAuthenticated: boolean;
  totalArticles: number;
  completedArticles: number;
  isSpotlight?: boolean;
  isLocked?: boolean;
}): ReadingCardStatus {
  const { isAuthenticated, totalArticles, completedArticles, isLocked } = params;
  if (isLocked) return "LOCKED";
  if (!isAuthenticated) return "LOCKED";
  if (totalArticles > 0 && completedArticles >= totalArticles) return "COMPLETED";
  // A spotlight recommendation is not an in-progress Reading topic.
  if (completedArticles > 0) return "IN_PROGRESS";
  return "NOT_STARTED";
}
