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

export interface DifficultyBadgeConfig {
  label: string;
  badgeClass: string;
  dotClass: string;
}

export const SPEAKING_DIFFICULTY_BADGES: Record<string, DifficultyBadgeConfig> = {
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
 * Resolves expressive, semantic difficulty badge styling and localized label.
 * Harmonizes with BreadTrans multi-skill catalog aesthetics (Emerald for Basic,
 * Amber for Intermediate, Rose for Advanced, and tailored chromatic accents for hybrid levels).
 */
export function resolveDifficultyBadge(rawDifficulty?: string): DifficultyBadgeConfig {
  const raw = (rawDifficulty || "").trim();
  const lower = raw.toLowerCase();

  const hasBasic =
    lower.includes("cơ bản") ||
    lower.includes("basic") ||
    lower.includes("beginner") ||
    lower.includes("a1") ||
    lower.includes("a2");

  const hasIntermediate =
    lower.includes("trung cấp") ||
    lower.includes("intermediate") ||
    lower.includes("b1") ||
    lower.includes("b2");

  const hasAdvanced =
    lower.includes("nâng cao") ||
    lower.includes("advanced") ||
    lower.includes("c1") ||
    lower.includes("c2");

  // Composite 1: Spans Beginner to Advanced (Full spectrum)
  if (hasBasic && hasAdvanced) {
    return {
      label: raw || "Cơ bản – Nâng cao",
      badgeClass:
        "border-indigo-200 dark:border-indigo-800/60 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300",
      dotClass: "bg-indigo-500",
    };
  }

  // Composite 2: Spans Beginner to Intermediate
  if (hasBasic && hasIntermediate) {
    return {
      label: raw || "Cơ bản – Trung cấp",
      badgeClass:
        "border-teal-200 dark:border-teal-800/60 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300",
      dotClass: "bg-teal-500",
    };
  }

  // Composite 3: Spans Intermediate to Advanced
  if (hasIntermediate && hasAdvanced) {
    return {
      label: raw || "Trung cấp – Nâng cao",
      badgeClass:
        "border-orange-200 dark:border-orange-800/60 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300",
      dotClass: "bg-orange-500",
    };
  }

  // Pure Advanced
  if (hasAdvanced) {
    const isEn = lower === "advanced" || lower === "hard" || lower === "c1" || lower === "c2";
    return {
      label: isEn ? "Nâng cao" : raw || "Nâng cao",
      badgeClass:
        "border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300",
      dotClass: "bg-rose-500",
    };
  }

  // Pure Intermediate
  if (hasIntermediate) {
    const isEn = lower === "intermediate" || lower === "medium" || lower === "b1" || lower === "b2";
    return {
      label: isEn ? "Trung cấp" : raw || "Trung cấp",
      badgeClass:
        "border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
      dotClass: "bg-amber-500",
    };
  }

  // Pure Basic / Default
  const isEn = lower === "beginner" || lower === "basic" || lower === "a1" || lower === "a2";
  return {
    label: isEn ? "Cơ bản" : raw || "Cơ bản",
    badgeClass:
      "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
    dotClass: "bg-emerald-500",
  };
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
    return "Âm vị học";
  }
  if (
    title.includes("toeic speaking") ||
    title.includes("toeic") ||
    title.includes("ets") ||
    title.includes("nhiệm vụ")
  ) {
    return "Mô phỏng ETS";
  }
  if (exercise.practiceSet) {
    return "Mô phỏng ETS";
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
  isLocked?: boolean;
}): PracticeCardStatus {
  const { isAuthenticated, isCompleted, practiceSet, isLocked } = params;
  if (isLocked) return "LOCKED";
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

  // Spotlight is only a recommendation marker; it is not evidence that the
  // learner has started the set.
  if (inProgress) return "IN_PROGRESS";

  return "NOT_STARTED";
}
