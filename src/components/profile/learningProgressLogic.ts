import type {
  LearningActivity,
  SkillProgressSummary,
  UserLearningStats,
} from "@/lib/api/services/user.service";
import { quizDisplayTitle } from "../../lib/catalog/displayTitles.ts";

export interface DayActivity {
  dayLabel: string;
  dateStr: string;
  count: number;
  isActive: boolean;
  percentage: number;
}

export interface WeeklyActivitySummary {
  days: DayActivity[];
  activeDaysCount: number;
  totalActivitiesThisWeek: number;
}

export interface GroupedActivity {
  id: string | number;
  type: string;
  title: string;
  /** The exercise or topic name as stored when the learner did it, if it is a readable title. */
  subject?: string;
  detail: string;
  occurredAt: string;
  dateDisplay: string;
  count: number;
  score?: number | null;
}

export interface SkillDisplayMetrics {
  primaryValue: string;
  primarySub: string;
  percent: number;
  scoreText: string;
  hasScore: boolean;
  statusLabel: "Đang tiến bộ" | "Cần luyện thêm" | "Chưa đủ dữ liệu" | "Ổn định";
  statusColor: "emerald" | "amber" | "slate" | "blue";
  ctaLabel: string;
  ctaHref: string;
}

export interface LearnerMilestone {
  id: string;
  title: string;
  description: string;
}

const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";

function vietnamDateKey(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: VIETNAM_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/**
 * Format a timestamp into user-friendly Vietnamese relative / calendar date.
 */
export function formatFriendlyDate(dateStr?: string | null): string {
  if (!dateStr) return "Chưa học";
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "Chưa học";

    const now = new Date();
    const todayStr = vietnamDateKey(now);
    const itemStr = vietnamDateKey(d);

    if (itemStr === todayStr) return "Hôm nay";

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (itemStr === vietnamDateKey(yesterday)) return "Hôm qua";

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    if (year === now.getFullYear()) {
      return `${day}/${month}`;
    }
    return `${day}/${month}/${year}`;
  } catch {
    return "Chưa học";
  }
}

/**
 * Computes 7-day learning activity strip ending today.
 */
export function computeWeeklyActivity(
  activities: LearningActivity[] = [],
  referenceDate = new Date(),
): WeeklyActivitySummary {
  const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const days: DayActivity[] = [];

  // Group activity count by YYYY-MM-DD
  const countByDate = new Map<string, number>();
  for (const act of activities) {
    if (!act.occurredAt) continue;
    try {
      const dateKey = vietnamDateKey(act.occurredAt);
      countByDate.set(dateKey, (countByDate.get(dateKey) ?? 0) + 1);
    } catch {
      // Ignore invalid date
    }
  }

  // Generate last 7 days (today - 6 to today)
  for (let i = 6; i >= 0; i--) {
    const current = new Date(referenceDate);
    current.setDate(referenceDate.getDate() - i);
    const dateStr = vietnamDateKey(current);
    const count = countByDate.get(dateStr) ?? 0;
    const dayOfWeek = new Date(`${dateStr}T12:00:00+07:00`).getUTCDay();

    days.push({
      dayLabel: dayNames[dayOfWeek],
      dateStr,
      count,
      isActive: count > 0,
      percentage: 0,
    });
  }

  const maxCount = Math.max(1, ...days.map((d) => d.count));
  for (const day of days) {
    day.percentage = day.count > 0 ? Math.max(18, Math.round((day.count / maxCount) * 100)) : 6;
  }

  const activeDaysCount = days.filter((d) => d.isActive).length;
  const totalActivitiesThisWeek = days.reduce((sum, d) => sum + d.count, 0);

  return {
    days,
    activeDaysCount,
    totalActivitiesThisWeek,
  };
}

/**
 * Map technical database activity names to friendly human labels.
 */
function sanitizeActivityCategory(title: string, type?: string | null): string {
  const t = (title || "").toLowerCase();
  const rawType = (type || "").toUpperCase();

  if (t.includes("diagnostic") || rawType.includes("DIAGNOSTIC")) {
    return "Đánh giá đầu vào";
  }
  if (t.includes("từ vựng") || t.includes("vocab") || rawType.includes("VOCAB")) {
    return "Học từ vựng";
  }
  if (t.includes("toeic") || rawType.includes("TOEIC")) {
    return "Luyện đề TOEIC";
  }
  if (t.includes("nói") || t.includes("speaking") || rawType.includes("SPEAKING")) {
    return "Luyện nói & phát âm";
  }
  if (t.includes("nghe") || t.includes("listening") || rawType.includes("LISTENING")) {
    return "Luyện nghe hiểu";
  }
  if (t.includes("đọc") || t.includes("reading") || rawType.includes("READING")) {
    return "Luyện đọc hiểu";
  }
  if (t.includes("viết") || t.includes("writing") || rawType.includes("WRITING")) {
    return "Luyện viết câu";
  }
  if (t.includes("bài học") || t.includes("lesson") || rawType.includes("LESSON") || rawType.includes("COURSE")) {
    return "Bài học khóa học";
  }
  if (
    rawType ||
    /^[A-Z0-9_]+$/.test(title || "") ||
    /courselessonattempt/i.test(title || "")
  ) {
    return "Hoạt động học tập";
  }
  return title || "Hoạt động học tập";
}

