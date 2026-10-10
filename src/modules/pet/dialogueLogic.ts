/**
 * Deterministic domain logic for the BreadTrans 2D companion dialogue engine.
 * Pure state machine handling HUNGRY, STREAK_NUDGE, GOAL_PROGRESS, and ON_CLICK / POKE.
 */

export type PetDialogueKind = "HUNGRY" | "STREAK_NUDGE" | "GOAL_PROGRESS" | "ON_CLICK" | "IDLE";

export interface PetDialogueAction {
  label: string;
  url?: string;
  onClickType?: "START_PRACTICE" | "EXPAND_PET" | "FEED_PET";
}

export interface PetDialogueContent {
  kind: PetDialogueKind;
  header: string;
  text: string;
  action?: PetDialogueAction;
}

export const POKE_MESSAGES: string[] = [
  "Chăm chỉ học tập hôm nay, mai sau bay bổng tương lai!",
  "Cậu đang học Nghe hả? Nhớ chú ý các âm nuốt nha!",
  "Nhột quá đi! Học bài tiếp thôi nào bạn ơi! 😆",
];

export const HUNGRY_MESSAGES: string[] = [
  "Bready đói bụng rồi... Mau làm bài tập kiếm Bánh Mì cho tớ ăn đi! 🍞",
  "Tớ xẹp lép rồi nè! 1 bài nghe nữa là đủ đổi Bánh Mì nóng hổi đó! 😋",
];

export interface ResolveDialogueOptions {
  petName?: string;
  satiety?: number;
  idleDurationMs?: number;
  streak?: number;
  isStreakAtRisk?: boolean;
  completedQuestsCount?: number;
  totalQuestsCount?: number;
  pokeMessageIndex?: number;
  forcePoke?: boolean;
}

/**
 * Resolves the active dialogue bubble content based on vitals, streak, and learner events.
 * Strict priority: ON_CLICK (forcePoke) > HUNGRY > STREAK_NUDGE > GOAL_PROGRESS.
 */
export function resolvePetDialogue(options: ResolveDialogueOptions): PetDialogueContent | null {
  const name = options.petName?.trim() || "Bready";

  // 1. Explicit user poke / click
  if (options.forcePoke) {
    const pokeIdx = Math.abs(options.pokeMessageIndex ?? 0) % POKE_MESSAGES.length;
    return {
      kind: "ON_CLICK",
      header: `${name} · Cổ vũ 💪`,
      text: POKE_MESSAGES[pokeIdx],
      action: {
        label: "Luyện bài ngay",
        url: "/listening",
        onClickType: "START_PRACTICE",
      },
    };
  }

  // 2. HUNGRY state: satiety < 30 OR idle >= 3 minutes (180,000 ms) with non-full belly
  const satiety = options.satiety ?? 80;
  const isIdle3Min = (options.idleDurationMs ?? 0) >= 180_000;
  if (satiety < 30 || (isIdle3Min && satiety < 60)) {
    const hungryIdx = satiety < 20 ? 1 : 0;
    return {
      kind: "HUNGRY",
      header: `${name} · Đang đói 🥖`,
      text: HUNGRY_MESSAGES[hungryIdx],
      action: {
        label: "Luyện bài ngay",
        url: "/listening",
        onClickType: "START_PRACTICE",
      },
    };
  }

  // 3. STREAK_NUDGE state: current streak at risk / uncompleted daily quest
  const streak = options.streak ?? 0;
  if (streak > 0 && options.isStreakAtRisk) {
    return {
      kind: "STREAK_NUDGE",
      header: `${name} · Cổ vũ Streak 🔥`,
      text: `Đừng để tắt ngọn lửa Streak nhé! Hoàn thành 1 bài để giữ chuỗi ${streak} ngày nào! 🔥`,
      action: {
        label: "Giữ Streak",
        url: "/listening",
        onClickType: "START_PRACTICE",
      },
    };
  }

  // 4. GOAL_PROGRESS state: daily progress in-flight
  const completed = options.completedQuestsCount ?? 0;
  const total = options.totalQuestsCount ?? 0;
  if (completed > 0 && total > 0 && completed < total) {
    return {
      kind: "GOAL_PROGRESS",
      header: `${name} · Mục tiêu hôm nay 🎯`,
      text: `Tiến độ hôm nay: ${completed}/${total} bài rồi! Cố thêm một xíu nữa là xong! 🎯`,
      action: {
        label: "Luyện tiếp",
        url: "/listening",
        onClickType: "START_PRACTICE",
      },
    };
  }

  return null;
}
