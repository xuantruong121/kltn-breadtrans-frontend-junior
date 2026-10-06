"use client";

import { useState, useMemo, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  Coins,
  Filter,
  Flame,
  Loader2,
  RotateCcw,
  Search,
  Target,
  X,
} from "lucide-react";
import { readingService } from "@/lib/api/services/reading.service";
import { grammarService, type GrammarTopicSummary } from "@/lib/api/services/grammar.service";
import { useAuthStore } from "@/stores/authStore";
import { useGamificationStore } from "@/stores/gamificationStore";
import { AuthGateModal } from "@/components/auth/AuthGateModal";
import { PremiumContentPaywallModal } from "@/components/subscription/PremiumContentPaywallModal";
import { ReadingTopicCard, type ReadingTopicItem } from "./components/ReadingTopicCard";
import { GrammarTopicCard } from "./components/GrammarTopicCard";
import {
  type DifficultyLevel,
  type ExerciseCategory,
  matchesReadingDifficulty,
} from "./components/readingCardLogic";
import { GrammarScreen } from "@/modules/grammar/screens/GrammarScreen";

const CATEGORY_OPTIONS: Array<{ id: ExerciseCategory; label: string }> = [
  { id: "ALL", label: "Tất cả" },
  { id: "READING", label: "Đọc hiểu" },
  { id: "GRAMMAR", label: "Ngữ pháp" },
];

const DIFFICULTY_OPTIONS: Array<{ id: DifficultyLevel; label: string }> = [
  { id: "ALL", label: "Tất cả" },
  { id: "BASIC", label: "Cơ bản" },
  { id: "INTERMEDIATE", label: "Trung cấp" },
  { id: "ADVANCED", label: "Nâng cao" },
];

type UnifiedExerciseItem =
  | { type: "READING"; data: ReadingTopicItem }
  | { type: "GRAMMAR"; data: GrammarTopicSummary };

function ReadingTopicsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Backward compatibility: ?category=grammar | ?tab=grammar | ?mode=grammar
  const rawCategoryParam = (
    searchParams.get("category") ||
    searchParams.get("tab") ||
    searchParams.get("mode") ||
    ""
  ).toLowerCase();

  const initialCategory: ExerciseCategory =
    rawCategoryParam === "grammar"
      ? "GRAMMAR"
      : rawCategoryParam === "reading"
        ? "READING"
        : "ALL";

  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory>(initialCategory);
  const [activeGrammarTopicId, setActiveGrammarTopicId] = useState<number | null>(null);

  const { user } = useAuthStore();
  const { streak } = useGamificationStore();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>("ALL");
  const [sortOrder, setSortOrder] = useState<string>("DEFAULT");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [authGate, setAuthGate] = useState<{
    open: boolean;
    topicId?: number;
    topicName?: string;
  }>({ open: false });
  const [paywallTopic, setPaywallTopic] = useState<ReadingTopicItem | null>(null);

  // Sync category param with URL without causing page reload
  const handleCategoryChange = (category: ExerciseCategory) => {
    setSelectedCategory(category);
    const params = new URLSearchParams(window.location.search);
    params.delete("tab");
    params.delete("mode");
    if (category === "ALL") {
      params.delete("category");
    } else {
      params.set("category", category.toLowerCase());
    }
    const queryString = params.toString();
    const newPath = queryString ? `/practice/reading?${queryString}` : "/practice/reading";
    router.replace(newPath, { scroll: false });
  };

  // Keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch Reading Topics
  const { data: readingTopicsData, isLoading: isLoadingReading } = useQuery({
    queryKey: ["reading-topics"],
    queryFn: readingService.getTopics,
  });

  // Fetch Grammar Topics
  const { data: grammarTopicsData, isLoading: isLoadingGrammar } = useQuery({
    queryKey: ["grammar-topics"],
    queryFn: grammarService.getTopics,
  });

  const isLoading = isLoadingReading || isLoadingGrammar;

  const readingTopics: ReadingTopicItem[] = useMemo(() => {
    return Array.isArray(readingTopicsData) ? (readingTopicsData as ReadingTopicItem[]) : [];
  }, [readingTopicsData]);

  const grammarTopics: GrammarTopicSummary[] = useMemo(() => {
    return Array.isArray(grammarTopicsData) ? (grammarTopicsData as GrammarTopicSummary[]) : [];
  }, [grammarTopicsData]);

  // Reading-specific progress metrics (honest, un-faked)
  const completedReadingCount = useMemo(() => {
    return readingTopics.filter(
      (t) => (t.completedArticles || 0) >= (t.totalArticles || 0) && (t.totalArticles || 0) > 0,
    ).length;
  }, [readingTopics]);

  const readingCompletionPct = Math.round(
    (completedReadingCount / Math.max(1, readingTopics.length)) * 100,
  );

  // Unified Filtering and Sorting
  const filteredAndSortedItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const results: UnifiedExerciseItem[] = [];

    // 1. Reading Topics
    if (selectedCategory === "ALL" || selectedCategory === "READING") {
      readingTopics.forEach((t) => {
        const name = (t.name || t.title || "").toLowerCase();
        const viName = (t.vietnameseName || t.description || "").toLowerCase();
        const matchSearch = !q || name.includes(q) || viName.includes(q);

        const total = t.totalArticles || 0;
        const completed = t.completedArticles || 0;
        const isDone = completed >= total && total > 0;
        const isInProg = completed > 0 && completed < total;

        const matchDifficulty = matchesReadingDifficulty(t, selectedDifficulty);

        const matchStatus =
          selectedStatus === "ALL" ||
          (selectedStatus === "COMPLETED" && isDone) ||
          (selectedStatus === "IN_PROGRESS" && isInProg) ||
          (selectedStatus === "UNCOMPLETED" && !isDone && !isInProg);

        if (matchSearch && matchDifficulty && matchStatus) {
          results.push({ type: "READING", data: t });
        }
      });
    }

    // 2. Grammar Topics
    if (selectedCategory === "ALL" || selectedCategory === "GRAMMAR") {
      grammarTopics.forEach((g) => {
        const title = (g.title || "").toLowerCase();
        const desc = (g.description || "").toLowerCase();
        const formula = (g.keyFormula || "").toLowerCase();
        const matchSearch = !q || title.includes(q) || desc.includes(q) || formula.includes(q);

        const isDone = Boolean(g.isCompleted);
        const isInProg = !isDone && (g.attemptCount || 0) > 0;

        const matchDifficulty = matchesReadingDifficulty(g, selectedDifficulty);

        const matchStatus =
          selectedStatus === "ALL" ||
          (selectedStatus === "COMPLETED" && isDone) ||
          (selectedStatus === "IN_PROGRESS" && isInProg) ||
          (selectedStatus === "UNCOMPLETED" && !isDone && !isInProg);

        if (matchSearch && matchDifficulty && matchStatus) {
          results.push({ type: "GRAMMAR", data: g });
        }
      });
    }

    // Sorting
    const sorted = results.sort((a, b) => {
      if (sortOrder === "NAME_ASC") {
        const nameA = a.type === "READING" ? (a.data.name || a.data.title || "") : a.data.title;
        const nameB = b.type === "READING" ? (b.data.name || b.data.title || "") : b.data.title;
        return nameA.localeCompare(nameB);
      }
      if (sortOrder === "PROGRESS_DESC") {
        const pctA =
          a.type === "READING"
            ? (a.data.totalArticles || 0) > 0
              ? (a.data.completedArticles || 0) / (a.data.totalArticles || 1)
              : 0
            : a.data.isCompleted
              ? 1
              : 0;
        const pctB =
          b.type === "READING"
            ? (b.data.totalArticles || 0) > 0
              ? (b.data.completedArticles || 0) / (b.data.totalArticles || 1)
              : 0
            : b.data.isCompleted
              ? 1
              : 0;
        return pctB - pctA;
      }
      // DEFAULT order: Reading topics first (by order/id), then Grammar topics (by id)
      if (a.type !== b.type) {
        return a.type === "READING" ? -1 : 1;
      }
      return (a.data.id || 0) - (b.data.id || 0);
    });

    // Assign spotlight to first uncompleted reading item
    let spotlightAssigned = false;
    return sorted.map((item) => {
      if (item.type === "READING") {
        const isDone =
          (item.data.completedArticles || 0) >= (item.data.totalArticles || 0) &&
          (item.data.totalArticles || 0) > 0;
        if (!isDone && !spotlightAssigned) {
          spotlightAssigned = true;
          return { ...item, data: { ...item.data, isSpotlight: true } };
        }
      }
      return item;
    });
  }, [readingTopics, grammarTopics, selectedCategory, searchTerm, selectedDifficulty, selectedStatus, sortOrder]);

  const handleStartReadingTopic = (topic: ReadingTopicItem) => {
    if (!user) {
      setAuthGate({
        open: true,
        topicId: topic.id,
        topicName: topic.name || topic.title,
      });
      return;
    }
    router.push(`/practice/reading/${topic.id}`);
  };

  const handleStartGrammarTopic = (topic: GrammarTopicSummary) => {
    if (!user) {
      setAuthGate({
        open: true,
        topicName: topic.title,
      });
      return;
    }
    setActiveGrammarTopicId(topic.id);
  };

  // If active Grammar exercise workspace is open, render GrammarScreen in Focus Mode
  if (activeGrammarTopicId !== null) {
    return (
      <GrammarScreen
        activeTopicId={activeGrammarTopicId}
        onExit={() => setActiveGrammarTopicId(null)}
      />
    );
  }

  return (
    <div className="space-y-6 pb-20 pt-2">
      {/* Hero & Learning Progression Bar */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 dark:border-violet-800/60 bg-violet-50/80 dark:bg-violet-950/40 px-3 py-1 text-xs font-bold text-violet-700 dark:text-violet-300">
              <BookOpen size={14} aria-hidden="true" />
              <span>Trung Tâm Luyện Đọc & Ngữ Pháp Song Ngữ Thông Minh</span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
              Rèn luyện Đọc hiểu & Ngữ pháp, Kỹ thuật Skim & Scan
            </h1>

            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 sm:text-sm">
              Phát triển vốn từ vựng học thuật, củng cố quy tắc ngữ pháp cốt lõi và rèn luyện kỹ năng đối chiếu dữ liệu văn bản theo chuẩn bài thi TOEIC & tài liệu thương mại.
            </p>

            {/* Gamified Stats Pill Row */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 text-xs font-black text-amber-800 dark:text-amber-300">
                <Flame size={14} className="text-amber-500 fill-amber-500" aria-hidden="true" />
                <span>Chuỗi học: {streak || 1} ngày liên tiếp</span>
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/40 px-3 py-1.5 text-xs font-black text-blue-800 dark:text-blue-300">
                <Target size={14} className="text-blue-600 dark:text-blue-400" aria-hidden="true" />
                <span>Mục tiêu đọc hiểu: {Math.min(completedReadingCount, 3)}/3 bài</span>
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 dark:border-violet-800/60 bg-violet-50 dark:bg-violet-950/40 px-3 py-1.5 text-xs font-black text-violet-800 dark:text-violet-300">
                <Coins size={14} className="text-violet-600 dark:text-violet-400" aria-hidden="true" />
                <span>Thưởng: +5 đến +10 Bánh Mì / bài</span>
              </div>
            </div>
          </div>

          {/* Reading Comprehension Progress Card */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-5 shadow-2xs lg:w-80 shrink-0 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tiến độ Đọc hiểu
              </span>
              <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-xs font-black text-emerald-700 dark:text-emerald-300">
                {readingCompletionPct}%
              </span>
            </div>

            <div>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-xl font-black text-slate-900 dark:text-slate-100">
                  {completedReadingCount}/{readingTopics.length}
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  chủ đề hoàn thành
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${readingCompletionPct}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200/80 dark:border-slate-700/80 pt-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <span>Đọc hiểu: {readingTopics.length} · Ngữ pháp: {grammarTopics.length}</span>
              <Link
                href="/practice/writing"
                className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 dark:text-violet-300 hover:text-violet-800 dark:hover:text-violet-200 bg-violet-50 dark:bg-violet-950/60 hover:bg-violet-100 dark:hover:bg-violet-900/60 border border-violet-200/60 dark:border-violet-800/60 px-2.5 py-1 rounded-md transition-colors duration-150"
              >
                Luyện viết
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Unified Modern Filter Dock */}
      <section className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs sm:p-5 space-y-4">
        {/* Row 1: Search Input (Ctrl+K) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 lg:max-w-md">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400"
              aria-hidden="true"
            />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Tìm kiếm chủ đề đọc hiểu, ngữ pháp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-slate-300/80 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800/90 pl-10.5 pr-20 text-sm font-medium text-slate-900 dark:text-slate-100 transition-all duration-150 placeholder:text-slate-500 dark:placeholder:text-slate-400 placeholder:font-normal focus:border-violet-600 dark:focus:border-violet-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-violet-500/20 focus:outline-hidden shadow-2xs"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {searchTerm ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    searchInputRef.current?.focus();
                  }}
                  aria-label="Xóa từ khóa tìm kiếm"
                  className="flex size-6 items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X size={13} aria-hidden="true" />
                </button>
              ) : (
                <kbd className="hidden sm:inline-block rounded-md border border-slate-300/80 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-0.5 text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400 shadow-2xs">
                  ⌘K
                </kbd>
              )}
            </div>
          </div>

          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Hiển thị <span className="font-bold text-slate-900 dark:text-slate-100">{filteredAndSortedItems.length}</span> bài luyện tập
          </div>
        </div>

        {/* Row 2: Category Chips, Difficulty Chips, Status & Sort */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-3">
          <div className="flex flex-wrap items-center gap-4">
            {/* Category Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1">
                Phân loại:
              </span>
              {CATEGORY_OPTIONS.map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => handleCategoryChange(cat.id)}
                    className={`min-h-9 rounded-lg px-3 py-1.5 text-xs transition cursor-pointer ${
                      isActive
                        ? "bg-amber-600 text-white font-semibold shadow-sm border border-amber-600"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 border border-slate-200 dark:border-slate-700 font-medium"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Difficulty Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1">
                Độ khó:
              </span>
              {DIFFICULTY_OPTIONS.map((lvl) => {
                const isActive = selectedDifficulty === lvl.id;
                return (
                  <button
                    key={lvl.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setSelectedDifficulty(lvl.id)}
                    className={`min-h-9 rounded-lg px-3 py-1.5 text-xs transition cursor-pointer ${
                      isActive
                        ? "bg-violet-600 text-white font-semibold shadow-sm border border-violet-600"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 border border-slate-200 dark:border-slate-700 font-medium"
                    }`}
                  >
                    {lvl.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sort, Status & Reset Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400">
              <Filter size={13} aria-hidden="true" />
              Bộ lọc:
            </span>

            {/* Sắp xếp */}
            <select
              aria-label="Sắp xếp bài luyện đọc và ngữ pháp"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="min-h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 transition focus:border-violet-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden cursor-pointer"
            >
              <option value="DEFAULT">Sắp xếp: Mặc định</option>
              <option value="NAME_ASC">Sắp xếp: Theo tên (A-Z)</option>
              <option value="PROGRESS_DESC">Sắp xếp: Tiến độ cao nhất</option>
            </select>

            {/* Trạng thái nếu đã đăng nhập */}
            {user && (
              <select
                aria-label="Lọc theo trạng thái"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="min-h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 transition focus:border-violet-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="UNCOMPLETED">Chưa làm</option>
                <option value="IN_PROGRESS">Đang học dở</option>
                <option value="COMPLETED">Đã hoàn thành</option>
              </select>
            )}

            {/* Đặt lại bộ lọc */}
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory("ALL");
                setSelectedDifficulty("ALL");
                setSortOrder("DEFAULT");
                setSelectedStatus("ALL");
                const params = new URLSearchParams(window.location.search);
                params.delete("category");
                params.delete("tab");
                params.delete("mode");
                const qs = params.toString();
                router.replace(qs ? `/practice/reading?${qs}` : "/practice/reading", { scroll: false });
              }}
              aria-label="Đặt lại tất cả bộ lọc về mặc định"
              className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 transition hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
            >
              <RotateCcw size={12} aria-hidden="true" />
              Đặt lại
            </button>
          </div>
        </div>
      </section>

      {/* Unified Catalog Results Grid */}
      <section>
        {isLoading ? (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <Loader2 size={32} className="animate-spin text-violet-600" aria-hidden="true" />
            <p className="mt-3 text-xs font-bold text-slate-500 dark:text-slate-400">
              Đang tải danh sách bài luyện tập...
            </p>
          </div>
        ) : filteredAndSortedItems.length > 0 ? (
          <div className="grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredAndSortedItems.map((item) => {
              if (item.type === "READING") {
                return (
                  <ReadingTopicCard
                    key={`reading-${item.data.id}`}
                    topic={item.data}
                    isAuthenticated={Boolean(user)}
                    onOpenAuthGate={() =>
                      setAuthGate({
                        open: true,
                        topicId: item.data.id,
                        topicName: item.data.name || item.data.title,
                      })
                    }
                    onOpenPaywall={(t) => setPaywallTopic(t)}
                    onStart={handleStartReadingTopic}
                    isSpotlight={item.data.isSpotlight}
                  />
                );
              }
              return (
                <GrammarTopicCard
                  key={`grammar-${item.data.id}`}
                  topic={item.data}
                  isAuthenticated={Boolean(user)}
                  onOpenAuthGate={() =>
                    setAuthGate({
                      open: true,
                      topicName: item.data.title,
                    })
                  }
                  onStart={handleStartGrammarTopic}
                />
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-12 text-center">
            <BookOpen size={36} className="mx-auto text-slate-400 dark:text-slate-500 mb-3" aria-hidden="true" />
            <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200">
              Không tìm thấy bài luyện tập phù hợp
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Hãy thử chọn phân loại khác, độ khó khác hoặc tìm kiếm với từ khóa khác để khám phá các bài luyện có sẵn.
            </p>
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCategory("ALL");
                  setSelectedDifficulty("ALL");
                  setSortOrder("DEFAULT");
                  setSelectedStatus("ALL");
                  const params = new URLSearchParams(window.location.search);
                  params.delete("category");
                  params.delete("tab");
                  params.delete("mode");
                  const qs = params.toString();
                  router.replace(qs ? `/practice/reading?${qs}` : "/practice/reading", { scroll: false });
                }}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs transition-colors cursor-pointer"
              >
                <RotateCcw size={14} aria-hidden="true" />
                Xóa bộ lọc
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Guest AuthGateModal */}
      <AuthGateModal
        isOpen={authGate.open}
        onClose={() => setAuthGate({ open: false })}
        targetLabel={authGate.topicName ? `bài luyện "${authGate.topicName}"` : "bài luyện tập này"}
        targetRoute={authGate.topicId ? `/practice/reading/${authGate.topicId}` : "/practice/reading"}
        onOpenLogin={() => router.push("/login")}
        onOpenRegister={() => router.push("/register")}
      />

      {/* PLUS Paywall Modal */}
      <PremiumContentPaywallModal
        isOpen={!!paywallTopic}
        onClose={() => setPaywallTopic(null)}
        skillType="READING"
        itemTitle={paywallTopic?.name || paywallTopic?.title}
      />
    </div>
  );
}

export default function ReadingTopicsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-64 items-center justify-center">
          <Loader2 className="animate-spin text-amber-600" size={32} />
        </div>
      }
    >
      <ReadingTopicsContent />
    </Suspense>
  );
}