/**
 * The stored activity title is the exercise name at the time it was done
 * ("Listening A1 — Essential Everyday English"). Show it when it is a readable
 * name; technical codes and generic labels fall back to the category alone.
 */
function activitySubject(
  title: string | null | undefined,
  category: string,
  quizId?: number | null,
): string | undefined {
  const t = practiceTitle((title || "").trim(), quizId);
  if (!t || t === category) return undefined;
  if (/^[A-Z0-9_]+$/.test(t) || /courselessonattempt/i.test(t)) return undefined;
  if (/^(Học từ vựng|Hoạt động học tập)$/i.test(t)) return undefined;
  // Old rows may carry internal names ("Entry Diagnostic v2"); never show those.
  if (/\b[Vv]\d+(\.\d+)?\b|legacy|runtime/i.test(t)) return undefined;
  return t;
}

/**
 * The catalog's display title for a practice quiz row, keeping a Writing
 * task suffix ("— Câu 2/5"). Rows without a quiz keep their stored text.
 */
function practiceTitle(stored: string, quizId?: number | null): string {
  if (quizId == null || !stored) return stored;
  const task = / — (Câu \d+\/\d+)$/.exec(stored);
  const base = task ? stored.slice(0, task.index) : stored;
  const title = quizDisplayTitle(quizId, base);
  return task ? `${title} · ${task[1]}` : title;
}

/**
 * Group repetitive activities (e.g. multiple vocabulary words or repeated diagnostics on the same day).
 */
export function groupRecentActivities(
  activities: LearningActivity[] = [],
): GroupedActivity[] {
  if (!activities || activities.length === 0) return [];

  const grouped: GroupedActivity[] = [];
  const handled = new Set<number>();

  for (let i = 0; i < activities.length; i++) {
    const current = activities[i];
    if (handled.has(current.id)) continue;

    const dateKey = current.occurredAt ? current.occurredAt.slice(0, 10) : "";
    const category = sanitizeActivityCategory(current.title, current.type);

    // Only vocabulary and diagnostic events are semantically safe to aggregate.
    const canAggregate =
      category === "Học từ vựng" || category === "Đánh giá đầu vào";
    const sameGroup: LearningActivity[] = [current];
    handled.add(current.id);

    // Look ahead for same category and same date
    for (let j = i + 1; j < activities.length; j++) {
      const next = activities[j];
      if (handled.has(next.id)) continue;
      const nextDateKey = next.occurredAt ? next.occurredAt.slice(0, 10) : "";
      const nextCategory = sanitizeActivityCategory(next.title, next.type);

      if (
        canAggregate &&
        dateKey &&
        nextDateKey === dateKey &&
        nextCategory === category
      ) {
        sameGroup.push(next);
        handled.add(next.id);
      }
    }

    const count = sameGroup.length;
    const scores = sameGroup
      .map((a) => a.score)
      .filter((s): s is number => s != null && Number.isFinite(s));
    const bestScore = scores.length > 0 ? Math.round(Math.max(...scores)) : null;

    let detail = current.detail || "Đã hoàn thành hoạt động";

    if (category === "Học từ vựng") {
      detail = count > 1 ? `Đã ghi nhớ ${count} từ vựng mới` : (current.detail || "Đã học từ vựng mới");
    } else if (category === "Đánh giá đầu vào") {
      if (count > 1) {
        detail = `${count} lượt làm bài${bestScore != null ? ` · Điểm cao nhất: ${bestScore}%` : ""}`;
      } else if (current.score != null) {
        detail = `Hoàn thành đánh giá · Điểm: ${Math.round(current.score)}%`;
      }
    } else if (count > 1) {
      detail = `Đã hoàn thành ${count} lượt bài tập${bestScore != null ? ` · Điểm cao nhất: ${bestScore}%` : ""}`;
    }

    grouped.push({
      id: current.id,
      type: current.type,
      title: category,
      // Aggregated rows (several words, several attempts) have no single name.
      subject: count > 1 ? undefined : activitySubject(current.title, category, current.quizId),
      detail,
      occurredAt: current.occurredAt,
      dateDisplay: formatFriendlyDate(current.occurredAt),
      count,
      score: bestScore,
    });
  }

  return grouped;
}

/**
 * Calculates display semantics for each of the 4 skills, resolving the 0/13 = 0% contradiction.
 */
