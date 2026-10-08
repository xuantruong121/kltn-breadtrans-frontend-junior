import type {
  DailyPracticeResponse,
  DailyPracticeSkill,
} from "@/lib/api/services/user.service";

/** Project the global server plan into the skill page's visible context. */
export function projectDailyPracticeForSkill(
  data: DailyPracticeResponse | undefined,
  skill: DailyPracticeSkill,
): DailyPracticeResponse | undefined {
  if (!data) return undefined;

  const items = data.items.filter((item) => item.skill === skill);
  if (items.length === 0) return undefined;

  return {
    ...data,
    items,
    targetActivities: items.length,
    completedCount: items.filter((item) => item.isCompleted).length,
    estimatedMinutes: items.reduce(
      (total, item) => total + item.estimatedMinutes,
      0,
    ),
  };
}
