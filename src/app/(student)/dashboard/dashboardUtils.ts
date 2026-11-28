
export const ALLOWED_INTERNAL_ROUTE_PREFIXES = [
  "/flashcard",
  "/exams",
  "/toeic",
  "/listening",
  "/speaking",
  "/reading",
  "/writing",
  "/arena",
  "/grammar",
  "/vocabulary",
];

export function isSafeInternalRoute(url?: string): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if ([
    "/practice",
  ].includes(trimmed)) return false;
  return ALLOWED_INTERNAL_ROUTE_PREFIXES.some(
    (prefix) => trimmed === prefix || trimmed.startsWith(prefix + "/")
  );
}

export function getTypeSpecificQuestFallback(type?: string): { actionLabel: string; actionUrl: string } {
  const upper = (type || "").toUpperCase();
  switch (upper) {
    case "LEARN_VOCAB":
    case "DO_VOCAB":
      return { actionLabel: "Học từ vựng", actionUrl: "/flashcard" };
    case "DO_LISTENING":
      return { actionLabel: "Luyện nghe", actionUrl: "/listening" };
    case "DO_READING":
      // Đọc hiểu only: grammar practice does not count (owner 2026-11-24).
      return { actionLabel: "Luyện đọc hiểu", actionUrl: "/reading" };
    case "DO_WRITING":
      return { actionLabel: "Luyện viết", actionUrl: "/writing" };
    case "PERFECT_QUIZ":
      return { actionLabel: "Luyện nghe", actionUrl: "/listening" };
    case "COMPLETE_QUIZ":
      // Advances only on standalone Listening, Reading or Writing practice
      // (backend reward-eligibility.ts); a TOEIC exam never counts.
      return { actionLabel: "Luyện kỹ năng", actionUrl: "/listening" };
    case "DO_SPEAKING":
      return { actionLabel: "Luyện nói", actionUrl: "/speaking" };
    case "PRACTICE_SPEAKING":
      return { actionLabel: "Luyện phát âm", actionUrl: "/speaking" };
    default:
      return { actionLabel: "Khám phá bài học", actionUrl: "/dashboard" };
  }
}

type PlannerSkill = "LISTENING" | "READING" | "WRITING" | "SPEAKING";

const SKILL_ROUTE: Record<PlannerSkill, string> = {
  LISTENING: "/listening",
  READING: "/reading",
  WRITING: "/writing",
  SPEAKING: "/speaking",
};

/** The practice that advances each quest, in the order the planner is tried. */
const QUEST_SKILLS: Record<string, PlannerSkill[]> = {
  DO_LISTENING: ["LISTENING"],
  DO_READING: ["READING"],
  DO_WRITING: ["WRITING"],
  PERFECT_QUIZ: ["LISTENING", "READING"],
  COMPLETE_QUIZ: ["LISTENING", "READING", "WRITING"],
  DO_SPEAKING: ["SPEAKING"],
  PRACTICE_SPEAKING: ["SPEAKING"],
};

const PLANNED_LABEL: Record<string, string> = {
  DO_LISTENING: "Luyện nghe",
  DO_READING: "Luyện đọc",
  DO_WRITING: "Luyện viết",
  PERFECT_QUIZ: "Luyện",
  COMPLETE_QUIZ: "Luyện kỹ năng",
  DO_SPEAKING: "Luyện nói",
  PRACTICE_SPEAKING: "Luyện phát âm",
};

/**
 * A speaking exercise counts for one quest only (backend
 * daily-quest-catalog.ts): read-aloud and drills for pronunciation, the rest
 * for free speech. A planned item without a task type is not chosen for
 * either, since it might count for the other one.
 */
const PRONUNCIATION_TASKS = ["READ_ALOUD", "PRONUNCIATION_DRILL"];
function countsForQuest(type: string, taskType: string | null | undefined) {
  if (type === "PRACTICE_SPEAKING") return Boolean(taskType) && PRONUNCIATION_TASKS.includes(taskType!);
  if (type === "DO_SPEAKING") return Boolean(taskType) && !PRONUNCIATION_TASKS.includes(taskType!);
  return true;
}

export type QuestActionInput = {
  type?: string;
  actionLabel?: string;
  actionUrl?: string;
  quest?: { type?: string } | null;
};

export type PlannedPracticeInput = {
  skill: string;
  route: string;
  isLocked: boolean;
  isCompleted: boolean;
  taskType?: string | null;
};

