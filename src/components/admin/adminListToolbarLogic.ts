/**
 * The search and filter toolbar of the six admin content lists: Nghe, Đọc,
 * Viết, Nói, Ngữ pháp and Từ vựng (owner 2026-11-21). Row 2 shows the
 * filters in one fixed order, whatever order a page passes them in. Pure, so
 * the order, the count line and the sort options are unit-tested.
 *
 * Not named adminListToolbar.ts: on Windows that differs from
 * AdminListToolbar.tsx only by case, and "./AdminListToolbar" resolved to it.
 */
import { trackFilterOptions, type NamedTrack } from "../../lib/learning-path/tracks.ts";
import { TRACK_FIELD_COPY, type ListSort } from "./skillCmsStatus.ts";

export type AdminContentList =
  | "listening"
  | "reading"
  | "writing"
  | "speaking"
  | "grammar"
  | "vocab";

export type ToolbarOption = { value: string; label: string };
export type PublicationFilter = "ALL" | "DRAFT" | "PUBLISHED";
export type AdminListSort = ListSort;

/** A filter whose options the toolbar owns: Trạng thái, Sắp xếp. */
type FixedFilter<V extends string> = { value: V; onChange: (value: V) => void };

/** A filter whose options the page supplies; "Tất cả" is put in front. */
export type ToolbarChoice = FixedFilter<string> & { options: ToolbarOption[] };

/**
 * Lĩnh vực: the page passes the admin track list from the API; the toolbar
 * puts "Tất cả" and "Chưa gắn lĩnh vực" in front.
 */
export type TrackFilter = FixedFilter<string> & { tracks: readonly NamedTrack[] };

/** Named slots: the name, not the order of the props, decides the place. */
export type ToolbarSlots = {
  kind?: ToolbarChoice;
  status?: FixedFilter<PublicationFilter>;
  level?: ToolbarChoice;
  track?: TrackFilter;
  /** A filter only this page has: Audio on Nghe, Chuyên mục on Từ vựng. */
  extra?: ToolbarChoice & { label: string };
  sort?: FixedFilter<AdminListSort>;
};

export type ToolbarSlot = keyof ToolbarSlots;

export type ToolbarFilter = {
  slot: ToolbarSlot;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ToolbarOption[];
};

const ALL: ToolbarOption = { value: "ALL", label: "Tất cả" };

export const STATUS_OPTIONS: ToolbarOption[] = [
  ALL,
  { value: "DRAFT", label: "Bản nháp" },
  { value: "PUBLISHED", label: "Đã xuất bản" },
];

/** What "fewest first" counts on each list. */
const FEWEST_LABEL: Record<AdminContentList, string> = {
  listening: "Ít câu hỏi trước",
  reading: "Ít câu hỏi trước",
  writing: "Ít câu hỏi trước",
  grammar: "Ít câu hỏi trước",
  speaking: "Ít câu luyện trước",
  vocab: "Ít từ trước",
};

/** One sort vocabulary on every list: these values go to the API as they are. */
export function sortOptions(
  content: AdminContentList,
): Array<{ value: AdminListSort; label: string }> {
  return [
    { value: "NEWEST", label: "Mới tạo trước" },
    { value: "OLDEST", label: "Cũ trước" },
    { value: "LEVEL", label: "Trình độ thấp → cao" },
    { value: "TITLE", label: "Tên A → Z" },
    { value: "FEWEST", label: FEWEST_LABEL[content] },
  ];
}

const UNIT: Record<AdminContentList, string> = {
  listening: "bài",
  reading: "bài",
  writing: "bài",
  speaking: "bộ",
  vocab: "bộ",
  grammar: "chủ đề",
};

/** What the count line counts: "12 bài", "5 bộ", "8 chủ đề". */
export const listUnit = (content: AdminContentList) => UNIT[content];

/** "Nghe hiểu (4)"; the bare name while the server sends no count. */
export const kindOptionLabel = (label: string, count?: number) =>
  typeof count === "number" ? `${label} (${count})` : label;

/**
 * Row 2's filters, always Dạng bài, Trạng thái, Trình độ, Lĩnh vực, the
 * page's own filter, Sắp xếp. A page leaves out a slot it does not have.
 */
export function toolbarFilters(
  { kind, status, level, track, extra, sort }: ToolbarSlots,
  content: AdminContentList,
): ToolbarFilter[] {
  const filters: Array<ToolbarFilter | null> = [
    kind
      ? { slot: "kind", label: "Dạng bài", value: kind.value, onChange: kind.onChange, options: [ALL, ...kind.options] }
      : null,
    status
      ? {
          slot: "status",
          label: "Trạng thái",
          value: status.value,
          onChange: (value) => status.onChange(value as PublicationFilter),
          options: STATUS_OPTIONS,
        }
      : null,
    level
      ? { slot: "level", label: "Trình độ", value: level.value, onChange: level.onChange, options: [ALL, ...level.options] }
      : null,
    track
      ? {
          slot: "track",
          label: TRACK_FIELD_COPY.label,
          value: track.value,
          onChange: track.onChange,
          options: trackFilterOptions(track.tracks),
        }
      : null,
    extra
      ? { slot: "extra", label: extra.label, value: extra.value, onChange: extra.onChange, options: [ALL, ...extra.options] }
      : null,
    sort
      ? {
          slot: "sort",
          label: "Sắp xếp",
          value: sort.value,
          onChange: (value) => sort.onChange(value as AdminListSort),
          options: sortOptions(content),
        }
      : null,
  ];
  return filters.filter((filter): filter is ToolbarFilter => filter !== null);
}

/**
 * The count at the right end of row 2: "12 bài", or "Khớp 3/12" while a
 * filter is on, plus " · đang tải" while a page loads. Null until the first
 * page arrives, when "0 bài" would be wrong.
 */
export function toolbarCountText({
  total,
  matched,
  unit,
  filtered,
  fetching,
}: {
  /** Items in the whole list. */
  total?: number;
  /** Items the search and filters keep. */
  matched: number;
  unit: string;
  filtered: boolean;
  fetching: boolean;
}): string | null {
  if (total === undefined) return null;
  const count = filtered ? `Khớp ${matched}/${total}` : `${total} ${unit}`;
  return fetching ? `${count} · đang tải` : count;
}
