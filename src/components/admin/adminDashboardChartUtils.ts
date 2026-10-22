export type DashboardTrend = {
  month: string;
  enrollments: number;
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
