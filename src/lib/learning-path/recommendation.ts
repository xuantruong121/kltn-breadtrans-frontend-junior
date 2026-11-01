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

export type TodayPlan = {
  minutesPerDay: number;
  items: RecommendationItem[];
  /** Other open items, beyond the daily minutes, for the learner to choose from. */
  more?: RecommendationItem[];
};

export type SkillFilter = PracticeSkill | "ALL";

export const SKILL_LIST_ROUTE: Record<PracticeSkill, string> = {
  LISTENING: "/listening",
  READING: "/reading",
  SPEAKING: "/speaking",
  WRITING: "/writing",
};

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

export function filterBySkill<T extends Pick<RecommendationItem, "skill">>(items: T[], skill: SkillFilter): T[] {
  return skill === "ALL" ? items : items.filter((item) => item.skill === skill);
}

/** Skills that have at least one item, in the given order, for the filter chips. */
export function skillsWithItems(items: Array<Pick<RecommendationItem, "skill">>, order: PracticeSkill[]): PracticeSkill[] {
  return order.filter((skill) => items.some((item) => item.skill === skill));
}

/** Suggestions beside the authored links: no repeats, open items first. */
export function otherSuggestions<T extends Pick<RecommendationItem, "route" | "status">>(
  items: T[],
  excludedRoutes: string[],
  max: number,
): T[] {
  const fresh = items.filter((item) => !excludedRoutes.includes(item.route));
  return [...fresh.filter((i) => i.status === "OPEN"), ...fresh.filter((i) => i.status !== "OPEN")].slice(0, max);
}

export function totalMinutes(items: Array<Pick<RecommendationItem, "minutes">>): number {
  return items.reduce((n, i) => n + i.minutes, 0);
}
