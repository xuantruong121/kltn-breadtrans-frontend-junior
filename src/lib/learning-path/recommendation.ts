/** Recommendation items from /learning-path (F6). Labels only; no I/O. */
import type { PracticeLevel, PracticeSkill } from "./practiceLevel.ts";

export type RecommendationStatus = "OPEN" | "LOCKED_LEVEL" | "LOCKED_PLAN";
export type LearningContentType = "QUIZ" | "SPEAKING_SET" | "CONTENT_TOPIC";

export type RecommendationItem = {
  contentType: LearningContentType;
  contentId: number;
  skill: PracticeSkill;
  level: PracticeLevel;
  levelLabel: string;
  title: string;
  route: string;
  minutes: number;
  status: RecommendationStatus;
  /** Lowest plan that opens this item. */
  requiredPlan: "FREE" | "PLUS" | "PRO";
  /** The plan is missing too: a level lock can hide a plan lock. */
  planLocked: boolean;
  reasons: string[];
  predictedSuccess: number;
  saved: boolean;
};

export type TodayPlan = { minutesPerDay: number; items: RecommendationItem[] };

/** Short badge for a locked item; null when it is open. */
export function lockLabel(status: RecommendationStatus, requiredPlan: string = "PLUS"): string | null {
  if (status === "LOCKED_LEVEL") return "Chưa mở mức";
  if (status === "LOCKED_PLAN") return `Cần gói ${requiredPlan}`;
  return null;
}

/** The reasons shown under an item: the first two, lock reason excluded (shown as a badge). */
export function visibleReasons(item: Pick<RecommendationItem, "reasons">): string[] {
  return item.reasons.filter((r) => !r.startsWith("Cần ")).slice(0, 2);
}

export function totalMinutes(items: Array<Pick<RecommendationItem, "minutes">>): number {
  return items.reduce((n, i) => n + i.minutes, 0);
}
