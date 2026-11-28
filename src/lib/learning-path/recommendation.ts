/** Recommendation items from /learning-path (F6). Labels only; no I/O. */
import { PRACTICE_SKILL_LABEL, type PracticeLevel, type PracticeSkill } from "./practiceLevel.ts";
import { planName } from "../ui/terms.ts";
import { formatGoalDate } from "./goalEditor.ts";

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

/**
 * One slot of today's frame: one item per skill (thesis supervisor
 * 2026-11-26). DONE: the skill was practised today; EMPTY: no item exists.
 */
export type TodaySlot = {
  skill: PracticeSkill;
  state: "TODO" | "DONE" | "EMPTY";
  /** The suggested item (TODO), or today's last item of the skill (DONE). */
  item: RecommendationItem | null;
  done: { items: number; scorePercent: number | null } | null;
  /** Suggested because another skill was practised a lot today. */
  nudged: boolean;
};

/** One skill practised a lot today, and the skills not touched yet. */
export type TodayBalance = {
  skill: PracticeSkill;
  minutes: number;
  items: number;
  suggest: PracticeSkill[];
};

export type TodayPlan = {
  dayKey?: string;
  minutesPerDay: number;
  /** Open picks still to do (older clients read this list). */
  items: RecommendationItem[];
  /** The frame: Nghe, Đọc, Nói, Viết. */
  slots?: TodaySlot[];
  balance?: TodayBalance | null;
  /** Other open items, beyond the frame, for the learner to choose from. */
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
  if (status === "LOCKED_PLAN") return `Cần gói ${planName(requiredPlan)}`;
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
  const day = formatGoalDate(estimate.targetDate);
  const target = day ? `ngày mục tiêu ${day}` : "ngày mục tiêu";
  if (estimate.onTrack === false && estimate.minutesNeeded !== null) {
    return `${base} Để kịp ${target}, cần khoảng ${estimate.minutesNeeded} phút mỗi ngày.`;
  }
  if (estimate.onTrack === false) return `${base} Ngày mục tiêu đã qua, bạn có thể đặt lại.`;
  if (estimate.onTrack === true) return `${base} Kịp ${target} của bạn.`;
  return base;
}

/** Minutes of the open items still to do today. */
export function remainingMinutes(slots: TodaySlot[]): number {
  return slots.reduce(
    (n, s) => (s.state === "TODO" && s.item?.status === "OPEN" ? n + s.item.minutes : n),
    0,
  );
}

/** The frame's corner: what is left today, or that every skill is done. */
export function frameStatus(slots: TodaySlot[]): string {
  const withContent = slots.filter((s) => s.state !== "EMPTY");
  if (withContent.length > 0 && withContent.every((s) => s.state === "DONE")) {
    return `Đã xong ${withContent.length} kỹ năng hôm nay`;
  }
  const left = remainingMinutes(slots);
  return left > 0 ? `Còn khoảng ${left} phút` : "";
}

/** "Đã làm hôm nay · 80%", or the count when several items were done. */
export function doneLine(done: TodaySlot["done"]): string {
  if (!done) return "Đã làm hôm nay";
  const score = done.scorePercent === null ? "" : `${done.scorePercent}%`;
  if (done.items > 1) {
    return score ? `Đã làm ${done.items} bài hôm nay · bài gần nhất ${score}` : `Đã làm ${done.items} bài hôm nay`;
  }
  return score ? `Đã làm hôm nay · ${score}` : "Đã làm hôm nay";
}

export function nudgeReason(skill: PracticeSkill): string {
  return `Bạn chưa luyện ${PRACTICE_SKILL_LABEL[skill]} hôm nay`;
}

/** "Nghe", "Nghe và Nói", "Nghe, Nói và Viết". */
function joinSkills(skills: PracticeSkill[]): string {
  const names = skills.map((s) => PRACTICE_SKILL_LABEL[s]);
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} và ${names[names.length - 1]}`;
}

/** The balance nudge in one sentence. */
export function balanceText(b: TodayBalance): string {
  const what =
    b.minutes > 0 && b.items > 0
      ? `${b.minutes} phút, ${b.items} bài`
      : b.minutes > 0
        ? `${b.minutes} phút`
        : `${b.items} bài`;
  return `Hôm nay bạn đã luyện ${PRACTICE_SKILL_LABEL[b.skill]} ${what}. Thử thêm ${joinSkills(b.suggest)} để các kỹ năng đi đều nhau.`;
}
