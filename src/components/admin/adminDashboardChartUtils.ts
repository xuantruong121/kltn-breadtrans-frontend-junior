export type DashboardTrend = {
  month: string;
  activityCount: number;
  revenueVnd?: number;
};

export function getBarHeightPercent(value: number, maximum: number) {
  if (value <= 0 || maximum <= 0) return 0;
  return Math.max(4, Math.round((value / maximum) * 100));
}

export function getRangeLabel(range: string) {
  switch (range) {
    case "30d":
      return "30 ngày gần nhất";
    case "12m":
      return "12 tháng gần nhất";
    default:
      return "6 tháng gần nhất";
  }
}

/** What "Kỳ trước" means for each range: the same length just before it. */
export function getPreviousRangeLabel(range: string) {
  switch (range) {
    case "30d":
      return "30 ngày trước đó";
    case "12m":
      return "12 tháng trước đó";
    default:
      return "6 tháng trước đó";
  }
}

/**
 * Total, best period and how many periods had anything (2026-11-26: a best
 * period was named even when every period was 0, and an average over mostly
 * empty days said nothing).
 */
export function trendSummary(points: { label: string; value: number }[]) {
  const total = points.reduce((sum, point) => sum + point.value, 0);
  const peak = points.reduce<{ label: string; value: number } | null>(
    (best, point) => (point.value > (best?.value ?? 0) ? point : best),
    null,
  );
  const activePeriods = points.filter((point) => point.value > 0).length;
  return { total, peak, activePeriods, periodCount: points.length };
}

/** A count with its sign, for an adjustment: "+1.360", "-50", "0". */
export function signedCount(value?: number | null): string {
  const n = Number(value ?? 0);
  return n > 0 ? `+${n.toLocaleString("vi-VN")}` : n.toLocaleString("vi-VN");
}

/** How long the oldest waiting item has waited: "3 ngày", "5 giờ", "dưới 1 giờ". */
export function waitedFor(since?: string | Date | null, now = new Date()): string | null {
  if (!since) return null;
  const waited = now.getTime() - new Date(since).getTime();
  if (!Number.isFinite(waited)) return null;
  const hours = Math.floor(waited / 3_600_000);
  if (hours < 1) return "dưới 1 giờ";
  if (hours < 24) return `${hours} giờ`;
  return `${Math.floor(hours / 24)} ngày`;
}

export type ContentBreakdown = {
  vocabDecks: number;
  grammarTopics: number;
  listeningLessons: number;
  readingLessons: number;
  writingLessons: number;
  speakingSets: number;
  exams: number;
  mediaTopics: number;
};

/**
 * One row per area, each in its own unit (owner 2026-11-26: decks, topics,
 * lessons, exercises and "files" were summed into one total and shared out
 * as percentages). Skill practice only; exams have their own row.
 */
export function contentBreakdownRows(data?: Partial<ContentBreakdown> | null) {
  const count = (key: keyof ContentBreakdown) => Number(data?.[key] ?? 0);
  return [
    { label: "Từ vựng", count: count("vocabDecks"), unit: "bộ từ" },
    { label: "Ngữ pháp", count: count("grammarTopics"), unit: "chủ đề" },
    { label: "Nghe", count: count("listeningLessons"), unit: "bài" },
    { label: "Đọc", count: count("readingLessons"), unit: "bài" },
    { label: "Viết", count: count("writingLessons"), unit: "bài" },
    { label: "Nói", count: count("speakingSets"), unit: "bộ luyện" },
    { label: "Luyện đề", count: count("exams"), unit: "đề" },
    { label: "Phim, nhạc", count: count("mediaTopics"), unit: "chủ đề" },
  ];
}
