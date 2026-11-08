/**
 * The eight badges and the rule that grants each. The backend decides
 * (badge-rules.logic.ts, rules changed 2026-11-08) and sends the facts it
 * counts through GET /gamification/badges/progress; this file only words the
 * rules and draws the progress. Badges grant no Bánh Mì or XP of their own.
 * Pure: the learner's numbers come in as arguments.
 */
export type BadgeGroup = "learning" | "streak" | "arena" | "pet";

/** "Đấu Sĩ Bất Bại": this many Arena wins in a row. */
export const ARENA_STREAK_BADGE = 5;

export type BadgeDefinition = {
  name: string;
  group: BadgeGroup;
  /** What earns it, in one sentence the learner can act on. */
  rule: string;
  /** Measurable progress toward the rule. */
  progress: ((facts: BadgeFacts) => { value: number; target: number; unit: string }) | null;
};

/** As counted by the backend (BadgeFacts in badge-rules.logic.ts). */
export type BadgeFacts = {
  totalXp: number;
  weeklyXp: number;
  isWeeklyTop: boolean;
  streak: number;
  perfectPractices: number;
  highSpeaking: number;
  longestArenaWinStreak: number;
  petLevel: number;
};

export const NO_BADGE_FACTS: BadgeFacts = {
  totalXp: 0,
  weeklyXp: 0,
  isWeeklyTop: false,
  streak: 0,
  perfectPractices: 0,
  highSpeaking: 0,
  longestArenaWinStreak: 0,
  petLevel: 1,
};

export const BADGES: readonly BadgeDefinition[] = [
  {
    name: "Tân Binh",
    group: "learning",
    rule: "Tích lũy 500 XP.",
    progress: (f) => ({ value: f.totalXp, target: 500, unit: "XP" }),
  },
  {
    name: "Thợ Săn",
    group: "learning",
    rule: "Tích lũy 5.000 XP.",
    progress: (f) => ({ value: f.totalXp, target: 5000, unit: "XP" }),
  },
  {
    name: "Học Bá",
    group: "learning",
    rule: "Đạt 100% ở 10 bài luyện Nghe hoặc Đọc khác nhau.",
    progress: (f) => ({ value: f.perfectPractices, target: 10, unit: "bài" }),
  },
  {
    name: "Giọng Đọc Vàng",
    group: "learning",
    rule: "Đạt từ 80 điểm ở 10 bài luyện nói khác nhau.",
    progress: (f) => ({ value: f.highSpeaking, target: 10, unit: "bài" }),
  },
  {
    name: "Chăm Chỉ",
    group: "streak",
    rule: "Giữ chuỗi 7 ngày học liên tiếp.",
    progress: (f) => ({ value: f.streak, target: 7, unit: "ngày" }),
  },
  {
    name: "Siêu Sao",
    group: "streak",
    rule: "Đứng đầu bảng xếp hạng tuần của toàn hệ thống, với ít nhất 1.000 XP trong tuần.",
    progress: (f) => ({ value: f.weeklyXp, target: 1000, unit: "XP tuần này" }),
  },
  {
    name: "Đấu Sĩ Bất Bại",
    group: "arena",
    rule: `Thắng ${ARENA_STREAK_BADGE} trận Đấu trường liên tiếp.`,
    progress: (f) => ({ value: f.longestArenaWinStreak, target: ARENA_STREAK_BADGE, unit: "trận liên tiếp" }),
  },
  {
    name: "Chuyên Gia Nuôi Thú",
    group: "pet",
    rule: "Nuôi thú ảo lên cấp 3.",
    progress: (f) => ({ value: f.petLevel, target: 3, unit: "cấp" }),
  },
];

export type BadgeView = BadgeDefinition & {
  earnedAt: string | null;
  /** Progress capped at the target; null for one-off badges. */
  current: { value: number; target: number; unit: string; ratio: number } | null;
};

export function badgeViews(
  facts: BadgeFacts,
  earned: ReadonlyArray<{ awardedAt?: string | null; badge?: { name?: string } | null }>,
): BadgeView[] {
  // A row in the list means the badge is earned, whatever its date says.
  const earnedAt = new Map<string, string>();
  for (const row of earned) if (row.badge?.name) earnedAt.set(row.badge.name, row.awardedAt ?? "");
  return BADGES.map((badge) => {
    const p = badge.progress?.(facts) ?? null;
    const value = p ? Math.min(Math.max(0, p.value), p.target) : 0;
    return {
      ...badge,
      earnedAt: earnedAt.has(badge.name) ? earnedAt.get(badge.name)! : null,
      current: p ? { ...p, value, ratio: value / p.target } : null,
    };
  });
}

/** The unearned badge with measurable progress that is closest to done. */
export function nextBadge(views: readonly BadgeView[]): BadgeView | null {
  // A badge whose condition is already met is about to be granted, not "close".
  const open = views.filter((v) => v.earnedAt === null && v.current && v.current.ratio < 1);
  if (!open.length) return null;
  return open.reduce((best, v) => (v.current!.ratio > best.current!.ratio ? v : best));
}
