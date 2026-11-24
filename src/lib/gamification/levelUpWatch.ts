/**
 * Lên cấp (owner 2026-11-24): a toast when the learner's XP level or their
 * thú ảo goes up a level. The levels already announced are kept per user in
 * localStorage, so a level is announced once, in one tab, even when it was
 * reached while the page was closed. The first time a user is seen, the
 * current levels are only recorded: nothing old is announced. No React.
 */

export type LevelSeen = {
  xp?: number;
  /** Per pet (its name), since each species keeps its own level. */
  pet?: Record<string, number>;
};

export type LevelNow = {
  xp?: number | null;
  pet?: { key: string; level: number } | null;
};

export type LevelUps = {
  /** The XP level to announce, or null. */
  xp: number | null;
  /** The pet level to announce, or null. */
  pet: number | null;
  seen: LevelSeen;
  /** Whether `seen` differs from what was stored. */
  changed: boolean;
};

const validLevel = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 1;

/** Notification types written for a level-up (backend level-up.logic.ts). */
export function isLevelUpNotice(type: string | null | undefined): boolean {
  const value = String(type ?? "");
  return value.startsWith("level_up:") || value.startsWith("pet_level_up:");
}

/** The key a pet's level is kept under: its species name. */
export function petLevelKey(name: string | null | undefined): string {
  return String(name ?? "").trim().toLowerCase() || "pet";
}

export function levelUpsToCelebrate(seen: LevelSeen | null, now: LevelNow): LevelUps {
  const next: LevelSeen = { ...(seen ?? {}), pet: { ...(seen?.pet ?? {}) } };
  let changed = false;
  let xp: number | null = null;
  let pet: number | null = null;

  if (validLevel(now.xp)) {
    const before = seen?.xp;
    if (validLevel(before) && now.xp > before) xp = now.xp;
    if (before !== now.xp) {
      next.xp = now.xp;
      changed = true;
    }
  }

  if (now.pet && validLevel(now.pet.level)) {
    const before = seen?.pet?.[now.pet.key];
    if (validLevel(before) && now.pet.level > before) pet = now.pet.level;
    if (before !== now.pet.level) {
      next.pet = { ...next.pet, [now.pet.key]: now.pet.level };
      changed = true;
    }
  }

  return { xp, pet, seen: next, changed };
}

type LevelStorage = Pick<Storage, "getItem" | "setItem">;

export function levelSeenKey(userId: number): string {
  return `breadtrans_level_seen:${userId}`;
}

/** What was announced before; null when nothing (or nothing readable) is stored. */
export function readLevelSeen(storage: LevelStorage | null, userId: number): LevelSeen | null {
  try {
    const raw = storage?.getItem(levelSeenKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const { xp, pet } = parsed as Record<string, unknown>;
    const seen: LevelSeen = {};
    if (validLevel(xp)) seen.xp = xp;
    if (pet && typeof pet === "object") {
      seen.pet = {};
      for (const [key, level] of Object.entries(pet as Record<string, unknown>)) {
        if (validLevel(level)) seen.pet[key] = level;
      }
    }
    return seen;
  } catch {
    return null;
  }
}

export function writeLevelSeen(storage: LevelStorage | null, userId: number, seen: LevelSeen): void {
  try {
    storage?.setItem(levelSeenKey(userId), JSON.stringify(seen));
  } catch {
    // Storage can be blocked or full; at worst a level is announced again.
  }
}
