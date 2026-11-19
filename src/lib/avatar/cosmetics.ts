/**
 * The shop frame and badge a learner wears (owner 2026-11-19). They live on
 * the profile (PATCH /users/cosmetics), so every device and every other
 * learner sees the same; browser storage no longer holds them.
 */
export type Cosmetics = { avatarFrame: string | null; badgeKey: string | null };

const text = (value: unknown) => (typeof value === "string" && value.trim() ? value : null);

/** The worn frame and badge of a profile (the signed-in one or a ranking row). */
export function cosmeticsOf(profile: unknown): Cosmetics {
  const p = (profile ?? {}) as { avatarFrame?: unknown; badgeKey?: unknown };
  return { avatarFrame: text(p.avatarFrame), badgeKey: text(p.badgeKey) };
}