function opensQuestSkill(route: string, skills: PlannerSkill[]) {
  return skills.some((skill) => {
    const base = SKILL_ROUTE[skill];
    return route === base || route.startsWith(base + "/") || route.startsWith(base + "?");
  });
}

/**
 * Where a daily-quest button goes: today's planned practice for the quest's
 * skills first, then the backend's link if it opens one of those skills, then
 * the skill's home. A quest button never opens a page whose activity cannot
 * advance that quest.
 */
export function resolveQuestAction(
  item: QuestActionInput,
  planned?: PlannedPracticeInput[],
): { actionLabel: string; actionUrl: string } {
  const type = (item.type ?? item.quest?.type ?? "").toUpperCase();
  const candidateUrl = item.actionUrl?.trim() || "";
  const candidateLabel = item.actionLabel?.trim() || "";
  const skills = QUEST_SKILLS[type];

  if (skills) {
    for (const skill of skills) {
      const next = planned?.find(
        (row) =>
          row.skill === skill &&
          !row.isLocked &&
          !row.isCompleted &&
          countsForQuest(type, row.taskType) &&
          isSafeInternalRoute(row.route) &&
          opensQuestSkill(row.route, [skill]),
      );
      if (next) return { actionLabel: PLANNED_LABEL[type], actionUrl: next.route };
    }
    const fallback = getTypeSpecificQuestFallback(type);
    if (candidateUrl && isSafeInternalRoute(candidateUrl) && opensQuestSkill(candidateUrl, skills))
      return { actionLabel: fallback.actionLabel, actionUrl: candidateUrl };
    return fallback;
  }

  if (candidateUrl && isSafeInternalRoute(candidateUrl)) {
    return { actionLabel: candidateLabel || "Tiếp tục học", actionUrl: candidateUrl };
  }
  const fallback = getTypeSpecificQuestFallback(type);
  return { actionLabel: candidateLabel || fallback.actionLabel, actionUrl: fallback.actionUrl };
}

export function clampPercentage(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((value / max) * 100)));
}

export function deriveDailyProgress(completedCount: number, totalCount: number): {
  safeCompleted: number;
  safeTotal: number;
  derivedPercent: number;
} {
  const safeTotal = Math.max(0, Number(totalCount) || 0);
  const safeCompleted = Math.max(
    0,
    Math.min(Number(completedCount) || 0, safeTotal)
  );
  const derivedPercent =
    safeTotal > 0 ? Math.round((safeCompleted / safeTotal) * 100) : 0;

  return { safeCompleted, safeTotal, derivedPercent };
}

export type WeekDayState = "today-done" | "today-pending" | "studied" | "missed" | "future";

/**
 * One cell of the dashboard's "Tuần này" row (0 = T2 … 6 = CN). `studied`
 * comes from /users/stats (days of this Vietnam week with XP, the events that
 * keep the streak); today also counts as done once a task is completed here.
 */
export function weekDayState(
  day: number,
  today: number,
  studied: number[] | undefined,
  doneToday: boolean,
): WeekDayState {
  const learned = studied?.includes(day) ?? false;
  if (day === today) return learned || doneToday ? "today-done" : "today-pending";
  if (day > today) return "future";
  return learned ? "studied" : "missed";
}

export function getVietnamDayOfWeek(dateKey?: string): number {
  if (dateKey && /^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    const [y, m, d] = dateKey.split("-").map(Number);
    const dObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    return (dObj.getUTCDay() + 6) % 7; // 0 for Monday (T2) ... 6 for Sunday (CN)
  }
  const vnFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "short",
  });
  const weekday = vnFormatter.format(new Date());
  const dayMap: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  return dayMap[weekday] ?? 0;
}

