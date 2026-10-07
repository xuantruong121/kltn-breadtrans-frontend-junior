import React from "react";
import { ArrowUpDown, Filter, RotateCcw, Search, X } from "lucide-react";
import type {
  FlashcardSortOption,
  FlashcardStatusFilter,
} from "../flashcardLogic";

export interface FlashcardFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  statusFilter: FlashcardStatusFilter;
  onStatusFilterChange: (status: FlashcardStatusFilter) => void;
  sortOption: FlashcardSortOption;
  onSortOptionChange: (sort: FlashcardSortOption) => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
  totalFiltered: number;
}

export const FlashcardFilterBar: React.FC<FlashcardFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  categories,
  selectedCategory,
  onCategoryChange,
  statusFilter,
  onStatusFilterChange,
  sortOption,
  onSortOptionChange,
  onResetFilters,
  hasActiveFilters,
  totalFiltered,
}) => {
  return (
    <div
      aria-label="Tìm kiếm và bộ lọc bộ từ vựng"
      className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-4"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Search input */}
        <div className="relative flex-1">
          <label htmlFor="flashcard-search" className="sr-only">
            Tìm bộ từ vựng
          </label>
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-slate-500">
            <Search size={18} aria-hidden="true" />
          </div>
          <input
            id="flashcard-search"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm bộ từ vựng hoặc chủ đề..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-9 text-sm font-medium text-slate-800 placeholder-slate-400 transition-colors focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-amber-400 dark:focus:bg-slate-900"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Xóa nội dung tìm kiếm"
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filter controls row */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Category Filter */}
          <div className="relative flex-1 sm:flex-initial sm:min-w-[160px]">
            <label htmlFor="flashcard-category-filter" className="sr-only">
              Lọc theo danh mục
            </label>
            <select
              id="flashcard-category-filter"
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-3.5 pr-8 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus:border-amber-400 dark:focus:bg-slate-900"
            >
              <option value="ALL">Tất cả danh mục</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 dark:text-slate-500">
              <Filter size={14} aria-hidden="true" />
            </div>
          </div>

          {/* Status Filter */}
          <div className="relative flex-1 sm:flex-initial sm:min-w-[140px]">
            <label htmlFor="flashcard-status-filter" className="sr-only">
              Lọc theo trạng thái
            </label>
            <select
              id="flashcard-status-filter"
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value as FlashcardStatusFilter)}
              className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-3.5 pr-8 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus:border-amber-400 dark:focus:bg-slate-900"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="REVIEW_DUE">Cần ôn tập</option>
              <option value="IN_PROGRESS">Đang học</option>
              <option value="NEW">Chưa học</option>
              <option value="COMPLETED">Đã thuộc</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 dark:text-slate-500">
              <Filter size={14} aria-hidden="true" />
            </div>
          </div>

          {/* Sort Option */}
          <div className="relative flex-1 sm:flex-initial sm:min-w-[160px]">
            <label htmlFor="flashcard-sort-option" className="sr-only">
              Sắp xếp bộ từ
            </label>
            <select
              id="flashcard-sort-option"
              value={sortOption}
              onChange={(e) => onSortOptionChange(e.target.value as FlashcardSortOption)}
              className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-3.5 pr-8 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus:border-amber-400 dark:focus:bg-slate-900"
            >
              <option value="DEFAULT">Mặc định (Cần ôn trước)</option>
              <option value="REVIEW_FIRST">Số từ cần ôn nhiều nhất</option>
              <option value="PROGRESS">Tiến độ đã thuộc cao nhất</option>
              <option value="NAME_AZ">Tên A – Z</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 dark:text-slate-500">
              <ArrowUpDown size={14} aria-hidden="true" />
            </div>
          </div>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-amber-400 hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
            >
              <RotateCcw size={13} aria-hidden="true" />
              <span>Đặt lại</span>
            </button>
          )}
        </div>
      </div>

      {/* Active filter count indicator */}
      {hasActiveFilters && (
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Hiển thị <span className="font-bold text-slate-800 dark:text-slate-200">{totalFiltered}</span> bộ từ phù hợp
        </div>
      )}
    </div>
  );
};
