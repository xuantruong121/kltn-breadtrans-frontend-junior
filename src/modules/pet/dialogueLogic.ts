/**
 * What the companion pet says, and when. Pure: no storage, no clock, no React.
 *
 * Owner 2026-11-09: the pet speaks only when something new happens, each thing once a day.
 * A reload or a page change never brings back a bubble the learner has already seen.
 */

import { getPetRecommendation } from "./petLogic.ts";

export type PetNudgeKind = "HUNGRY" | "STREAK" | "QUESTS";

export type PetNudgeAction =
  | { type: "feed"; label: string }
  | { type: "link"; label: string; url: string };

export interface PetNudge {
  /** Identifies the thing being said, so it is said once a day. */
  key: string;
  kind: PetNudgeKind;
  header: string;
  text: string;
  action?: PetNudgeAction;
}

export interface PetNudgeQuest {
  title?: string;
  description?: string | null;
  isCompleted: boolean;
  actionLabel?: string;
  actionUrl?: string;
}

export interface PetNudgeInput {
  petName: string;
  /** As the server computes it: FULL, NORMAL, HUNGRY or VERY_HUNGRY. */
  satietyState?: string;
  balance: number;
  feedCost: number;
  /**
   * When the pet last ate. A pet that is fed and gets hungry again later the
   * same day says so again: that is a new thing happening.
   */
  lastFedAt?: string | null;
  streak: number;
  /** Hour of the day in Vietnam time, 0-23. */
  hourVN: number;
  /** Learning activities recorded today. */
  activitiesCount: number;
  quests: PetNudgeQuest[];
}

/** From this hour on, a learner who has not studied today is reminded about the streak. */
export const STREAK_REMINDER_HOUR = 18;

/**
 * What a hungry pet says, or null when it is not hungry. Used by the floating
 * bubble and, without the once-a-day rule, by the pet's own card on the
 * dashboard and on the pet page (the floating pet is not shown there).
 */
export function hungerLine(input: {
  satietyState?: string;
  balance: number;
  feedCost: number;
}): { veryHungry: boolean; text: string; short: number } | null {
  if (input.satietyState !== "HUNGRY" && input.satietyState !== "VERY_HUNGRY") return null;
  const veryHungry = input.satietyState === "VERY_HUNGRY";
  const short = Math.max(0, input.feedCost - input.balance);
  const opening = veryHungry
    ? "Tớ đói lả rồi. Nhịn lâu nữa là sức khỏe tụt đó."
    : "Bụng tớ đói rồi. Cho tớ ăn một phần nhé?";
  return {
    veryHungry,
    short,
    text: short > 0 ? `${opening} Cậu còn thiếu ${short} Bánh Mì, làm nhiệm vụ hôm nay là có thêm.` : opening,
  };
}

/** Everything worth saying right now, most important first. */
export function activeNudges(input: PetNudgeInput): PetNudge[] {
  const name = input.petName.trim() || "Thú cưng";
  const next = getPetRecommendation(input.quests);
  const nextLink: PetNudgeAction | undefined = next
    ? { type: "link", label: next.actionLabel, url: next.actionUrl }
    : undefined;
  const total = input.quests.length;
  const done = input.quests.filter((q) => q.isCompleted).length;
  const nudges: PetNudge[] = [];

  const hunger = hungerLine(input);
  if (hunger) {
    nudges.push({
      // One line per hunger: fed and hungry again later is said again.
      key: `hungry:${input.satietyState}${input.lastFedAt ? `:${input.lastFedAt}` : ""}`,
      kind: "HUNGRY",
      header: `${name} · Đang đói`,
      text: hunger.text,
      action: hunger.short > 0 ? nextLink : { type: "feed", label: `Cho ăn (${input.feedCost} Bánh Mì)` },
    });
  }

  if (
    input.streak > 0 &&
    input.hourVN >= STREAK_REMINDER_HOUR &&
    input.activitiesCount === 0 &&
    done === 0
  ) {
    nudges.push({
      key: "streak-risk",
      kind: "STREAK",
      header: `${name} · Giữ chuỗi`,
      text: `Hôm nay cậu chưa học bài nào. Học một bài để giữ chuỗi ${input.streak} ngày nhé.`,
      action: nextLink,
    });
  }

  if (total > 0 && done > 0) {
    nudges.push(
      done < total
        ? {
            key: `quests:${done}`,
            kind: "QUESTS",
            header: `${name} · Nhiệm vụ hôm nay`,
            text: next
              ? `Xong ${done}/${total} nhiệm vụ hôm nay rồi. Còn: ${next.title}.`
              : `Xong ${done}/${total} nhiệm vụ hôm nay rồi.`,
            action: nextLink,
          }
        : {
            key: "quests:done",
            kind: "QUESTS",
            header: `${name} · Nhiệm vụ hôm nay`,
            text: `Xong cả ${total} nhiệm vụ hôm nay rồi. Giỏi quá!`,
          },
    );
  }

  return nudges;
}

/** The most important thing not yet said today, or null. */
export function pickNudge(nudges: PetNudge[], seen: readonly string[]): PetNudge | null {
  return nudges.find((n) => !seen.includes(n.key)) ?? null;
}

/**
 * Whether the learner can see what the pet says right now, so that it may be
 * counted as said today. On a wide screen the line is in the speech bubble or
 * in the open panel while the pet is on screen; on a phone the bubble is not
 * shown, so the line is seen only in the open panel.
 */
export function petLineShown(input: { wideScreen: boolean; petOnScreen: boolean; panelOpen: boolean }): boolean {
  if (!input.petOnScreen) return false;
  return input.wideScreen || input.panelOpen;
}

/** localStorage key holding what the pet has already said today. */
export const NUDGES_SEEN_KEY = "breadtrans.pet.nudges";

interface SeenRecord {
  userId: string;
  dateKey: string;
  seen: string[];
}

/** What was said today to this learner. Another day or another learner starts empty. */
export function parseSeen(raw: string | null, userId: string, dateKey: string): string[] {
  if (!raw) return [];
  try {
    const record = JSON.parse(raw) as Partial<SeenRecord>;
    if (record.userId !== userId || record.dateKey !== dateKey || !Array.isArray(record.seen)) return [];
    return record.seen.filter((k): k is string => typeof k === "string");
  } catch {
    return [];
  }
}

/** The stored value after these keys have been said. */
export function recordSeen(raw: string | null, userId: string, dateKey: string, keys: string[]): string {
  const seen = parseSeen(raw, userId, dateKey);
  for (const key of keys) if (!seen.includes(key)) seen.push(key);
  return JSON.stringify({ userId, dateKey, seen } satisfies SeenRecord);
}

/** Hour of the day in Vietnam (UTC+7, no daylight saving). */
export function hourInVietnam(at: Date): number {
  return (at.getUTCHours() + 7) % 24;
}