export function getVietnamGreeting(): string {
  const hourFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "numeric",
    hour12: false,
  });
  const hour = parseInt(hourFormatter.format(new Date()), 10);
  if (hour >= 5 && hour < 12) return "Chào buổi sáng";
  if (hour >= 12 && hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

export type FilterPeriod = "today" | "week" | "month" | "all" | "custom";
export type RequiredPlanTier = "FREE" | "PLUS" | "PRO";

export interface FilterPeriodConfig {
  key: FilterPeriod;
  label: string;
  requiredTier: RequiredPlanTier;
}

export const FILTER_PERIODS: FilterPeriodConfig[] = [
  { key: "today", label: "Hôm nay", requiredTier: "FREE" },
  { key: "week", label: "Tuần", requiredTier: "PLUS" },
  { key: "month", label: "Tháng", requiredTier: "PLUS" },
  { key: "all", label: "Tất cả", requiredTier: "PRO" },
  { key: "custom", label: "Tùy chỉnh", requiredTier: "PRO" },
];

export function canAccessFilterPeriod(
  periodKey: FilterPeriod,
  planCode?: string | null
): boolean {
  const code = (planCode ?? "FREE").trim().toUpperCase();
  const cfg = FILTER_PERIODS.find((p) => p.key === periodKey);
  if (!cfg || cfg.requiredTier === "FREE") return true;
  if (cfg.requiredTier === "PLUS") {
    return code === "PLUS" || code === "PRO";
  }
  if (cfg.requiredTier === "PRO") {
    return code === "PRO";
  }
  return false;
}

export type SkillKey = "exam" | "reading" | "listening" | "speaking" | "writing" | "vocab";

/** The tile and its detail, from GET /users/me/learning-summary (owner 2026-11-26). */
export interface SkillDetailConfig {
  key: SkillKey;
  /** The skill's entry in LearningSummary.skills. */
  summaryKey: "EXAM" | "READING" | "LISTENING" | "SPEAKING" | "WRITING" | "VOCAB";
  label: string;
  title: string;
  /** What the count is: finished items, never a made-up figure. */
  doneLabel: string;
  unit: string;
  /** The daily quest type that trains this skill, when there is one today. */
  questTypes: string[];
  ctaLabel: string;
  ctaHref: string;
}

export const SKILL_DETAIL_CONFIGS: Record<SkillKey, SkillDetailConfig> = {
  exam: {
    key: "exam",
    summaryKey: "EXAM",
    label: "Luyện đề",
    title: "Luyện đề",
    doneLabel: "Đề đã nộp",
    unit: "đề",
    questTypes: [],
    ctaLabel: "Luyện đề tiếp",
    ctaHref: "/exams",
  },
  reading: {
    key: "reading",
    summaryKey: "READING",
    label: "Đọc",
    title: "Đọc",
    doneLabel: "Bài đọc đã làm",
    unit: "bài",
    questTypes: ["DO_READING"],
    ctaLabel: "Luyện đọc tiếp",
    ctaHref: "/reading",
  },
  listening: {
    key: "listening",
    summaryKey: "LISTENING",
    label: "Nghe",
    title: "Nghe",
    doneLabel: "Bài nghe đã làm",
    unit: "bài",
    questTypes: ["DO_LISTENING"],
    ctaLabel: "Luyện nghe tiếp",
    ctaHref: "/listening",
  },
  speaking: {
    key: "speaking",
    summaryKey: "SPEAKING",
    label: "Nói",
    title: "Nói",
    doneLabel: "Lượt đã nói",
    unit: "lượt",
    questTypes: ["PRACTICE_SPEAKING"],
    ctaLabel: "Luyện nói tiếp",
    ctaHref: "/speaking",
  },
  writing: {
    key: "writing",
    summaryKey: "WRITING",
    label: "Viết",
    title: "Viết",
    doneLabel: "Bài viết đã nộp",
    unit: "bài",
    questTypes: ["DO_WRITING"],
    ctaLabel: "Luyện viết tiếp",
    ctaHref: "/writing",
  },
  vocab: {
    key: "vocab",
    summaryKey: "VOCAB",
    label: "Flashcard",
    title: "Flashcard",
    doneLabel: "Từ đã thuộc",
    unit: "từ",
    questTypes: ["LEARN_VOCAB", "DO_VOCAB"],
    ctaLabel: "Luyện Flashcard tiếp",
    ctaHref: "/flashcard",
  },
};

/** The order of the six tiles under "Kết quả học tập". */
export const SKILL_TILE_ORDER: SkillKey[] = ["exam", "reading", "listening", "speaking", "writing", "vocab"];

/** How a period reads after a figure: "25 phút hôm nay", "3 bài tuần này". */
export function periodPhrase(period: FilterPeriod): string {
  switch (period) {
    case "today":
      return "hôm nay";
    case "week":
      return "tuần này";
    case "month":
      return "tháng này";
    case "all":
      return "từ trước đến nay";
    default:
      return "trong khoảng đã chọn";
  }
}

/** Query of GET /users/me/learning-summary for the chosen period. */
export function learningSummaryParams(period: FilterPeriod, from: string, to: string) {
  return period === "custom" ? { period, from, to } : { period };
}


export function getVietnamFormattedDate(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
  });
  return formatter.format(date);
}
