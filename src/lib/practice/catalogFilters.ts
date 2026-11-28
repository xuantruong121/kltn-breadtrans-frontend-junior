/**
 * Shared difficulty, status and sort rules for the four skill catalogs
 * (Listening, Reading, Speaking, Writing). Every item carries the API's
 * `practiceLevel` (owner 2026-11-27: Mất gốc, Cơ bản, Trung cấp, Nâng cao),
 * the level the server stores and decides the plan and the lock from, so a
 * card's label, the filter, the order and the lock agree.
 */
import type { PracticeLevel } from "../learning-path/practiceLevel.ts";

export type DifficultyFilter = "ALL" | PracticeLevel;
export type CatalogSort = "EASY_TO_HARD" | "HARD_TO_EASY";
export type LearningStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
export type StatusFilter = "ALL" | LearningStatus;

export const DEFAULT_CATALOG_SORT: CatalogSort = "EASY_TO_HARD";

/**
 * A filter chosen in a link (the dashboard's "Bắt đầu" rows send
 * `?difficulty=`, `?mode=` or `?paper=`). Anything not in `allowed` keeps the
 * catalog unfiltered rather than showing an empty list.
 */
export function filterFromParam<T extends string>(
  value: string | null | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  const wanted = (value ?? "").trim().toUpperCase();
  return (allowed as readonly string[]).includes(wanted) ? (wanted as T) : fallback;
}

export const DIFFICULTY_PARAMS = ["STARTER", "BASIC", "INTERMEDIATE", "ADVANCED"] as const;

export const BAND_LABEL: Record<PracticeLevel, string> = {
  STARTER: "Mất gốc",
  BASIC: "Cơ bản",
  INTERMEDIATE: "Trung cấp",
  ADVANCED: "Nâng cao",
};

export const DIFFICULTY_FILTERS: Array<{ id: DifficultyFilter; label: string }> = [
  { id: "ALL", label: "Tất cả" },
  { id: "STARTER", label: "Mất gốc" },
  { id: "BASIC", label: "Cơ bản" },
  { id: "INTERMEDIATE", label: "Trung cấp" },
  { id: "ADVANCED", label: "Nâng cao" },
];

export const SORT_OPTIONS: Array<{ id: CatalogSort; label: string }> = [
  { id: "EASY_TO_HARD", label: "Dễ → Khó" },
  { id: "HARD_TO_EASY", label: "Khó → Dễ" },
];

export const STATUS_LABEL: Record<LearningStatus, string> = {
  NOT_STARTED: "Chưa học",
  IN_PROGRESS: "Đang học",
  COMPLETED: "Đã hoàn thành",
};

const LEVEL_ORDER: readonly string[] = DIFFICULTY_PARAMS;

/** The practice level a value names, or null ("B1" and other old codes are not levels). */
function practiceLevelOf(value?: string | null): PracticeLevel | null {
  const level = (value ?? "").trim().toUpperCase();
  return LEVEL_ORDER.includes(level) ? (level as PracticeLevel) : null;
}

/** "Mất gốc", "Trung cấp"; null when the item has no practice level. */
export function catalogLevelLabel(level?: string | null): string | null {
  const known = practiceLevelOf(level);
  return known ? BAND_LABEL[known] : null;
}

/** An item without a practice level only shows under "Tất cả". */
export function matchesDifficultyFilter(
  level: string | null | undefined,
  filter: DifficultyFilter,
): boolean {
  if (filter === "ALL") return true;
  return practiceLevelOf(level) === filter;
}

export function matchesStatusFilter(
  status: LearningStatus,
  filter: StatusFilter,
): boolean {
  return filter === "ALL" || status === filter;
}

/**
 * Whole-catalog level order (Mất gốc → Nâng cao, or reversed), stable: items
 * at the same level keep the order the API returned. Items without a level go
 * last either way.
 */
export function sortByLevel<T>(
  items: readonly T[],
  sort: CatalogSort,
  levelOf: (item: T) => string | null | undefined,
): T[] {
  const dir = sort === "HARD_TO_EASY" ? -1 : 1;
  return items
    .map((item, index) => {
      const level = practiceLevelOf(levelOf(item));
      return { item, index, rank: level ? LEVEL_ORDER.indexOf(level) : null };
    })
    .sort((a, b) => {
      if (a.rank === null || b.rank === null) {
        if (a.rank !== null || b.rank !== null) return a.rank !== null ? -1 : 1;
        return a.index - b.index;
      }
      return dir * (a.rank - b.rank) || a.index - b.index;
    })
    .map((entry) => entry.item);
}

/** Reads a sort from a URL value, defaulting to Dễ → Khó. */
export function parseCatalogSort(value?: string | null): CatalogSort {
  return value === "HARD_TO_EASY" ? "HARD_TO_EASY" : DEFAULT_CATALOG_SORT;
}
