/** Speaking CMS types, constants and labels shared by the list and the set editor. */

export interface SpeakingExercise {
  id: number;
  title: string;
  targetText: string;
  taskType?: SpeakingTaskType | null;
  stimulusId?: number | null;
  category?: string | null;
  categoryId?: number | null;
  categoryTaxonomy?: SpeakingCategory | null;
  categoryLabel?: string | null;
  difficulty?: string | null;
  imageUrl?: string | null;
  audioUrl?: string | null;
  publicationStatus?: "DRAFT" | "PUBLISHED";
  order?: number;
}

export type SpeakingTaskType =
  | "READ_ALOUD"
  | "DESCRIBE_PICTURE"
  | "RESPOND_TO_QUESTION"
  | "RESPOND_USING_INFORMATION"
  | "EXPRESS_OPINION"
  | "PRONUNCIATION_DRILL";

export type SpeakingStimulus = {
  id: number;
  kind: "INFORMATION" | "IMAGE";
  title?: string | null;
  content?: string | null;
  imageUrl?: string | null;
  _count?: { exercises: number };
};

export interface SpeakingPracticeSet {
  id: string;
  title: string;
  description?: string | null;
  level?: string | null;
  category?: string | null;
  categoryId?: number;
  categoryTaxonomy?: SpeakingCategory | null;
  publicationStatus: "DRAFT" | "PUBLISHED";
  exercises: SpeakingExercise[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SpeakingCategory {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  sortOrder: number;
  allowPracticeSet: boolean;
  allowExercise: boolean;
  _count?: { practiceSets: number; exercises: number };
}

// Levels inside one learner-facing group (Cơ bản / Trung cấp / Nâng cao), as the
// catalog, the plan matrix and the recommender read them.
export const LEVELS = ["A1-A2", "A1", "A2", "B1-B2", "B1", "B2", "C1-C2", "C1", "C2"];
export const EXERCISE_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];
export const TASK_TYPES: Array<{ value: SpeakingTaskType; label: string }> = [
  { value: "READ_ALOUD", label: "Đọc thành tiếng" },
  { value: "DESCRIBE_PICTURE", label: "Mô tả hình ảnh" },
  { value: "RESPOND_TO_QUESTION", label: "Trả lời câu hỏi" },
  { value: "RESPOND_USING_INFORMATION", label: "Trả lời dựa trên thông tin" },
  { value: "EXPRESS_OPINION", label: "Trình bày ý kiến" },
  { value: "PRONUNCIATION_DRILL", label: "Bài luyện phát âm" },
];
export const LEVEL_LABELS: Record<string, string> = {
  "A1-A2": "Cơ bản · A1 – A2",
  A1: "Cơ bản · A1",
  A2: "Cơ bản · A2",
  "B1-B2": "Trung cấp · B1 – B2",
  B1: "Trung cấp · B1",
  B2: "Trung cấp · B2",
  "C1-C2": "Nâng cao · C1 – C2",
  C1: "Nâng cao · C1",
  C2: "Nâng cao · C2",
  "A1-B1": "A1 – B1",
  "A2-B1": "A2 – B1",
  "A2-B2": "A2 – B2",
  "B1-C1": "B1 – C1",
};
export const STATUS_LABELS = { DRAFT: "Bản nháp", PUBLISHED: "Đã xuất bản" } as const;
export const levelLabel = (level?: string | null) =>
  LEVEL_LABELS[level || ""] || level?.replace("-", " – ") || "Chưa phân loại";
export const difficultyLabel = (difficulty?: string | null) =>
  ({ BEGINNER: "Cơ bản", INTERMEDIATE: "Trung cấp", ADVANCED: "Nâng cao" })[
    difficulty || ""
  ] ||
  difficulty ||
  "Chưa phân loại";
export const categoryLabel = (categories: SpeakingCategory[], code?: string | null) =>
  categories.find((category) => category.code === code)?.name ||
  code ||
  "Chưa phân loại";

export type SpeakingExerciseForm = {
  title: string;
  targetText: string;
  imageUrl: string;
  category: string;
  difficulty: string;
  taskType: SpeakingTaskType;
  stimulusId: number | null;
  categoryOverride: boolean;
};

export type SpeakingExercisePayload = {
  title: string;
  targetText: string;
  category?: string | null;
  difficulty?: string;
  taskType: SpeakingTaskType;
  stimulusId?: number | null;
  imageUrl?: string | null;
  order?: number;
};

export type SpeakingPracticeSetSuggestion = {
  title: string;
  description: string;
  category: string;
  level: string;
};

export type SpeakingExerciseSuggestion = {
  title: string;
  targetText: string;
  difficulty: string;
  taskType: SpeakingTaskType;
  excluded?: boolean;
};

export type SpeakingFullDraft = {
  practiceSet: SpeakingPracticeSetSuggestion;
  exercises: SpeakingExerciseSuggestion[];
};

export const unwrap = <T,>(value: any): T => (value?.data ?? value) as T;