export function getSkillDisplayMetrics(skill: SkillProgressSummary): SkillDisplayMetrics {
  const total = Math.max(0, skill.totalItems || 0);
  const completed = Math.max(0, skill.completedItems || 0);

  let primaryValue = "";
  let primarySub = "";
  let percent = 0;

  if (skill.skill === "SPEAKING") {
    const totalExercises = skill.totalExercises || 0;
    const completedExercises = skill.completedExercises || 0;

    if (totalExercises > 0) {
      if (completed > 0) {
        primaryValue = `${completed}/${total} chủ đề`;
        primarySub = `${completedExercises}/${totalExercises} phần luyện`;
        percent = skill.progressPercent;
      } else if (completedExercises > 0) {
        primaryValue = `${completedExercises}/${totalExercises} phần luyện`;
        primarySub = "Đã bắt đầu luyện tập";
        percent = Math.min(100, Math.round((completedExercises / totalExercises) * 100));
      } else {
        primaryValue = `0/${totalExercises} phần luyện`;
        primarySub = "Chưa bắt đầu";
        percent = 0;
      }
    } else if (total > 0) {
      primaryValue = `${completed}/${total} bài`;
      primarySub = "Hoàn thành";
      percent = skill.progressPercent;
    } else {
      primaryValue = "Chưa có bài";
      primarySub = "Đang cập nhật";
      percent = 0;
    }
  } else {
    if (total > 0) {
      primaryValue = `${completed}/${total} ${skill.unitLabel || "bài"}`;
      primarySub =
        completed === 0 && !skill.completedAttempts
          ? "Chưa bắt đầu luyện"
          : `${skill.progressPercent}% hoàn thành`;
      percent = skill.progressPercent;
    } else {
      primaryValue = "Chưa có bài";
      primarySub = "Đang cập nhật";
      percent = 0;
    }
  }

  // Score semantics (distinguish no attempts from zero score)
  let scoreText = "Chưa đủ dữ liệu";
  let hasScore = false;

  if (skill.completedAttempts && skill.completedAttempts > 0 && skill.normalizedScore != null) {
    scoreText = `${Math.round(skill.normalizedScore)}% điểm trung bình`;
    hasScore = true;
  } else if (skill.normalizedScore != null && skill.hasEnoughData !== false) {
    scoreText = `${Math.round(skill.normalizedScore)}% điểm trung bình`;
    hasScore = true;
  }

  // Deterministic Status without AI
  let statusLabel: "Đang tiến bộ" | "Cần luyện thêm" | "Chưa đủ dữ liệu" | "Ổn định" = "Chưa đủ dữ liệu";
  let statusColor: "emerald" | "amber" | "slate" | "blue" = "slate";

  if (!hasScore || !skill.completedAttempts || skill.completedAttempts === 0) {
    statusLabel = "Chưa đủ dữ liệu";
    statusColor = "slate";
  } else if (skill.trend === "IMPROVING" || (skill.normalizedScore != null && skill.normalizedScore >= 75)) {
    statusLabel = "Đang tiến bộ";
    statusColor = "emerald";
  } else if (skill.trend === "DECLINING" || (skill.normalizedScore != null && skill.normalizedScore < 50)) {
    statusLabel = "Cần luyện thêm";
    statusColor = "amber";
  } else {
    statusLabel = "Ổn định";
    statusColor = "blue";
  }

  const ctaMap: Record<SkillProgressSummary["skill"], { label: string; href: string }> = {
    LISTENING: { label: "Luyện nghe", href: "/listening" },
    SPEAKING: { label: "Luyện nói", href: "/speaking" },
    READING: { label: "Luyện đọc", href: "/reading" },
    WRITING: { label: "Luyện viết", href: "/writing" },
  };

  return {
    primaryValue,
    primarySub,
    percent,
    scoreText,
    hasScore,
    statusLabel,
    statusColor,
    ctaLabel: ctaMap[skill.skill]?.label || "Luyện tập",
    ctaHref: ctaMap[skill.skill]?.href || "/",
  };
}

/**
 * Extracts real truthful learner milestones without fabricated badges.
 */
export function getLearnerMilestones(
  stats?: UserLearningStats | null,
  completedSkillsCount = 0,
): LearnerMilestone[] {
  const milestones: LearnerMilestone[] = [];

  if (stats?.masteredVocabCount && stats.masteredVocabCount > 0) {
    milestones.push({
      id: "vocab-mastery",
      title: `${stats.masteredVocabCount} Từ vựng đã nhớ`,
      description: "Đã vượt qua chu trình kiểm tra lặp lại ngắt quãng (SRS)",
    });
  }

  if (stats?.streakCount && stats.streakCount > 0) {
    milestones.push({
      id: "study-streak",
      title: `${stats.streakCount} Ngày học liên tiếp`,
      description: "Duy trì thói quen học tập đều đặn mỗi ngày",
    });
  }

  if (stats?.totalToeicTestsDone && stats.totalToeicTestsDone > 0) {
    milestones.push({
      id: "toeic-practice",
      title: `${stats.totalToeicTestsDone} Lượt thi TOEIC`,
      description: "Đã làm bài thi thử nghiệm theo chuẩn format TOEIC",
    });
  }

  if (completedSkillsCount > 0) {
    milestones.push({
      id: "skills-practiced",
      title: `${completedSkillsCount} Bài luyện 4 kỹ năng`,
      description: "Tích lũy hoàn thành các bài luyện nghe, nói, đọc, viết",
    });
  }

  return milestones.slice(0, 3);
}
