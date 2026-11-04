/** Mirrors GET /admin/retention-metrics (backend retention-metrics.logic.ts). */
export type MetricRate = {
  /** Rows old enough for the figure to be final. */
  eligible: number;
  hits: number;
  rate: number | null;
};

export type RetentionCohort = {
  weekStart: string;
  signups: number;
  d1: MetricRate;
  d7: MetricRate;
  d30: MetricRate;
};

export type RenewalWeek = {
  weekStart: string;
  ended: number;
  renewed: MetricRate;
  early: MetricRate;
  wonBack: MetricRate;
  /** Of those won back, how many paid with a promo code. */
  wonBackWithCode?: number;
};

export type RetentionMetrics = {
  generatedAt: string;
  weeks: number;
  cohorts: RetentionCohort[];
  streak: MetricRate & { days: number };
  renewals: RenewalWeek[];
};

/** "50%" with the counts behind it, or a dash when nothing is final yet. */
export function formatRate(value: MetricRate): { percent: string; detail: string } {
  if (value.rate === null) return { percent: "—", detail: "chưa đủ ngày" };
  return {
    percent: `${Math.round(value.rate * 100)}%`,
    detail: `${value.hits}/${value.eligible}`,
  };
}

/** "02/11 – 08/11" for a week starting on Monday yyyy-mm-dd. */
export function formatWeek(weekStart: string): string {
  const [y, m, d] = weekStart.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, d));
  const end = new Date(start.getTime() + 6 * 86_400_000);
  const dm = (date: Date) =>
    `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  return `${dm(start)} – ${dm(end)}`;
}
