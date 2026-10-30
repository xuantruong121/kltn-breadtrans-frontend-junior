"use client";

import { useState, useMemo, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Loader2, RotateCcw, Search, X } from "lucide-react";
import { readingService } from "@/lib/api/services/reading.service";
import {
  grammarService,
  type GrammarTopicSummary,
} from "@/lib/api/services/grammar.service";
import { useAuthStore } from "@/stores/authStore";
import { AuthGateModal } from "@/components/auth/AuthGateModal";
import { PremiumContentPaywallModal } from "@/components/subscription/PremiumContentPaywallModal";
import {
  ReadingTopicCard,
  type ReadingTopicItem,
} from "@/components/reading/ReadingTopicCard";
import { GrammarCatalog } from "@/components/reading/GrammarCatalog";
import {
  type ExerciseCategory,
  summarizeReadingExerciseProgress,
} from "@/components/reading/readingCardLogic";
import { PracticeCatalogFilters } from "@/components/practice/PracticeCatalogFilters";
import {
  DEFAULT_CATALOG_SORT,
  matchesDifficultyFilter,
  matchesStatusFilter,
  sortByLevel,
  type CatalogSort,
  type DifficultyFilter,
  type StatusFilter,
} from "@/lib/practice/catalogFilters";
import { quizDisplayTitle } from "@/lib/catalog/displayTitles";
import { GrammarScreen } from "@/modules/grammar/screens/GrammarScreen";
import { isSafeCourseReturn } from "@/lib/course/navigation";

const CATEGORY_OPTIONS: Array<{ id: ExerciseCategory; label: string }> = [
  { id: "READING", label: "Đọc hiểu" },
  { id: "GRAMMAR", label: "Ngữ pháp" },
];

