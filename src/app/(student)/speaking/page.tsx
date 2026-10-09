"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
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
import { userService, type UserSkillsSummaryResponse } from "@/lib/api/services/user.service";
import { useAuthStore } from "@/stores/authStore";
import { useGamificationStore } from "@/stores/gamificationStore";
import { AuthGateModal } from "@/components/auth/AuthGateModal";
import { PremiumContentPaywallModal } from "@/components/subscription/PremiumContentPaywallModal";
import { PracticeCard, type PracticeExerciseItem } from "@/components/speaking/PracticeCard";
import {
  type DifficultyLevel,
  matchesDifficulty,
} from "@/components/speaking/practiceCardLogic";
import { presentSpeakingProgress } from "@/lib/speaking/speakingExperienceLogic";

const DIFFICULTY_OPTIONS: Array<{ id: DifficultyLevel; label: string }> = [
  { id: "ALL", label: "Tất cả" },
  { id: "BASIC", label: "Cơ bản" },
  { id: "INTERMEDIATE", label: "Trung cấp" },
  { id: "ADVANCED", label: "Nâng cao" },
];

function getDifficultyWeight(difficulty?: string): number {
  if (!difficulty) return 99;
  const normalized = difficulty.toLowerCase();
  if (
    normalized.includes("cơ bản") ||
    normalized.includes("beginner") ||
    normalized.includes("basic")
  ) {
    return 1;
  }
  if (
    normalized.includes("trung cấp") ||
    normalized.includes("intermediate")
  ) {
    return 2;
  }
  if (
    normalized.includes("nâng cao") ||
    normalized.includes("advanced")
  ) {
    return 3;
  }
  return 99;
}

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
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>("ALL");
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
  const [paywallExercise, setPaywallExercise] = useState<PracticeExerciseItem | null>(null);

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
        router.push(`/speaking/${launchingExerciseId}${query}`);
      });
    });

    return () => {
      cancelAnimationFrame(animId1);
      if (animId2) cancelAnimationFrame(animId2);
    };
  }, [launchingExerciseId, launchingPracticeSetKey, router]);

  const { data: exercises, isLoading, isError, refetch } = useQuery<SpeakingExercise[]>({
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

  const { data: skillProgress } = useQuery<UserSkillsSummaryResponse>({
    queryKey: ["user-skills-summary", user?.id],
    queryFn: userService.getSkillProgress,
    enabled: Boolean(user),
    staleTime: 30_000,
  });

  const speakingProgress = skillProgress?.skills.find((item) => item.skill === "SPEAKING");

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

  // Compound Filter & Sort Pipeline
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

      const matchDifficulty = matchesDifficulty(
        ex.difficulty || "",
        selectedDifficulty,
      );

      const matchCategory =
        selectedCategory === "ALL" ||
        (ex.category || "").toUpperCase() === selectedCategory.toUpperCase();

      const inProgress = Boolean(
        ex.practiceSet &&
          ex.practiceSet.completedCount > 0 &&
          ex.practiceSet.completedCount < ex.practiceSet.exerciseCount,
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
        const weightA = getDifficultyWeight(a.difficulty);
        const weightB = getDifficultyWeight(b.difficulty);
        if (weightA !== weightB) return weightA - weightB;
        return (a.id || 0) - (b.id || 0);
      }
      if (sortOrder === "HARD_TO_EASY") {
        const weightA = getDifficultyWeight(a.difficulty);
        const weightB = getDifficultyWeight(b.difficulty);
        if (weightA !== weightB) return weightB - weightA;
        return (b.id || 0) - (a.id || 0);
      }
      // NEWEST
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
  }, [
    practiceSets,
    searchTerm,
    selectedDifficulty,
    selectedCategory,
    selectedStatus,
    sortOrder,
  ]);

  const totalPages = Math.ceil(filteredAndSortedExercises.length / pageSize);
  const paginatedExercises = useMemo(() => {
    return filteredAndSortedExercises.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize,
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

  const progressPresentation = presentSpeakingProgress(
    speakingProgress,
    completedCount,
  );

  return (
    <div className="space-y-6 pb-20 pt-2">
      {/* Hero & Learning Progression Bar */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4 sm:px-6 sm:py-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 dark:border-violet-800/60 bg-violet-50/80 dark:bg-violet-950/40 px-3 py-1 text-xs font-bold text-violet-700 dark:text-violet-300">
              <Mic size={14} aria-hidden="true" />
              <span>Phòng Luyện Nói & Âm Vị Học</span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
              Rèn luyện Phát âm, Ngữ điệu & Phản xạ Giao tiếp
            </h1>

            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 sm:text-sm max-w-3xl line-clamp-1 xl:line-clamp-none">
              Hệ thống đánh giá phát âm phân tích từng âm vị (Phonemes), đo lường độ chính xác (Accuracy), độ lưu loát (Fluency) và tính trọn vẹn của câu nói theo thời gian thực.
            </p>

            {/* Gamified Stats Pill Row */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 text-xs font-black text-amber-800 dark:text-amber-300">
                <Flame size={14} className="text-amber-500 fill-amber-500" aria-hidden="true" />
                <span>Chuỗi học: {streak ?? 0} ngày liên tiếp</span>
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 dark:border-violet-800/60 bg-violet-50 dark:bg-violet-950/40 px-3 py-1.5 text-xs font-black text-violet-800 dark:text-violet-300">
                <Target size={14} className="text-violet-600 dark:text-violet-400" aria-hidden="true" />
                <span>{speakingProgress?.normalizedScore != null ? `Điểm gần đây: ${Math.round(speakingProgress.normalizedScore)}/100` : "Chưa đủ dữ liệu để đánh giá"}</span>
              </div>
            </div>
          </div>

          {/* Global Completion Progress Card */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-4 sm:p-4.5 shadow-2xs lg:w-72 shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tiến độ luyện nói
              </span>
              {progressPresentation.completionPercent !== null && (
                <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-xs font-black text-emerald-700 dark:text-emerald-300">
                  {progressPresentation.completionPercent}% hoàn thành
                </span>
              )}
            </div>

            <div>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-xl font-black text-slate-900 dark:text-slate-100">
                  {progressPresentation.totalItems === null
                    ? `${progressPresentation.completedItems} bài`
                    : `${progressPresentation.completedItems}/${progressPresentation.totalItems}`}
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  bài đã hoàn thành
                </span>
              </div>

              {progressPresentation.completionPercent !== null ? (
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${progressPresentation.completionPercent}%` }}
                  />
                </div>
              ) : (
                <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Chưa có tổng danh mục hợp lệ để tính phần trăm hoàn thành.
                </p>
              )}
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
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400"
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

        {/* Row 2: Functional Reactive Difficulty Chips, Status & Sort */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-3">
          {/* Reactive Difficulty Chips */}
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
                  onClick={() => {
                    setSelectedDifficulty(lvl.id);
                    setCurrentPage(1);
                  }}
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
                setSelectedDifficulty("ALL");
                setSelectedCategory("ALL");
                setSortOrder("EASY_TO_HARD");
                setSelectedStatus("ALL");
                setCurrentPage(1);
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

      {/* Catalog Results Grid */}
      <section>
        {isLoading ? (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <Loader2 size={32} className="animate-spin text-violet-600" aria-hidden="true" />
            <p className="mt-3 text-xs font-bold text-slate-500 dark:text-slate-400">
              Đang tải danh sách bài luyện nói...
            </p>
          </div>
        ) : isError ? (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50/60 p-8 text-center dark:border-rose-900/60 dark:bg-rose-950/20">
            <p className="text-sm font-bold text-rose-800 dark:text-rose-200">
              Không thể tải danh sách bài luyện nói.
            </p>
            <p className="mt-1 text-xs text-rose-700 dark:text-rose-300">
              Kiểm tra kết nối mạng rồi thử lại.
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-rose-300 bg-white px-4 text-xs font-bold text-rose-800 hover:bg-rose-100 dark:border-rose-800 dark:bg-slate-900 dark:text-rose-200 dark:hover:bg-rose-950/40"
            >
              <RotateCcw size={14} aria-hidden="true" />
              Thử lại
            </button>
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
                  onOpenPaywall={(ex) => setPaywallExercise(ex)}
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
          /* Graceful Informative Empty State with Reset Filter Action */
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-12 text-center">
            <Mic size={36} className="mx-auto text-slate-400 dark:text-slate-500 mb-3" aria-hidden="true" />
            <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200">
              {selectedDifficulty !== "ALL"
                ? "Không tìm thấy bộ luyện phù hợp với mức độ này."
                : "Không tìm thấy bài luyện nói phù hợp"}
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {selectedDifficulty !== "ALL"
                ? "Thử chọn mức độ khác hoặc đặt lại bộ lọc để khám phá các bài luyện có sẵn."
                : "Hãy thử chọn bộ lọc khác hoặc tìm kiếm với từ khóa khác."}
            </p>
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setSelectedDifficulty("ALL");
                  setSearchTerm("");
                  setSelectedCategory("ALL");
                  setSelectedStatus("ALL");
                  setCurrentPage(1);
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
        targetLabel={authGate.title ? `bài luyện nói "${authGate.title}"` : "bài luyện nói này"}
        targetRoute={
          authGate.exerciseId
            ? `/speaking/${authGate.exerciseId}${
                authGate.practiceSetKey
                  ? `?set=${encodeURIComponent(authGate.practiceSetKey)}`
                  : ""
              }`
            : "/speaking"
        }
        onOpenLogin={() => router.push("/login")}
        onOpenRegister={() => router.push("/register")}
      />

      {/* PLUS Paywall Modal */}
      <PremiumContentPaywallModal
        isOpen={Boolean(paywallExercise)}
        onClose={() => setPaywallExercise(null)}
        skillType="SPEAKING"
        itemTitle={paywallExercise?.title}
      />
    </div>
  );
}

