"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Coins,
  Filter,
  Flame,
  Loader2,
  Mic,
  RotateCcw,
  Search,
  Target,
  X,
} from "lucide-react";
import {
  speakingService,
  type SpeakingExercise,
  type SpeakingPracticeSetSummary,
  type SpeakingSubmissionSummary,
} from "@/lib/api/services/speaking.service";
import { Pagination } from "@/components/ui";
import { PracticeLoadingScreen } from "@/components/practice/PracticeLoadingScreen";
import { useAuthStore } from "@/stores/authStore";
import { useGamificationStore } from "@/stores/gamificationStore";
import { AuthGateModal } from "@/components/auth/AuthGateModal";
import { PracticeCard } from "./components/PracticeCard";

const DIFFICULTY_WEIGHT: Record<string, number> = {
  BEGINNER: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
};

type SpeakingPracticeSetCard = SpeakingExercise & {
  practiceSet: SpeakingPracticeSetSummary;
  averageScore?: number;
  isSpotlight?: boolean;
};

export default function SpeakingExercisesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { streak } = useGamificationStore();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [sortOrder, setSortOrder] = useState<string>("EASY_TO_HARD");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [launchingExerciseId, setLaunchingExerciseId] = useState<number | null>(null);
  const [launchingPracticeSetKey, setLaunchingPracticeSetKey] = useState<string | null>(null);
  const [authGate, setAuthGate] = useState<{
    open: boolean;
    exerciseId?: number;
    title?: string;
    practiceSetKey?: string;
  }>({ open: false });

  // Keyboard shortcut Ctrl+K / Cmd+K to focus search dock
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

  useEffect(() => {
    if (!launchingExerciseId) return;

    let animId2: number;

    const animId1 = requestAnimationFrame(() => {
      animId2 = requestAnimationFrame(() => {
        const query = launchingPracticeSetKey
          ? `?set=${encodeURIComponent(launchingPracticeSetKey)}`
          : "";
        router.push(`/practice/speaking/${launchingExerciseId}${query}`);
      });
    });

    return () => {
      cancelAnimationFrame(animId1);
      if (animId2) cancelAnimationFrame(animId2);
    };
  }, [launchingExerciseId, launchingPracticeSetKey, router]);

  const { data: exercises, isLoading } = useQuery<SpeakingExercise[]>({
    queryKey: ["speaking-exercises"],
    queryFn: async () => {
      const res: any = await speakingService.getExercises();
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  const { data: mySubmissions } = useQuery<SpeakingSubmissionSummary[]>({
    queryKey: ["speaking-submissions-summary"],
    queryFn: speakingService.getMySubmissions,
    enabled: Boolean(user),
    staleTime: 1000 * 60 * 2,
  });

  // Calculate highest score per exercise
  const scoreByExerciseId = useMemo(() => {
    const map = new Map<number, number>();
    if (!mySubmissions) return map;
    for (const sub of mySubmissions) {
      if (sub.overallScore != null && sub.overallScore > 0) {
        const existing = map.get(sub.exerciseId);
        if (!existing || sub.overallScore > existing) {
          map.set(sub.exerciseId, Math.round(sub.overallScore));
        }
      }
    }
    return map;
  }, [mySubmissions]);

  const practiceSets = useMemo<SpeakingPracticeSetCard[]>(() => {
    if (!exercises) return [];
    const byKey = new Map<string, SpeakingExercise[]>();
    for (const exercise of exercises) {
      const key = exercise.practiceSet?.key ?? `legacy-${exercise.id}`;
      byKey.set(key, [...(byKey.get(key) ?? []), exercise]);
    }

    return Array.from(byKey.values()).map((items) => {
      const first = items[0];
      const summary = first.practiceSet ?? {
        key: `legacy-${first.id}`,
        title: first.title,
        description: first.description ?? "Bài luyện nói theo câu.",
        category: first.category,
        exerciseCount: 1,
        completedCount: first.isCompleted ? 1 : 0,
        exerciseIds: [first.id],
        difficultyLabel: first.difficulty,
        position: 1,
        isCompleted: Boolean(first.isCompleted),
      };

      // Calculate average score across exercises in set
      let scoreSum = 0;
      let scoreCount = 0;
      for (const item of items) {
        const sc = scoreByExerciseId.get(item.id);
        if (sc !== undefined) {
          scoreSum += sc;
          scoreCount++;
        }
      }
      const avgScore = scoreCount > 0 ? Math.round(scoreSum / scoreCount) : undefined;

      return {
        ...first,
        title: summary.title,
        description: summary.description,
        category: summary.category,
        difficulty: summary.difficultyLabel,
        isCompleted: summary.isCompleted,
        practiceSet: summary,
        averageScore: avgScore,
      };
    });
  }, [exercises, scoreByExerciseId]);

  // Extract unique categories
  const categories = useMemo(() => {
    if (!practiceSets) return [];
    const set = new Set<string>();
    practiceSets.forEach((ex) => {
      if (ex.category) set.add(ex.category);
    });
    return Array.from(set);
  }, [practiceSets]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!practiceSets) return counts;
    practiceSets.forEach((ex) => {
      const cat = ex.category || "GENERAL";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [practiceSets]);

  // Count completed
  const completedCount = useMemo(() => {
    if (!practiceSets) return 0;
    return practiceSets.filter((ex) => Boolean(ex.isCompleted)).length;
  }, [practiceSets]);

  // Filter & Sort
  const filteredAndSortedExercises = useMemo(() => {
    if (!practiceSets) return [];

    const list = practiceSets.filter((ex) => {
      const q = searchTerm.trim().toLowerCase();
      const matchSearch =
        !q ||
        ex.title?.toLowerCase().includes(q) ||
        ex.targetText?.toLowerCase().includes(q) ||
        ex.translation?.toLowerCase().includes(q) ||
        ex.category?.toLowerCase().includes(q);

      const matchDifficulty =
        selectedDifficulty === "ALL" ||
        (ex.difficulty || "").toUpperCase() === selectedDifficulty;

      const matchCategory =
        selectedCategory === "ALL" ||
        (ex.category || "").toUpperCase() === selectedCategory.toUpperCase();

      const inProgress = Boolean(
        ex.practiceSet &&
        ex.practiceSet.completedCount > 0 &&
        ex.practiceSet.completedCount < ex.practiceSet.exerciseCount
      );

      const matchStatus =
        selectedStatus === "ALL" ||
        (selectedStatus === "COMPLETED" && Boolean(ex.isCompleted)) ||
        (selectedStatus === "IN_PROGRESS" && inProgress) ||
        (selectedStatus === "UNCOMPLETED" && !ex.isCompleted && !inProgress);

      return matchSearch && matchDifficulty && matchCategory && matchStatus;
    });

    const sorted = list.sort((a, b) => {
      if (sortOrder === "EASY_TO_HARD") {
        const weightA = DIFFICULTY_WEIGHT[(a.difficulty || "").toUpperCase()] || 99;
        const weightB = DIFFICULTY_WEIGHT[(b.difficulty || "").toUpperCase()] || 99;
        if (weightA !== weightB) return weightA - weightB;
        return (a.id || 0) - (b.id || 0);
      }
      if (sortOrder === "HARD_TO_EASY") {
        const weightA = DIFFICULTY_WEIGHT[(a.difficulty || "").toUpperCase()] || 0;
        const weightB = DIFFICULTY_WEIGHT[(b.difficulty || "").toUpperCase()] || 0;
        if (weightA !== weightB) return weightB - weightA;
        return (b.id || 0) - (a.id || 0);
      }
      return (b.id || 0) - (a.id || 0);
    });

    // Tag the first uncompleted or in-progress item as Spotlight
    let spotlightAssigned = false;
    return sorted.map((item) => {
      const isDone = Boolean(item.isCompleted);
      if (!isDone && !spotlightAssigned) {
        spotlightAssigned = true;
        return { ...item, isSpotlight: true };
      }
      return item;
    });
  }, [practiceSets, searchTerm, selectedDifficulty, selectedCategory, selectedStatus, sortOrder]);

  const totalPages = Math.ceil(filteredAndSortedExercises.length / pageSize);
  const paginatedExercises = useMemo(() => {
    return filteredAndSortedExercises.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    );
  }, [filteredAndSortedExercises, currentPage, pageSize]);

  const handleStartExercise = (
    exercise: SpeakingExercise & { practiceSet?: SpeakingPracticeSetSummary },
  ) => {
    if (!user) {
      setAuthGate({
        open: true,
        exerciseId: exercise.id,
        title: exercise.title,
        practiceSetKey: exercise.practiceSet?.key,
      });
      return;
    }
    if (launchingExerciseId) return;
    setLaunchingPracticeSetKey(exercise.practiceSet?.key ?? null);
    setLaunchingExerciseId(exercise.id);
  };

  if (launchingExerciseId) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center py-12">
        <PracticeLoadingScreen skill="speaking" className="max-w-4xl" />
      </div>
    );
  }

  const globalCompletionPct = Math.round(
    (completedCount / Math.max(1, practiceSets.length)) * 100
  );

  return (
    <div className="space-y-6 pb-20 pt-2">
      {/* Hero & Learning Progression Bar */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 dark:border-violet-800/60 bg-violet-50/80 dark:bg-violet-950/40 px-3 py-1 text-xs font-bold text-violet-700 dark:text-violet-300">
              <Mic size={14} aria-hidden="true" />
              <span>Phòng Luyện Nói & Âm Vị Học AI</span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
              Rèn luyện Phát âm, Ngữ điệu & Phản xạ Giao tiếp
            </h1>

            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 sm:text-sm">
              Hệ thống đánh giá phát âm AI phân tích từng âm vị (Phonemes), đo lường độ chính xác (Accuracy), độ lưu loát (Fluency) và tính trọn vẹn của câu nói theo thời gian thực.
            </p>

            {/* Gamified Stats Pill Row */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 text-xs font-black text-amber-800 dark:text-amber-300">
                <Flame size={14} className="text-amber-500 fill-amber-500" aria-hidden="true" />
                <span>Chuỗi học: {streak || 1} ngày liên tiếp</span>
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/40 px-3 py-1.5 text-xs font-black text-blue-800 dark:text-blue-300">
                <Target size={14} className="text-blue-600 dark:text-blue-400" aria-hidden="true" />
                <span>Mục tiêu hôm nay: {Math.min(completedCount, 3)}/3 bài</span>
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 dark:border-violet-800/60 bg-violet-50 dark:bg-violet-950/40 px-3 py-1.5 text-xs font-black text-violet-800 dark:text-violet-300">
                <Coins size={14} className="text-violet-600 dark:text-violet-400" aria-hidden="true" />
                <span>Thưởng: +10 Bánh Mì / bài</span>
              </div>
            </div>
          </div>

          {/* Global Completion Progress Card */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-5 shadow-2xs lg:w-80 shrink-0 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tiến độ toàn khóa
              </span>
              <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-xs font-black text-emerald-700 dark:text-emerald-300">
                {globalCompletionPct}%
              </span>
            </div>

            <div>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-xl font-black text-slate-900 dark:text-slate-100">
                  {completedCount}/{practiceSets.length}
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  bộ luyện hoàn thành
                </span>
              </div>

              {/* Progress Ring / Bar */}
              <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${globalCompletionPct}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200/80 dark:border-slate-700/80 pt-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <span>Tổng số câu: {exercises?.length || 0} câu</span>
              <Link
                href="/practice/listening"
                className="inline-flex items-center gap-1 font-bold text-violet-700 dark:text-violet-400 hover:underline"
              >
                Luyện nghe
                <ArrowRight size={12} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Unified Modern Filter Dock */}
      <section className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs sm:p-5 space-y-4">
        {/* Row 1: Search Input (with Ctrl+K / Cmd+K badge and clear button) & Category Chips */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 lg:max-w-md">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
              aria-hidden="true"
            />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Tìm kiếm bài nói theo chủ đề, câu mẫu..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="min-h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-20 text-xs text-slate-800 dark:text-slate-100 transition placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-violet-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden"
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
                <kbd className="hidden sm:inline-block rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-400 dark:text-slate-500">
                  ⌘K
                </kbd>
              )}
            </div>
          </div>

          {/* Category Pill Dock */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
            <button
              type="button"
              onClick={() => {
                setSelectedCategory("ALL");
                setCurrentPage(1);
              }}
              className={`min-h-9 rounded-xl px-3 text-xs font-black transition whitespace-nowrap cursor-pointer ${
                selectedCategory === "ALL"
                  ? "bg-violet-600 text-white shadow-2xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              Tất cả ({practiceSets.length})
            </button>

            {categories.map((cat) => {
              const count = categoryCounts[cat] || 0;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat);
                    setCurrentPage(1);
                  }}
                  className={`min-h-9 rounded-xl px-3 text-xs font-black transition whitespace-nowrap cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-violet-600 text-white shadow-2xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Difficulty Chips, Status & Sort */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-3">
          {/* Difficulty Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 mr-1">Độ khó:</span>
            {[
              { id: "ALL", label: "Tất cả" },
              { id: "BEGINNER", label: "Cơ bản" },
              { id: "INTERMEDIATE", label: "Trung cấp" },
              { id: "ADVANCED", label: "Nâng cao" },
            ].map((lvl) => (
              <button
                key={lvl.id}
                type="button"
                onClick={() => {
                  setSelectedDifficulty(lvl.id);
                  setCurrentPage(1);
                }}
                className={`min-h-9 rounded-lg border px-2.5 text-xs font-extrabold transition cursor-pointer ${
                  selectedDifficulty === lvl.id
                    ? "border-violet-600 bg-violet-50 text-violet-800 dark:border-violet-500 dark:bg-violet-950/60 dark:text-violet-200"
                    : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-900"
                }`}
              >
                {lvl.label}
              </button>
            ))}
          </div>

          {/* Sort, Status & Reset Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400">
              <Filter size={13} aria-hidden="true" />
              Bộ lọc:
            </span>

            {/* Sắp xếp */}
            <select
              aria-label="Sắp xếp bài nói"
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value);
                setCurrentPage(1);
              }}
              className="min-h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 transition focus:border-violet-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden cursor-pointer"
            >
              <option value="EASY_TO_HARD">Sắp xếp: Dễ → Khó</option>
              <option value="HARD_TO_EASY">Sắp xếp: Khó → Dễ</option>
              <option value="NEWEST">Sắp xếp: Mới nhất</option>
            </select>

            {/* Trạng thái nếu đã đăng nhập */}
            {user && (
              <select
                aria-label="Lọc theo trạng thái"
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="min-h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 transition focus:border-violet-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">Trạng thái: Tất cả</option>
                <option value="UNCOMPLETED">Chưa làm</option>
                <option value="IN_PROGRESS">Đang học dở</option>
                <option value="COMPLETED">Đã hoàn thành</option>
              </select>
            )}

            {/* Reset Filters */}
            {(selectedDifficulty !== "ALL" ||
              selectedCategory !== "ALL" ||
              sortOrder !== "EASY_TO_HARD" ||
              selectedStatus !== "ALL" ||
              Boolean(searchTerm)) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDifficulty("ALL");
                  setSelectedCategory("ALL");
                  setSortOrder("EASY_TO_HARD");
                  setSelectedStatus("ALL");
                  setSearchTerm("");
                  setCurrentPage(1);
                }}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
              >
                <RotateCcw size={12} aria-hidden="true" />
                Đặt lại
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Catalog Results Grid */}
      <section>
        {isLoading ? (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <Loader2 size={32} className="animate-spin text-violet-600" aria-hidden="true" />
            <p className="mt-3 text-xs font-bold text-slate-500 dark:text-slate-400">
              Đang tải danh sách bài luyện nói...
            </p>
          </div>
        ) : filteredAndSortedExercises.length > 0 ? (
          <div className="space-y-6">
            <div className="grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {paginatedExercises.map((exercise) => (
                <PracticeCard
                  key={exercise.id}
                  exercise={exercise}
                  isAuthenticated={Boolean(user)}
                  onOpenAuthGate={(ex) =>
                    setAuthGate({
                      open: true,
                      exerciseId: ex.id,
                      title: ex.title,
                      practiceSetKey: ex.practiceSet?.key,
                    })
                  }
                  onStart={handleStartExercise}
                  isLaunching={Boolean(launchingExerciseId)}
                />
              ))}
            </div>

            {/* Pagination if more than 1 page */}
            {totalPages > 1 && (
              <div className="pt-2">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredAndSortedExercises.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
            <Mic size={32} className="mx-auto text-slate-400" aria-hidden="true" />
            <h2 className="mt-3 text-base font-bold text-slate-800 dark:text-slate-200">
              Không tìm thấy bài luyện nói phù hợp
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Hãy thử chọn bộ lọc khác hoặc tìm kiếm với từ khóa khác.
            </p>
          </div>
        )}
      </section>

      {/* Guest AuthGateModal */}
      <AuthGateModal
        isOpen={authGate.open}
        onClose={() => setAuthGate({ open: false })}
        targetLabel={authGate.title ? `bài luyện nói "${authGate.title}"` : "bài luyện nói này"}
        targetRoute={
          authGate.exerciseId
            ? `/practice/speaking/${authGate.exerciseId}${
                authGate.practiceSetKey
                  ? `?set=${encodeURIComponent(authGate.practiceSetKey)}`
                  : ""
              }`
            : "/practice/speaking"
        }
        onOpenLogin={() => router.push("/login")}
        onOpenRegister={() => router.push("/register")}
      />
    </div>
  );
}
