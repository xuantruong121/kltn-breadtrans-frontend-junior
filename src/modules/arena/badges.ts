/**
 * The eight badges and the rule that grants each, as the backend applies it
 * (gamification.service.ts getMyBadges, gamification.listener.ts and the
 * arena.match_won handler). Badges grant no Bánh Mì or XP of their own.
 * Pure: the learner's numbers come in as arguments.
 */
export type BadgeGroup = "learning" | "streak" | "arena" | "pet";

export type BadgeDefinition = {
  name: string;
  group: BadgeGroup;
  /** What earns it, in one sentence the learner can act on. */
  rule: string;
  /** Measurable progress, when the rule is a count; null for one-off events. */
  progress: ((facts: BadgeFacts) => { value: number; target: number; unit: string }) | null;
};

export type BadgeFacts = {
  totalXp: number;
  streak: number;
  petLevel: number;
  arenaWins: number;
};

export const BADGES: readonly BadgeDefinition[] = [
  {
    name: "Tân Binh",
    group: "learning",
    rule: "Tích luỹ 100 XP.",
    progress: (f) => ({ value: f.totalXp, target: 100, unit: "XP" }),
  },
  {
    name: "Thợ Săn",
    group: "learning",
    rule: "Tích luỹ 1.000 XP.",
    progress: (f) => ({ value: f.totalXp, target: 1000, unit: "XP" }),
  },
  {
    name: "Học Bá",
    group: "learning",
    rule: "Đạt 100% một bài luyện Nghe, Đọc hoặc Viết.",
    progress: null,
  },
  {
    name: "Giọng Đọc Vàng",
    group: "learning",
    rule: "Đạt từ 80 điểm ở một bài luyện nói.",
    progress: null,
  },
  {
    name: "Chăm Chỉ",
    group: "streak",
    rule: "Có chuỗi ngày học đầu tiên.",
    progress: (f) => ({ value: f.streak, target: 1, unit: "ngày" }),
  },
  {
    name: "Siêu Sao",
    group: "streak",
    rule: "Đứng đầu bảng xếp hạng tuần của toàn hệ thống.",
    progress: null,
  },
  {
    name: "Đấu Sĩ Bất Bại",
    group: "arena",
    rule: "Thắng một trận ở Đấu trường.",
    progress: (f) => ({ value: f.arenaWins, target: 1, unit: "trận thắng" }),
  },
  {
    name: "Chuyên Gia Nuôi Thú",
    group: "pet",
    rule: "Nuôi thú ảo lên cấp 2.",
    progress: (f) => ({ value: f.petLevel, target: 2, unit: "cấp" }),
  },
];

export type BadgeView = BadgeDefinition & {
  earnedAt: string | null;
  /** Progress capped at the target; null for one-off badges. */
  current: { value: number; target: number; unit: string; ratio: number } | null;
};

export function badgeViews(
  facts: BadgeFacts,
  earned: ReadonlyArray<{ earnedAt: string; badge?: { name?: string } | null }>,
): BadgeView[] {
  const earnedAt = new Map<string, string>();
  for (const row of earned) if (row.badge?.name) earnedAt.set(row.badge.name, row.earnedAt);
  return BADGES.map((badge) => {
    const p = badge.progress?.(facts) ?? null;
    const value = p ? Math.min(Math.max(0, p.value), p.target) : 0;
    return {
      ...badge,
      earnedAt: earnedAt.get(badge.name) ?? null,
      current: p ? { ...p, value, ratio: value / p.target } : null,
    };
  });
}

/** The unearned badge with measurable progress that is closest to done. */
export function nextBadge(views: readonly BadgeView[]): BadgeView | null {
  const open = views.filter((v) => !v.earnedAt && v.current);
  if (!open.length) return null;
  return open.reduce((best, v) => (v.current!.ratio > best.current!.ratio ? v : best));
}
