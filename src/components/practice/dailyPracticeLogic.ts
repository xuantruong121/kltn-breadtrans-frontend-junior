import type { DailyPracticeItem, DailyPracticeResponse } from "@/lib/api/services/user.service";

export function dailyPracticeProgress(data: Pick<DailyPracticeResponse, "completedCount" | "targetActivities">) {
  const target = Math.max(0, Number(data.targetActivities) || 0);
  const completed = Math.min(target, Math.max(0, Number(data.completedCount) || 0));
  return {
    completed,
    target,
    percent: target === 0 ? 0 : Math.round((completed / target) * 100),
    isComplete: target > 0 && completed === target,
  };
}

export function dailyPracticeHref(item: Pick<DailyPracticeItem, "route" | "isLocked">) {
  return item.isLocked ? "/plans?highlight=plus" : item.route;
}
