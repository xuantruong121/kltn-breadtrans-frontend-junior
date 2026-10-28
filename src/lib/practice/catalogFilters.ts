/**
 * Shared difficulty, status and sort rules for the four skill catalogs
 * (Listening, Reading, Speaking, Writing). The level comes from the API's
 * `cefrLevel` ("B1", "B2-C1"), the same authored tag the server uses to decide
 * the required plan, so a card's label, the filter and the lock agree.
 *
 * Bands: A1–A2 Cơ bản, B1–B2 Trung cấp, C1–C2 Nâng cao. A range is shown in
 * the band of its highest level (B2–C1 → Nâng cao), so content that reaches
 * B1 is never presented as Cơ bản.
 */
export const CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type LevelBand = "BASIC" | "INTERMEDIATE" | "ADVANCED";
export type DifficultyFilter = "ALL" | LevelBand;
export type CatalogSort = "EASY_TO_HARD" | "HARD_TO_EASY";
export type LearningStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
export type StatusFilter = "ALL" | LearningStatus;

export const DEFAULT_CATALOG_SORT: CatalogSort = "EASY_TO_HARD";

export const BAND_LABEL: Record<LevelBand, string> = {
  BASIC: "Cơ bản",
  INTERMEDIATE: "Trung cấp",
  ADVANCED: "Nâng cao",
};

export const DIFFICULTY_FILTERS: Array<{ id: DifficultyFilter; label: string }> = [
  { id: "ALL", label: "Tất cả" },
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

const TAG = /\b([ABC][12])(?:\s*[–-]\s*([ABC][12]))?\b/;

export type CefrRange = { min: number; max: number };

/** "B1" → {2,2}; "B2-C1" / "B2–C1" → {3,4}; anything else → null. */
export function parseCefrLevel(value?: string | null): CefrRange | null {
  if (!value) return null;
  // A title carries its tag before " — "; a level field is the whole value.
  const match = TAG.exec(value.split(" — ")[0].toUpperCase());
  if (!match) return null;
  const a = CEFR_ORDER.indexOf(match[1] as (typeof CEFR_ORDER)[number]);
  const b = CEFR_ORDER.indexOf((match[2] ?? match[1]) as (typeof CEFR_ORDER)[number]);
  return { min: Math.min(a, b), max: Math.max(a, b) };
}

export function levelBand(range: CefrRange): LevelBand {
  if (range.max <= 1) return "BASIC";
  if (range.max <= 3) return "INTERMEDIATE";
  return "ADVANCED";
}

/** "Trung cấp · B1", "Nâng cao · B2–C1"; null when the level is unknown. */
export function catalogLevelLabel(value?: string | null): string | null {
  const range = parseCefrLevel(value);
  if (!range) return null;
  const span =
    range.min === range.max
      ? CEFR_ORDER[range.min]
      : `${CEFR_ORDER[range.min]}–${CEFR_ORDER[range.max]}`;
  return `${BAND_LABEL[levelBand(range)]} · ${span}`;
}

export function catalogLevelBand(value?: string | null): LevelBand | null {
  const range = parseCefrLevel(value);
  return range ? levelBand(range) : null;
}

/** An item without a known level only shows under "Tất cả". */
export function matchesDifficultyFilter(
  value: string | null | undefined,
  filter: DifficultyFilter,
): boolean {
  if (filter === "ALL") return true;
  return catalogLevelBand(value) === filter;
}

export function matchesStatusFilter(
  status: LearningStatus,
  filter: StatusFilter,
): boolean {
  return filter === "ALL" || status === filter;
}

/**
 * Whole-catalog level order (A1 → C2, or reversed), stable: items at the same
 * level keep the order the API returned. Unknown levels go last either way.
 */
export function sortByLevel<T>(
  items: readonly T[],
  sort: CatalogSort,
  levelOf: (item: T) => string | null | undefined,
): T[] {
  const dir = sort === "HARD_TO_EASY" ? -1 : 1;
  return items
    .map((item, index) => ({ item, index, range: parseCefrLevel(levelOf(item)) }))
    .sort((a, b) => {
      if (!a.range || !b.range) {
        if (a.range || b.range) return a.range ? -1 : 1;
        return a.index - b.index;
      }
      return (
        dir * (a.range.min - b.range.min) ||
        dir * (a.range.max - b.range.max) ||
        a.index - b.index
      );
    })
    .map((entry) => entry.item);
}

/** Reads a sort from a URL value, defaulting to Dễ → Khó. */
export function parseCatalogSort(value?: string | null): CatalogSort {
  return value === "HARD_TO_EASY" ? "HARD_TO_EASY" : DEFAULT_CATALOG_SORT;
}
