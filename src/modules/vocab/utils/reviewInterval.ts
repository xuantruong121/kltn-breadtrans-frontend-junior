/**
 * How long until a word comes back, as the rating buttons say it. The server
 * sends whole days; 0 is the ten-minute relearn step.
 */
export function formatReviewInterval(days: number): string {
  if (!Number.isFinite(days) || days < 1) return "10 phút";
  const whole = Math.round(days);
  if (whole < 30) return `${whole} ngày`;
  if (whole < 365) return `${Math.round(whole / 30)} tháng`;
  return "1 năm";
}