/** Authoritative level from the API, with the stored level as fallback. */
const readingLevelOf = (item: ReadingTopicItem) => item.cefrLevel ?? item.level;

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
    rawCategoryParam === "grammar" ? "GRAMMAR" : "READING";
  const requestedGrammarTopicId = Number(searchParams.get("topicId"));
  const requestedReturnTo = searchParams.get("returnTo");
  const courseReturn =
    requestedReturnTo && isSafeCourseReturn(requestedReturnTo)
      ? requestedReturnTo
      : null;

  const [selectedCategory, setSelectedCategory] =
    useState<ExerciseCategory>(initialCategory);
  const [activeGrammarTopicId, setActiveGrammarTopicId] = useState<
    number | null
  >(
    initialCategory === "GRAMMAR" &&
      Number.isInteger(requestedGrammarTopicId) &&
      requestedGrammarTopicId > 0
      ? requestedGrammarTopicId
      : null,
  );

  const { user } = useAuthStore();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<DifficultyFilter>("ALL");
  const [sortOrder, setSortOrder] = useState<CatalogSort>(DEFAULT_CATALOG_SORT);
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("ALL");
  const [authGate, setAuthGate] = useState<{
    open: boolean;
    quizId?: number;
    title?: string;
  }>({ open: false });
  const [paywallExercise, setPaywallExercise] =
    useState<ReadingTopicItem | null>(null);

  // Sync category param with URL without causing page reload
  const handleCategoryChange = (category: ExerciseCategory) => {
    setSelectedCategory(category);
    const params = new URLSearchParams(window.location.search);
    params.delete("tab");
    params.delete("mode");
    if (category === "READING") {
      params.delete("category");
    } else {
      params.set("category", category.toLowerCase());
    }
    const queryString = params.toString();
    const newPath = queryString ? `/reading?${queryString}` : "/reading";
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

  // Fetch one safe catalog card per actual Reading quiz.
  const {
    data: readingExercisesData,
    isLoading: isLoadingReading,
    isError: isReadingError,
    refetch: refetchReading,
  } = useQuery({
    queryKey: ["reading-exercises"],
    queryFn: readingService.getExercises,
  });

  // Fetch Grammar Topics
  const {
    data: grammarTopicsData,
    isLoading: isLoadingGrammar,
    isError: isGrammarError,
    refetch: refetchGrammar,
  } = useQuery({
    queryKey: ["grammar-topics"],
    queryFn: grammarService.getTopics,
  });

  const isLoading = isLoadingReading || isLoadingGrammar;
  const isCatalogError = isReadingError || isGrammarError;

  const retryCatalog = () => {
    void Promise.all([refetchReading(), refetchGrammar()]);
  };

  const readingExercises: ReadingTopicItem[] = useMemo(() => {
    if (!Array.isArray(readingExercisesData)) return [];
    return readingExercisesData.map((exercise) => ({
      id: exercise.quizId,
      quizId: exercise.quizId,
      title: quizDisplayTitle(exercise.quizId, exercise.title, exercise.cefrLevel),
      name: quizDisplayTitle(exercise.quizId, exercise.title, exercise.cefrLevel),
      cefrLevel: exercise.cefrLevel,
      description: exercise.description ?? undefined,
      level: exercise.level,
      topicName: exercise.topicName,
      vietnameseName: exercise.topicVietnameseName ?? undefined,
      parentTopicId: exercise.parentTopicId,
      questionCount: exercise.questionCount,
      totalQuestions: exercise.questionCount,
      estimatedMinutes: exercise.estimatedMinutes,
      microSkills: exercise.microSkills,
      isPremiumContent: exercise.isPremiumContent,
      isLocked: exercise.isLocked,
      completionStatus: exercise.completionStatus,
      totalArticles: 1,
      completedArticles: exercise.completionStatus === "COMPLETED" ? 1 : 0,
    }));
  }, [readingExercisesData]);

  const grammarTopics: GrammarTopicSummary[] = useMemo(() => {
    return Array.isArray(grammarTopicsData)
      ? (grammarTopicsData as GrammarTopicSummary[])
      : [];
  }, [grammarTopicsData]);

  const readingProgress = summarizeReadingExerciseProgress(readingExercises);
  const completedReadingCount = readingProgress.completedExercises;
  const readingCompletionPct = readingProgress.completionPercent;

  // Reading filters; grammar has its own catalog below.
  const filteredAndSortedItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const list = readingExercises.filter((exercise) => {
      const searchable = [
        exercise.title,
        exercise.description,
        exercise.topicName,
        ...(exercise.microSkills ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return (
        (!q || searchable.includes(q)) &&
        matchesDifficultyFilter(readingLevelOf(exercise), selectedDifficulty) &&
        matchesStatusFilter(exercise.completionStatus ?? "NOT_STARTED", selectedStatus)
      );
    });

    // Spotlight the first unfinished exercise in the sorted list.
    let spotlightAssigned = false;
    return sortByLevel(list, sortOrder, readingLevelOf).map((exercise) => {
      if (exercise.completionStatus !== "COMPLETED" && !spotlightAssigned) {
        spotlightAssigned = true;
        return { ...exercise, isSpotlight: true };
      }
      return exercise;
    });
  }, [readingExercises, searchTerm, selectedDifficulty, selectedStatus, sortOrder]);

  const handleStartReadingExercise = (exercise: ReadingTopicItem) => {
    if (!user) {
      setAuthGate({
        open: true,
        quizId: exercise.quizId ?? exercise.id,
        title: exercise.title,
      });
      return;
    }
    if (exercise.isLocked) {
      setPaywallExercise(exercise);
      return;
    }
    router.push(`/reading/${exercise.quizId ?? exercise.id}`);
  };

  const handleStartGrammarTopic = (topic: GrammarTopicSummary) => {
    if (!user) {
      setAuthGate({
        open: true,
        title: topic.title,
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
        onExit={() => {
          if (courseReturn) {
            router.push(courseReturn);
            return;
          }
          setActiveGrammarTopicId(null);
          handleCategoryChange("GRAMMAR");
        }}
      />
    );
  }

  return (
    <div className="space-y-6 pb-20 pt-2">
      {/* Hero & Learning Progression Bar */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4 sm:px-6 sm:py-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 dark:border-violet-800/60 bg-violet-50/80 dark:bg-violet-950/40 px-3 py-1 text-xs font-bold text-violet-700 dark:text-violet-300">
              <BookOpen size={14} aria-hidden="true" />
              <span>Trung tâm luyện Đọc hiểu & Ngữ pháp</span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
              Rèn luyện Đọc hiểu & Ngữ pháp qua các tình huống thực tế
            </h1>

            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 sm:text-sm max-w-3xl line-clamp-1 xl:line-clamp-none">
              Phát triển vốn từ vựng, củng cố quy tắc ngữ pháp cốt lõi và rèn
              luyện khả năng đọc hiểu trong ngữ cảnh đời sống, học tập và công
              việc.
            </p>
          </div>

          {/* Reading Comprehension Progress Card */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-4 sm:p-4.5 shadow-2xs lg:w-72 shrink-0 space-y-3">
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
                  {completedReadingCount}/{readingExercises.length}
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  bài đọc hoàn thành
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${readingCompletionPct}%` }}
                />
              </div>
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
                <kbd className="hidden sm:inline-block rounded-md border border-slate-300/80 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-0.5 text-xs font-mono font-bold text-slate-600 dark:text-slate-400 shadow-2xs">
                  ⌘K
                </kbd>
              )}
            </div>
          </div>
        </div>

        <div
          className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 dark:border-slate-800 pt-3"
          role="group"
          aria-label="Phân loại bài luyện"
        >
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

        {selectedCategory !== "GRAMMAR" && (
          <PracticeCatalogFilters
            difficulty={selectedDifficulty}
            onDifficultyChange={setSelectedDifficulty}
            sort={sortOrder}
            onSortChange={setSortOrder}
            status={selectedStatus}
            onStatusChange={setSelectedStatus}
            statusOptions={user ? ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"] : []}
            resultCount={filteredAndSortedItems.length}
            itemNoun="bài đọc"
            onReset={() => {
              setSearchTerm("");
              setSelectedDifficulty("ALL");
              setSortOrder(DEFAULT_CATALOG_SORT);
              setSelectedStatus("ALL");
            }}
          />
        )}
      </section>

      {/* Catalog results */}
      <section>
        {isLoading ? (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <Loader2
              size={32}
              className="animate-spin text-violet-600"
              aria-hidden="true"
            />
            <p className="mt-3 text-xs font-bold text-slate-500 dark:text-slate-400">
              Đang tải danh sách bài luyện tập...
            </p>
          </div>
        ) : isCatalogError ? (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50/60 p-8 text-center dark:border-rose-900/60 dark:bg-rose-950/20">
            <p className="text-sm font-bold text-rose-800 dark:text-rose-200">
              Không thể tải danh sách bài luyện tập.
            </p>
            <p className="mt-1 text-xs text-rose-700 dark:text-rose-300">
              Kiểm tra kết nối mạng rồi thử lại.
            </p>
            <button
              type="button"
              onClick={retryCatalog}
              className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-rose-300 bg-white px-4 text-xs font-bold text-rose-800 hover:bg-rose-100 dark:border-rose-800 dark:bg-slate-900 dark:text-rose-200 dark:hover:bg-rose-950/40"
            >
              <RotateCcw size={14} aria-hidden="true" />
              Thử lại
            </button>
          </div>
        ) : selectedCategory === "GRAMMAR" ? (
          <GrammarCatalog
            topics={grammarTopics}
            searchTerm={searchTerm}
            onStart={handleStartGrammarTopic}
          />
        ) : filteredAndSortedItems.length > 0 ? (
          <div className="grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredAndSortedItems.map((exercise) => (
              <ReadingTopicCard
                key={`reading-${exercise.id}`}
                topic={exercise}
                isAuthenticated={Boolean(user)}
                onOpenAuthGate={() =>
                  setAuthGate({
                    open: true,
                    quizId: exercise.quizId ?? exercise.id,
                    title: exercise.title,
                  })
                }
                onOpenPaywall={(t) => setPaywallExercise(t)}
                onStart={handleStartReadingExercise}
                statusOverride={
                  !exercise.isLocked && exercise.completionStatus === "IN_PROGRESS"
                    ? "IN_PROGRESS"
                    : undefined
                }
                isSpotlight={exercise.isSpotlight}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-12 text-center">
            <BookOpen
              size={36}
              className="mx-auto text-slate-400 dark:text-slate-500 mb-3"
              aria-hidden="true"
            />
            <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200">
              Không tìm thấy bài đọc phù hợp
            </h2>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Hãy thử chọn độ khó khác, trạng thái khác hoặc tìm kiếm với từ khóa khác.
            </p>
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedDifficulty("ALL");
                  setSortOrder(DEFAULT_CATALOG_SORT);
                  setSelectedStatus("ALL");
                }}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 px-4 py-2 text-sm font-semibold text-white shadow-xs transition-colors cursor-pointer"
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
        targetLabel={
          authGate.title ? `bài luyện "${authGate.title}"` : "bài luyện tập này"
        }
        targetRoute={
          authGate.quizId ? `/reading/${authGate.quizId}` : "/reading"
        }
        onOpenLogin={() => router.push("/login")}
        onOpenRegister={() => router.push("/register")}
      />

      {/* Paywall Modal */}
      <PremiumContentPaywallModal
        isOpen={!!paywallExercise}
        onClose={() => setPaywallExercise(null)}
        skillType="READING"
        itemTitle={paywallExercise?.title}
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
