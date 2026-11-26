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
