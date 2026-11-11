import axiosClient from "../axiosClient";

export const MISTAKE_SKILLS = ["LISTENING", "SPEAKING", "READING", "WRITING", "GRAMMAR", "TOEIC"] as const;
export type MistakeSkill = (typeof MISTAKE_SKILLS)[number];

export type MistakeSource =
  | "QUIZ_QUESTION"
  | "TOEIC_QUESTION"
  | "GRAMMAR_QUESTION"
  | "WRITING_CORRECTION"
  | "SPEAKING_WORD";

export interface MistakeDetail {
  kind: "CHOICE" | "DICTATION" | "CORRECTION" | "WORD";
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
    examId?: number;
    questionNumber?: number;
    part?: number;
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
  question: string | null;
  passage: string | null;
  options: string[];
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

  setResolved: async (id: number, resolved: boolean): Promise<{ id: number; resolved: boolean }> =>
    axiosClient.post(`/mistakes/${id}/resolve`, { resolved }),
};
