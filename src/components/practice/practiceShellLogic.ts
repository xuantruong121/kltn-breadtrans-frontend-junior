export function practiceProgressPercent(current?: number, total?: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(total) || (total ?? 0) <= 0) return 0;
  return Math.round(Math.min(100, Math.max(0, ((current ?? 0) / (total ?? 1)) * 100)));
}
