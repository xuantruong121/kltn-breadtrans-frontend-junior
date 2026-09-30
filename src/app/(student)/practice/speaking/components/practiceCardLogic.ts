import type {
  SpeakingExercise,
  SpeakingPracticeSetSummary,
} from "@/lib/api/services/speaking.service";

export type PracticeCardStatus =
  | "COMPLETED"
  | "IN_PROGRESS"
  | "NOT_STARTED"
  | "LOCKED";

export type DifficultyLevel = "ALL" | "BASIC" | "INTERMEDIATE" | "ADVANCED";

export interface PracticeExerciseItem extends SpeakingExercise {
  isCompleted?: boolean;
  practiceSet?: SpeakingPracticeSetSummary;
  averageScore?: number;
  isSpotlight?: boolean;
  description?: string;
  tags?: string[];
}

/**
 * Matches exercise difficulty accommodating composite/hybrid difficulty tags (e.g. "Cơ bản - Nâng cao").
 */
export function matchesDifficulty(
  itemDifficulty: string,
  selected: DifficultyLevel,
): boolean {
  if (selected === "ALL") return true;
  const normalized = (itemDifficulty || "").toLowerCase();
  if (selected === "BASIC") {
    return (
      normalized.includes("cơ bản") ||
      normalized.includes("basic") ||
      normalized.includes("beginner")
    );
  }
  if (selected === "INTERMEDIATE") {
    return (
      normalized.includes("trung cấp") ||
      normalized.includes("intermediate")
    );
  }
  if (selected === "ADVANCED") {
    return (
      normalized.includes("nâng cao") ||
      normalized.includes("advanced")
    );
  }
  return true;
}

/**
 * Resolves high-level exercise format badge (e.g. "Đọc thành tiếng", "Phản hồi câu hỏi", "Bày tỏ quan điểm").
 */
export function resolveFormatTag(exercise: PracticeExerciseItem): string {
  const title = (
    exercise.practiceSet?.title ||
    exercise.title ||
    ""
  ).toLowerCase();

  if (title.includes("read aloud") || title.includes("đọc")) {
    return "Đọc thành tiếng";
  }
  if (title.includes("question response") || title.includes("phản hồi")) {
    return "Phản hồi câu hỏi";
  }
  if (title.includes("opinion") || title.includes("quan điểm")) {
    return "Bày tỏ quan điểm";
  }
  if (title.includes("pronunciation") || title.includes("phát âm")) {
    return "Nền tảng phát âm";
  }
  if (exercise.practiceSet) {
    return "BỘ LUYỆN";
  }
  return exercise.category || "LUYỆN NÓI";
}

/**
 * Resolves concise pedagogical description summarizing the topic objective.
 * Strictly avoids leaking question-level prompt sentences or answers.
 */
export function resolvePedagogicalDescription(
  exercise: PracticeExerciseItem,
  customDesc?: string,
): string {
  if (customDesc?.trim()) return customDesc.trim();
  if (exercise.description?.trim()) return exercise.description.trim();
  if (exercise.practiceSet?.description?.trim()) {
    return exercise.practiceSet.description.trim();
  }

  const title = (
    exercise.practiceSet?.title ||
    exercise.title ||
    ""
  ).toLowerCase();

  if (title.includes("read aloud") || title.includes("đọc")) {
    return "Rèn luyện phát âm chuẩn xác, ngữ điệu tự nhiên và độ liền mạch khi đọc câu thành tiếng.";
  }
  if (title.includes("question response") || title.includes("phản hồi")) {
    return "Rèn luyện phản xạ nghe hiểu và diễn đạt câu trả lời ngắn gọn, chuẩn xác theo tình huống.";
  }
  if (title.includes("opinion") || title.includes("quan điểm")) {
    return "Rèn luyện sắp xếp ý tưởng và trình bày quan điểm cá nhân mạch lạc, tự nhiên và thuyết phục.";
  }
  if (title.includes("pronunciation") || title.includes("phát âm")) {
    return "Củng cố âm cuối, trọng âm, nối âm và ngữ điệu câu chuẩn âm vị học.";
  }
  return "Luyện tập phản xạ phát âm chuẩn bản xứ, độ trôi chảy và ngữ điệu câu theo từng chủ đề.";
}

/**
 * Resolves high-level skill tags (max 2 pills) without leaking vocabulary or phoneme spoilers.
 */
export function resolveSkillTags(
  exercise: PracticeExerciseItem,
  customTags?: string[],
): string[] {
  if (Array.isArray(customTags) && customTags.length > 0) {
    return customTags.slice(0, 2);
  }
  if (Array.isArray(exercise.tags) && exercise.tags.length > 0) {
    return exercise.tags.slice(0, 2);
  }

  const title = (
    exercise.practiceSet?.title ||
    exercise.title ||
    ""
  ).toLowerCase();
  const cat = (
    exercise.practiceSet?.category ||
    exercise.category ||
    ""
  ).toUpperCase();

  if (title.includes("read aloud") || title.includes("đọc")) {
    return ["Ngữ điệu câu", "Nối âm tự nhiên"];
  }
  if (title.includes("question response") || title.includes("phản hồi")) {
    return ["Phản xạ trả lời", "Độ trôi chảy"];
  }
  if (title.includes("opinion") || title.includes("quan điểm")) {
    return ["Bày tỏ quan điểm", "Mạch lạc & Lưu loát"];
  }
  if (title.includes("pronunciation") || title.includes("phát âm")) {
    return ["Âm cuối & Trọng âm", "Ngữ điệu câu"];
  }
  if (cat === "TOEIC" || cat === "BUSINESS") {
    return ["Từ vựng công sở", "Ngữ điệu chuẩn"];
  }
  return ["Phát âm chuẩn", "Độ lưu loát"];
}

/**
 * Pure state machine determining practice card status.
 */
export function computePracticeCardStatus(params: {
  isAuthenticated: boolean;
  isCompleted?: boolean;
  practiceSet?: {
    exerciseCount: number;
    completedCount: number;
    isCompleted: boolean;
  };
  isSpotlight?: boolean;
}): PracticeCardStatus {
  const { isAuthenticated, isCompleted, practiceSet, isSpotlight } = params;
  if (!isAuthenticated) return "LOCKED";

  const completed = Boolean(
    isCompleted ||
      (practiceSet && practiceSet.isCompleted) ||
      (practiceSet &&
        practiceSet.exerciseCount > 0 &&
        practiceSet.completedCount >= practiceSet.exerciseCount),
  );

  if (completed) return "COMPLETED";

  const inProgress = Boolean(
    practiceSet &&
      practiceSet.completedCount > 0 &&
      practiceSet.completedCount < practiceSet.exerciseCount,
  );

  if (inProgress || isSpotlight) return "IN_PROGRESS";

  return "NOT_STARTED";
}
