"use client";

import { Filter, RotateCcw } from "lucide-react";

import {
  DIFFICULTY_FILTERS,
  SORT_OPTIONS,
  STATUS_LABEL,
  type CatalogSort,
  type DifficultyFilter,
  type LearningStatus,
  type StatusFilter,
} from "@/lib/practice/catalogFilters";

const SELECT_CLASS =
  "min-h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 transition focus:border-teal-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden cursor-pointer";

/**
 * Difficulty chips, sort, learning status and reset, shared by the
 * Listening, Reading, Speaking and Writing catalogs.
 */
export function PracticeCatalogFilters({
  difficulty,
  onDifficultyChange,
  sort,
  onSortChange,
  status,
  onStatusChange,
  statusOptions,
  onReset,
  resultCount,
  itemNoun,
}: {
  difficulty: DifficultyFilter;
  onDifficultyChange: (value: DifficultyFilter) => void;
  sort: CatalogSort;
  onSortChange: (value: CatalogSort) => void;
  status: StatusFilter;
  onStatusChange: (value: StatusFilter) => void;
  /** States this skill persists; the status filter is hidden when empty. */
  statusOptions: LearningStatus[];
  onReset: () => void;
  /** Items left after every filter, over the whole catalog. */
  resultCount: number;
  /** "bài nghe", "bộ luyện nói"… */
  itemNoun: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-3">
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Lọc theo độ khó">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1">
          Độ khó:
        </span>
        {DIFFICULTY_FILTERS.map((option) => {
          const isActive = difficulty === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onDifficultyChange(option.id)}
              className={`min-h-9 rounded-lg px-3 py-1.5 text-xs transition cursor-pointer ${
                isActive
                  ? "bg-teal-600 text-white font-semibold shadow-sm border border-teal-600"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 border border-slate-200 dark:border-slate-700 font-medium"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className="text-xs font-medium text-slate-600 dark:text-slate-400 mr-1"
          aria-live="polite"
          data-testid="catalog-result-count"
        >
          <span className="font-bold text-slate-900 dark:text-slate-100">{resultCount}</span>{" "}
          {itemNoun}
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400">
          <Filter size={13} aria-hidden="true" />
          Bộ lọc:
        </span>

        <select
          aria-label="Sắp xếp theo độ khó"
          value={sort}
          onChange={(e) => onSortChange(e.target.value as CatalogSort)}
          className={SELECT_CLASS}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              Sắp xếp: {option.label}
            </option>
          ))}
        </select>

        {statusOptions.length > 0 && (
          <select
            aria-label="Lọc theo trạng thái học"
            value={status}
            onChange={(e) => onStatusChange(e.target.value as StatusFilter)}
            className={SELECT_CLASS}
          >
            <option value="ALL">Tất cả trạng thái</option>
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {STATUS_LABEL[option]}
              </option>
            ))}
          </select>
        )}

        <button
          type="button"
          onClick={onReset}
          aria-label="Đặt lại tất cả bộ lọc về mặc định"
          className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 transition hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
        >
          <RotateCcw size={12} aria-hidden="true" />
          Đặt lại
        </button>
      </div>
    </div>
  );
}
