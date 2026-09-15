export const ALLOWED_INTERNAL_ROUTE_PREFIXES = [
  "/flashcard",
  "/practice",
  "/my-courses",
  "/courses",
  "/arena",
  "/grammar",
  "/vocabulary",
  "/classes",
];

export function isSafeInternalRoute(url?: string): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
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
      return { actionLabel: "Luyện nghe", actionUrl: "/practice/listening" };
    case "COMPLETE_QUIZ":
      return { actionLabel: "Làm bài kiểm tra", actionUrl: "/practice/quizzes" };
    case "DO_SPEAKING":
    case "PRACTICE_SPEAKING":
      return { actionLabel: "Luyện nói", actionUrl: "/practice/speaking" };
    case "COMPLETE_LESSON":
      return { actionLabel: "Mở bài học", actionUrl: "/my-courses" };
    default:
      return { actionLabel: "Khám phá bài học", actionUrl: "/practice" };
  }
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
