"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Bookmark,
  BookOpen,
  Library,
  RotateCcw,
} from "lucide-react";
import { vocabService } from "@/lib/api/services/vocab.service";
import { FlashcardDeckCard } from "../components/FlashcardDeckCard";
import { FlashcardStudySummary } from "../components/FlashcardStudySummary";
import { FlashcardFilterBar } from "../components/FlashcardFilterBar";
import {
  computeFlashcardSummary,
  extractUniqueCategories,
  filterAndSortTopics,
  FlashcardSortOption,
  FlashcardStatusFilter,
} from "../flashcardLogic";

// Skeleton card for non-distracting loading state
const DeckCardSkeleton = () => (
  <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 animate-pulse min-h-[230px]">
    <div>
      <div className="flex items-center justify-between gap-2">
        <div className="h-4 w-24 rounded-md bg-slate-200 dark:bg-slate-800" />
        <div className="h-5 w-16 rounded-full bg-slate-200 dark:bg-slate-800" />
      </div>
      <div className="mt-3 h-5 w-3/4 rounded-md bg-slate-200 dark:bg-slate-800" />
      <div className="mt-2 h-4 w-1/2 rounded-md bg-slate-100 dark:bg-slate-800" />
    </div>
    <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800">
      <div className="mb-2 flex justify-between">
        <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-3 w-12 rounded bg-slate-200 dark:bg-slate-800" />
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800" />
      <div className="mt-4 h-10 w-full rounded-xl bg-slate-200 dark:bg-slate-800" />
    </div>
  </div>
);

export const FlashcardScreen: React.FC = () => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["vocab-topics"],
    queryFn: vocabService.getTopics,
  });

  const topics = useMemo(() => data?.topics ?? [], [data]);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<FlashcardStatusFilter>("ALL");
  const [sortOption, setSortOption] = useState<FlashcardSortOption>("DEFAULT");

  // Summary metrics computed strictly from authoritative data
  const summaryMetrics = useMemo(() => computeFlashcardSummary(topics), [topics]);

  // Unique categories derived dynamically from actual dataset
  const uniqueCategories = useMemo(() => extractUniqueCategories(topics), [topics]);

  // Filtered and sorted topics
  const displayedTopics = useMemo(() => {
    return filterAndSortTopics(topics, {
      searchQuery,
      selectedCategory,
      statusFilter,
      sortOption,
    });
  }, [topics, searchQuery, selectedCategory, statusFilter, sortOption]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedCategory !== "ALL" ||
    statusFilter !== "ALL" ||
    sortOption !== "DEFAULT";

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("ALL");
    setStatusFilter("ALL");
    setSortOption("DEFAULT");
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* ── Page Header: Compact, study-focused, no oversized hero ── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-6 dark:border-slate-800">
        <div className="flex items-start gap-3">
          <span
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-amber-950 dark:bg-amber-500 dark:text-slate-950 shadow-xs"
            aria-hidden="true"
          >
            <BookOpen size={22} />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
              Flashcard & từ vựng
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">
              Học từ mới, ôn đúng lúc và theo dõi tiến độ từng bộ từ.
            </p>
          </div>
        </div>

        {/* Saved words secondary action */}
        <div className="flex shrink-0 items-center">
          <Link
            href="/vocabulary/saved"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-xs transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Bookmark size={16} className="text-amber-500 dark:text-amber-400" aria-hidden="true" />
            <span>Từ đã lưu</span>
          </Link>
        </div>
      </header>

      {/* ── Study Summary Strip (authoritative counts only) ────────── */}
      {!isLoading && !isError && topics.length > 0 && (
        <FlashcardStudySummary metrics={summaryMetrics} />
      )}

      {/* ── Search, Filters, and Sorting Controls ─────────────────── */}
      {!isLoading && !isError && topics.length > 0 && (
        <FlashcardFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          categories={uniqueCategories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          sortOption={sortOption}
          onSortOptionChange={setSortOption}
          onResetFilters={handleResetFilters}
          hasActiveFilters={hasActiveFilters}
          totalFiltered={displayedTopics.length}
        />
      )}

      {/* ── Main Catalog Grid ───────────────────────────────────────── */}
      {isLoading ? (
        <div
          className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          aria-busy="true"
          aria-label="Đang tải các bộ từ vựng"
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <DeckCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
        >
          <AlertCircle className="mx-auto size-9 text-rose-500" aria-hidden="true" />
          <p className="mt-3 font-bold">Không thể tải danh sách bộ từ vựng.</p>
          <p className="mt-1 text-sm text-rose-600 dark:text-rose-300">
            Vui lòng kiểm tra lại kết nối mạng hoặc thử lại.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-rose-700"
          >
            <RotateCcw size={14} />
            <span>Thử lại</span>
          </button>
        </div>
      ) : topics.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <Library className="mx-auto size-9 text-slate-400 dark:text-slate-500" aria-hidden="true" />
          <p className="mt-3 font-bold text-slate-700 dark:text-slate-300">
            Chưa có bộ từ vựng nào
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Nội dung sẽ xuất hiện khi quản trị viên thêm bộ từ vào hệ thống.
          </p>
        </div>
      ) : displayedTopics.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <Library className="mx-auto size-9 text-slate-400 dark:text-slate-500" aria-hidden="true" />
          <p className="mt-3 font-bold text-slate-800 dark:text-slate-200">
            Không tìm thấy bộ từ phù hợp
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh lại bộ lọc trạng thái.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:border-amber-500 hover:text-amber-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-amber-400 transition-colors"
          >
            <RotateCcw size={14} />
            <span>Xóa toàn bộ lọc</span>
          </button>
        </div>
      ) : (
        <section
          className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          aria-label="Danh sách bộ từ vựng"
        >
          {displayedTopics.map((topic) => (
            <FlashcardDeckCard key={topic.id} topic={topic} />
          ))}
        </section>
      )}
    </div>
  );
};
