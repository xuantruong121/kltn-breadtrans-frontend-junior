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
  /** Vocabulary and grammar to study next. */
  foundation?: FoundationItem[];
};

export type WeekPlan = {
  minutesPerDay: number;
  weekStart: string;
  skills: Array<{
    skill: PracticeSkill;
    unlockedLevel: PracticeLevel;
    done: number;
    doneThisWeek: number;
    target: number;
    remaining: number;
    nextLevelLabel: string | null;
  }>;
  estimate: {
    items: number;
    days: number;
    date: string;
    targetDate: string | null;
    onTrack: boolean | null;
    minutesNeeded: number | null;
  };
};

export type ProgressRow = {
  skill: PracticeSkill;
  attempts: number;
  average: number | null;
  trend: number | null;
  startLevel: PracticeLevel | null;
  currentLevel: PracticeLevel;
  levelsGained: number;
};

/** One short line for a skill; a trend is shown only with enough attempts. */
export function progressLine(row: ProgressRow): string {
  if (row.attempts === 0) return "Chưa có bài nào";
  const base = `${row.attempts} bài, trung bình ${row.average}%`;
  if (row.trend === null || row.trend === 0) return base;
  return `${base}, ${row.trend > 0 ? "tăng" : "giảm"} ${Math.abs(row.trend)} điểm gần đây`;
}

export type FoundationItem = {
  kind: "VOCAB_REVIEW" | "READING_REVIEW" | "GRAMMAR" | "VOCAB_DECK";
  id: number | null;
  title: string;
  route: string;
  minutes: number;
  reason: string;
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

/** Share of the weekly target, capped at 100 for the bar. */
export function weekPercent(done: number, target: number): number {
  return target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0;
}

/** The learner-facing estimate line; never a promise. */
export function estimateText(estimate: WeekPlan["estimate"], formatDate: (iso: string) => string): string {
  if (estimate.items === 0) return "Bạn đã đủ số bài để mở mức kế tiếp ở mọi kỹ năng.";
  const base = `Còn ${estimate.items} bài để mở mức kế tiếp, ước tính khoảng ${estimate.days} ngày (${formatDate(estimate.date)}).`;
  if (estimate.onTrack === false && estimate.minutesNeeded !== null) {
    return `${base} Để kịp ngày mục tiêu, cần khoảng ${estimate.minutesNeeded} phút mỗi ngày.`;
  }
  if (estimate.onTrack === false) return `${base} Ngày mục tiêu đã qua, bạn có thể đặt lại.`;
  if (estimate.onTrack === true) return `${base} Kịp ngày mục tiêu của bạn.`;
  return base;
}

export function totalMinutes(items: Array<Pick<RecommendationItem, "minutes">>): number {
  return items.reduce((n, i) => n + i.minutes, 0);
}
