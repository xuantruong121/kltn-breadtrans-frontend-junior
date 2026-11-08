/**
 * Bảng xếp hạng in the browser: labels, how a value reads, how long ago, the
 * initials for a learner without a picture, and the weekly league line. Pure.
 */
export type RankingMetric = "xp" | "streak" | "referral";
export type RankingPeriod = "today" | "week" | "month" | "all";

export const METRICS: { id: RankingMetric; label: string }[] = [
  { id: "xp", label: "XP" },
  { id: "streak", label: "Chuỗi" },
  { id: "referral", label: "Giới thiệu" },
];

export const PERIODS: { id: RankingPeriod; label: string }[] = [
  { id: "today", label: "Hôm nay" },
  { id: "week", label: "Tuần này" },
  { id: "month", label: "Tháng này" },
  { id: "all", label: "Tất cả" },
];

/** The streak is today's streak: it has no period. */
export function hasPeriods(metric: RankingMetric): boolean {
  return metric !== "streak";
}

/** "27.900 XP", "233 ngày", "3 bạn". */
export function formatValue(metric: RankingMetric, value: number): string {
  const n = value.toLocaleString("vi-VN");
  return metric === "xp" ? `${n} XP` : metric === "streak" ? `${n} ngày` : `${n} bạn`;
}

/** The column heading for the value. */
export function valueHeading(metric: RankingMetric): string {
  return metric === "xp" ? "XP" : metric === "streak" ? "Chuỗi" : "Đã mời";
}

/** "vừa xong", "4 phút trước", "2 giờ trước", "3 ngày trước". */
export function timeAgo(iso: string, nowMs: number): string {
  const seconds = Math.max(0, Math.floor((nowMs - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "vừa xong";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

/** "Nguyễn Ngọc Tín" → "NT"; "Chip" → "CH"; nothing → "?". */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toLocaleUpperCase("vi-VN");
  return (words[0][0] + words[words.length - 1][0]).toLocaleUpperCase("vi-VN");
}

export type LeagueStandingLike = {
  tier: string;
  xpToPromotion: number | null;
  inDemotionZone: boolean;
  xpToLeaveDemotion: number | null;
};

/** One line on the weekly league, for "Vị trí của bạn". */
export function leagueLine(league: LeagueStandingLike | null): string | null {
  if (!league) return null;
  const tier = `Hạng ${league.tier}`;
  if (league.inDemotionZone)
    return league.xpToLeaveDemotion !== null
      ? `${tier} · đang ở vùng xuống hạng, cần thêm ${league.xpToLeaveDemotion.toLocaleString("vi-VN")} XP để thoát`
      : `${tier} · đang ở vùng xuống hạng`;
  if (league.xpToPromotion === null) return `${tier} · hạng cao nhất`;
  if (league.xpToPromotion === 0) return `${tier} · đang ở vùng lên hạng tuần này`;
  return `${tier} · cần thêm ${league.xpToPromotion.toLocaleString("vi-VN")} XP để vào vùng lên hạng`;
}

/** What "Vị trí của bạn" says when the learner is not on the board yet. */
export function emptyPlace(metric: RankingMetric, period: RankingPeriod): string {
  if (metric === "streak") return "Chưa có chuỗi ngày học";
  if (metric === "referral") return "Chưa mời được bạn nào";
  return period === "today" ? "Chưa có XP hôm nay" : period === "week" ? "Chưa có XP tuần này" : period === "month" ? "Chưa có XP tháng này" : "Chưa có XP";
}
