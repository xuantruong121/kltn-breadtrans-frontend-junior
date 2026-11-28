/** Speaking CMS types, constants and labels shared by the list and the set editor. */
import { PRACTICE_LEVEL_LABEL, PRACTICE_LEVELS } from "../../../lib/learning-path/practiceLevel.ts";

export interface SpeakingExercise {
  id: number;
  title: string;
  targetText: string;
  taskType?: SpeakingTaskType | null;
  stimulusId?: number | null;
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
  tracks?: string[];
  id: string;
  title: string;
  description?: string | null;
  level?: string | null;
  publicationStatus: "DRAFT" | "PUBLISHED";
  exercises: SpeakingExercise[];
  createdAt?: string;
  updatedAt?: string;
}

// A set's level and an exercise's difficulty are both one of the four practice
// levels (owner 2026-11-27), as the catalog, the plan matrix and the recommender
// read them.
export const LEVELS: readonly string[] = PRACTICE_LEVELS;
export const EXERCISE_LEVELS: readonly string[] = PRACTICE_LEVELS;
export const TASK_TYPES: Array<{ value: SpeakingTaskType; label: string }> = [
  { value: "READ_ALOUD", label: "Đọc thành tiếng" },
  { value: "DESCRIBE_PICTURE", label: "Mô tả hình ảnh" },
  { value: "RESPOND_TO_QUESTION", label: "Trả lời câu hỏi" },
  { value: "RESPOND_USING_INFORMATION", label: "Trả lời dựa trên thông tin" },
  { value: "EXPRESS_OPINION", label: "Trình bày ý kiến" },
  { value: "PRONUNCIATION_DRILL", label: "Bài luyện phát âm" },
];
export const LEVEL_LABELS: Record<string, string> = PRACTICE_LEVEL_LABEL;
export const STATUS_LABELS = { DRAFT: "Bản nháp", PUBLISHED: "Đã xuất bản" } as const;
export const levelLabel = (level?: string | null) => LEVEL_LABELS[level || ""] || "Chưa phân loại";
export const difficultyLabel = levelLabel;

export type SpeakingExerciseForm = {
  title: string;
  targetText: string;
  imageUrl: string;
  difficulty: string;
  taskType: SpeakingTaskType;
  stimulusId: number | null;
};

export type SpeakingExercisePayload = {
  title: string;
  targetText: string;
  difficulty?: string;
  taskType: SpeakingTaskType;
  stimulusId?: number | null;
  imageUrl?: string | null;
  order?: number;
};

export type SpeakingPracticeSetSuggestion = {
  title: string;
  description: string;
  level: string;
  /** The Lĩnh vực the draft was written for (the request's track), or null. */
  track?: string | null;
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
