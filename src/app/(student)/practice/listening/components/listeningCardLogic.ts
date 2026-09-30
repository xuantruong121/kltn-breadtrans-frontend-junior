import type { ListeningPracticeCatalogItem } from "@/lib/api/services/quiz.service";

export type ListeningCardStatus =
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

export const LISTENING_DIFFICULTY_CONFIG: Record<string, DifficultyConfig> = {
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
 * Matches exercise difficulty accommodating composite/hybrid difficulty tags.
 */
export function matchesListeningDifficulty(
  itemDifficulty: string,
  selected: DifficultyLevel,
): boolean {
  if (selected === "ALL") return true;
  const normalized = (itemDifficulty || "").toLowerCase();
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
 * Resolves expressive format tag for listening item.
 */
export function resolveListeningFormatTag(
  quiz: ListeningPracticeCatalogItem,
): string {
  const title = (quiz.title || "").toLowerCase();
  const desc = (quiz.description || "").toLowerCase();
  const mode = (quiz.mode || "").toUpperCase();

  if (mode === "DICTATION" || title.includes("chép chính tả") || title.includes("dictation")) {
    return "Chép chính tả";
  }
  if (
    title.includes("part 1") ||
    title.includes("tranh") ||
    title.includes("mô tả tranh") ||
    title.includes("photograph")
  ) {
    return "Mô tả tranh";
  }
  if (
    title.includes("part 2") ||
    title.includes("hỏi đáp") ||
    title.includes("hỏi - đáp") ||
    title.includes("question response")
  ) {
    return "Hỏi - Đáp";
  }
  if (
    mode === "DIALOGUE" ||
    title.includes("part 3") ||
    title.includes("hội thoại") ||
    title.includes("conversation")
  ) {
    return "Hội thoại ngắn";
  }
  if (
    title.includes("part 4") ||
    title.includes("thông báo") ||
    title.includes("bài nói") ||
    title.includes("talk")
  ) {
    return "Bài nói chuyện";
  }
  return "Nghe hiểu";
}

/**
 * Resolves concise pedagogical description summarizing the topic objective.
 * Strictly avoids leaking question-level audio transcripts, sentences, or answers.
 */
export function resolveListeningPedagogicalDescription(
  quiz: ListeningPracticeCatalogItem,
): string {
  const formatTag = resolveListeningFormatTag(quiz);

  switch (formatTag) {
    case "Mô tả tranh":
      return "Luyện phản xạ nhận diện bẫy mô tả hành động, vị trí vật thể và đối tượng trong không gian thị giác.";
    case "Hỏi - Đáp":
      return "Rèn luyện kỹ năng nhận diện nhanh từ để hỏi (5W1H), tránh bẫy từ đồng âm và câu trả lời gián tiếp.";
    case "Hội thoại ngắn":
      return "Nắm bắt ngữ cảnh trao đổi giữa 2-3 người, suy luận địa điểm, nghề nghiệp và hành động tiếp theo.";
    case "Bài nói chuyện":
      return "Rèn luyện phản xạ bắt ý chính và chi tiết then chốt trong các bài phát biểu, quảng cáo hoặc thông báo công cộng.";
    case "Chép chính tả":
      return "Thực hành nghe bắt từng từ vựng, củng cố nhận diện âm nối, âm nuốt và chính tả chuẩn xác theo từng câu.";
    default:
      return (
        quiz.description?.trim() ||
        "Luyện phản xạ nghe hiểu tiếng Anh tự nhiên theo ngữ cảnh giao tiếp thực tế và bài thi chuẩn hóa."
      );
  }
}

/**
 * Resolves high-level skill micro-badges (max 2 pills) without leaking question content.
 */
export function resolveListeningSkillTags(
  quiz: ListeningPracticeCatalogItem,
): string[] {
  const formatTag = resolveListeningFormatTag(quiz);
  const accents = Array.isArray(quiz.accents) && quiz.accents.length > 0 ? quiz.accents : [];

  if (accents.includes("US") || accents.includes("UK")) {
    const accentTag = accents.includes("US") ? "Giọng Mỹ (US)" : "Giọng Anh (UK)";
    switch (formatTag) {
      case "Mô tả tranh":
        return ["Nhận diện không gian", accentTag];
      case "Hỏi - Đáp":
        return ["Bắt từ khóa 5W1H", accentTag];
      case "Hội thoại ngắn":
        return ["Suy luận ngữ cảnh", accentTag];
      case "Bài nói chuyện":
        return ["Bắt ý then chốt", accentTag];
      case "Chép chính tả":
        return ["Âm nối & Âm nuốt", accentTag];
      default:
        return ["Bắt từ khóa chính", accentTag];
    }
  }

  switch (formatTag) {
    case "Mô tả tranh":
      return ["Hành động & Đồ vật", "Từ vựng thị giác"];
    case "Hỏi - Đáp":
      return ["Bắt từ khóa 5W1H", "Tránh bẫy đồng âm"];
    case "Hội thoại ngắn":
      return ["Suy luận ngữ cảnh", "Ý định người nói"];
    case "Bài nói chuyện":
      return ["Bắt thông tin chính", "Chi tiết lịch trình"];
    case "Chép chính tả":
      return ["Nhận diện âm nuốt", "Chính tả chuẩn xác"];
    default:
      return ["Bắt từ khóa chính", "Độ trôi chảy"];
  }
}

/**
 * Computes listening card state machine status.
 */
export function computeListeningCardStatus(params: {
  isAuthenticated: boolean;
  isCompleted?: boolean;
  isSpotlight?: boolean;
  inProgress?: boolean;
}): ListeningCardStatus {
  const { isAuthenticated, isCompleted, isSpotlight, inProgress } = params;
  if (!isAuthenticated) return "LOCKED";
  if (isCompleted) return "COMPLETED";
  if (inProgress || isSpotlight) return "IN_PROGRESS";
  return "NOT_STARTED";
}
