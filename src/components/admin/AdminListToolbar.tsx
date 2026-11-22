"use client";

import { Search } from "lucide-react";

import {
  listUnit,
  toolbarCountText,
  toolbarFilters,
  type AdminContentList,
  type ToolbarSlots,
} from "./adminListToolbarLogic";
import { ADMIN_SELECT } from "./cmsStyles";

/**
 * One search and filter toolbar for the admin content lists (owner
 * 2026-11-21); the six pages built theirs by hand. Row 1: the search box
 * across the width. Row 2: the filters in slot order (Dạng bài, Trạng thái,
 * Trình độ, Lĩnh vực, the page's own, Sắp xếp), then the count and "Xóa bộ
 * lọc" at the right end. The page keeps the state; useAdminList debounces
 * the search and goes back to page 1 when anything here changes.
 */
export function AdminListToolbar({
  content,
  searchLabel,
  search,
  onSearchChange,
  total,
  matched,
  fetching,
  filtersActive,
  onClearFilters,
  ...slots
}: ToolbarSlots & {
  content: AdminContentList;
  /** The search box's name for screen readers: "Tìm bộ luyện nói". */
  searchLabel: string;
  search: string;
  onSearchChange: (value: string) => void;
  /** Items in the whole list; undefined until the first page arrives. */
  total?: number;
  /** Items the search and filters keep. */
  matched: number;
  fetching: boolean;
  /** Shows "Xóa bộ lọc" and turns the count into "Khớp …". */
  filtersActive: boolean;
  onClearFilters: () => void;
}) {
  const count = toolbarCountText({
    total,
    matched,
    unit: listUnit(content),
    filtered: filtersActive,
    fetching,
  });
  return (
    <div className="space-y-3">
      <label className="relative block">
        <span className="sr-only">{searchLabel}</span>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          size={18}
          aria-hidden="true"
        />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Tìm theo tên, mô tả..."
          className="min-h-11 w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
        />
      </label>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        {toolbarFilters(slots, content).map((filter) => (
          <label key={filter.slot} className="flex items-center gap-2 text-sm text-slate-600">
            {filter.label}
            <select
              value={filter.value}
              onChange={(event) => filter.onChange(event.target.value)}
              className={ADMIN_SELECT}
            >
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}
        <div className="ml-auto flex items-center gap-3 text-sm text-slate-600">
          {count && <span className="tabular-nums">{count}</span>}
          {filtersActive && (
            <button
              type="button"
              onClick={onClearFilters}
              className="cursor-pointer rounded-md font-semibold text-slate-900 underline-offset-4 hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
