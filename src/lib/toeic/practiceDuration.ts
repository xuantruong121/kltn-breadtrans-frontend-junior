/**
 * Minutes a Practice by Part attempt gets, per Part. Same table as the backend
 * (kltn-breadtrans-backend src/modules/toeic/toeic-practice-duration.logic.ts),
 * which sets the attempt's real deadline; this copy only tells the learner
 * before they start. The seven Parts add up to the 120-minute Full Test.
 */
export const PRACTICE_PART_MINUTES: Readonly<Record<number, number>> = {
  1: 5,
  2: 9,
  3: 17,
  4: 14,
  5: 11,
  6: 8,
  7: 56,
};

export function practiceMinutes(parts: readonly number[]): number {
  return [...new Set(parts)].reduce((sum, part) => sum + (PRACTICE_PART_MINUTES[part] ?? 0), 0);
}
