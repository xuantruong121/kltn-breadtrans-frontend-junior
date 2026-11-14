import axiosClient from "../axiosClient";
import type { TranslationCheck } from "./writing.service";

export const MISTAKE_SKILLS = ["LISTENING", "SPEAKING", "READING", "WRITING", "GRAMMAR"] as const;
export type MistakeSkill = (typeof MISTAKE_SKILLS)[number];

export type MistakeSource =
  | "QUIZ_QUESTION"
  | "GRAMMAR_QUESTION"
  | "WRITING_CORRECTION"
  | "SPEAKING_WORD"
  | "TRANSLATION_SENTENCE";

export interface MistakeDetail {
  kind: "CHOICE" | "DICTATION" | "CORRECTION" | "WORD" | "TRANSLATION";
  title: string;
  question?: string;
  passage?: string;
  passageKind?: "PASSAGE" | "TRANSCRIPT";
  options?: string[];
  selectedIndex?: number | null;
  correctIndex?: number;
  explanation?: string;
  yourAnswer?: string;
  correctAnswer?: string;
  score?: number;
  answerable: boolean;
  ref: {
    quizId?: number;
    submissionId?: number;
    questionId?: number;
    attemptId?: number;
    topicId?: number;
    exerciseId?: number;
  };
}

export interface MistakeItem {
  id: number;
  skill: MistakeSkill;
  sourceType: MistakeSource;
  tag: string | null;
  wrongCount: number;
  correctStreak: number;
  firstSeenAt: string;
  lastSeenAt: string;
  resolvedAt: string | null;
  detail: MistakeDetail;
}

export interface MistakeSummary {
  open: number;
  resolved: number;
  /** Open mistakes that can be answered again inside the notebook. */
  answerable: number;
  bySkill: Record<MistakeSkill, number>;
  resolveAfterCorrect: number;
}

export interface MistakeList {
  total: number;
  page: number;
  pageSize: number;
  items: MistakeItem[];
}

export interface MistakeReviewQuestion {
  id: number;
  skill: MistakeSkill;
  title: string;
  /** The source's ids, for its Vietnamese title. */
  quizId?: number | null;
  topicId?: number | null;
  question: string | null;
  passage: string | null;
  options: string[];
  /** TRANSLATION: `question` is the Vietnamese sentence, answered by typing. */
  kind?: "CHOICE" | "TRANSLATION";
}

/** A "Dịch câu" mistake typed again: the grade and where the mistake stands. */
export interface MistakeTranslationResult {
  id: number;
  correct: boolean;
  correctStreak: number;
  resolved: boolean;
  resolveAfterCorrect: number;
  check: Omit<TranslationCheck, "submissionId" | "exercise">;
}

export interface MistakeAnswerResult {
  id: number;
  correct: boolean;
  selectedIndex: number;
  correctIndex: number;
  explanation: string | null;
  passage: string | null;
  correctStreak: number;
  resolved: boolean;
  resolveAfterCorrect: number;
}

export const mistakesService = {
  getSummary: async (): Promise<MistakeSummary> => axiosClient.get("/mistakes/summary"),

  getList: async (params: { skill?: MistakeSkill; status: "open" | "resolved"; page: number }): Promise<MistakeList> =>
    axiosClient.get("/mistakes", { params }),

  getReview: async (
    skill?: MistakeSkill,
  ): Promise<{ resolveAfterCorrect: number; items: MistakeReviewQuestion[] }> =>
    axiosClient.get("/mistakes/review", { params: skill ? { skill } : {} }),

  answer: async (id: number, selectedIndex: number): Promise<MistakeAnswerResult> =>
    axiosClient.post(`/mistakes/${id}/answer`, { selectedIndex }),

  /** Graded like the "Dịch câu" exercise; an accepted answer costs no AI grading. */
  reviewTranslation: async (id: number, answer: string): Promise<MistakeTranslationResult> =>
    axiosClient.post(`/writing/mistakes/${id}/translate`, { answer }),

  setResolved: async (id: number, resolved: boolean): Promise<{ id: number; resolved: boolean }> =>
    axiosClient.post(`/mistakes/${id}/resolve`, { resolved }),
};
