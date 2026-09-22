"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Award,
  Filter,
  Loader2,
  Mic,
  RotateCcw,
  Search,
} from "lucide-react";
import {
  speakingService,
  type SpeakingExercise,
  type SpeakingPracticeSetSummary,
} from "@/lib/api/services/speaking.service";
import { Pagination } from "@/components/ui";
import { PracticeLoadingScreen } from "@/components/practice/PracticeLoadingScreen";
import { useAuthStore } from "@/stores/authStore";
import { AuthGateModal } from "@/components/auth/AuthGateModal";
import { SpeakingExerciseCard } from "./components/SpeakingExerciseCard";

const DIFFICULTY_WEIGHT: Record<string, number> = {
  BEGINNER: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
};

type SpeakingPracticeSetCard = SpeakingExercise & {
  practiceSet: SpeakingPracticeSetSummary;
};

export default function SpeakingExercisesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
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

      return {
        ...first,
        title: summary.title,
        description: summary.description,
        category: summary.category,
        difficulty: summary.difficultyLabel,
        isCompleted: summary.isCompleted,
        practiceSet: summary,
      };
    });
  }, [exercises]);

  // Extract unique categories from practice sets (not individual sentences).
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
        ex.translation?.toLowerCase().includes(q);

      const matchDifficulty =
        selectedDifficulty === "ALL" ||
        (ex.difficulty || "").toUpperCase() === selectedDifficulty;

      const matchCategory =
        selectedCategory === "ALL" ||
        (ex.category || "").toUpperCase() === selectedCategory.toUpperCase();

      const matchStatus =
        selectedStatus === "ALL" ||
        (selectedStatus === "COMPLETED" && Boolean(ex.isCompleted)) ||
        (selectedStatus === "UNCOMPLETED" && !ex.isCompleted);

      return matchSearch && matchDifficulty && matchCategory && matchStatus;
    });

    return list.sort((a, b) => {
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
      // NEWEST
      return (b.id || 0) - (a.id || 0);
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

  return (
    <div className="space-y-6 pb-20 pt-2">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-purple-200/80 dark:border-purple-900/40 bg-gradient-to-r from-purple-50 via-white to-fuchsia-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950 p-6 shadow-2xs sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 dark:border-purple-800/60 bg-white/90 dark:bg-slate-800 px-3 py-1 text-xs font-extrabold text-purple-700 dark:text-purple-300">
              <Mic size={14} aria-hidden="true" />
              <span>Đánh giá phát âm chuẩn xác</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
              Luyện phát âm & Giao tiếp tiếng Anh
            </h1>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 sm:text-sm">
              Rèn luyện kỹ năng phát âm tiếng Anh với công nghệ AI phân tích giọng nói, đánh giá độ chính xác, độ lưu loát và chấm điểm từng từ.
            </p>
            <div className="pt-1">
              <Link
                href="/practice/listening"
                className="inline-flex items-center gap-1.5 text-xs font-extrabold text-purple-700 dark:text-purple-400 transition hover:text-purple-800 dark:hover:text-purple-300 hover:underline"
              >
                Bạn muốn luyện nghe hiểu theo ngữ cảnh? Đi đến Luyện nghe
                <ArrowRight size={13} aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* Right KPI Card */}
          <div className="flex items-center gap-3.5 rounded-2xl border border-purple-200/90 dark:border-purple-900/50 bg-white/95 dark:bg-slate-900/95 px-5 py-4 shadow-2xs self-start md:self-auto shrink-0">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400">
              <Award size={24} aria-hidden="true" />
            </div>
            <div>
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                Tổng bài luyện nói
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-slate-900 dark:text-slate-100">
                  {practiceSets.length} bộ luyện · {exercises?.length || 0} câu
                </span>
                {completedCount > 0 && (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    ({completedCount} đã xong)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => {
              setSelectedCategory("ALL");
              setCurrentPage(1);
            }}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-black transition whitespace-nowrap cursor-pointer ${
              selectedCategory === "ALL"
                ? "border-purple-600 text-purple-900 dark:text-purple-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            <Mic size={15} aria-hidden="true" />
            Tất cả bộ luyện ({practiceSets.length})
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
                className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-black transition whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? "border-purple-600 text-purple-900 dark:text-purple-400"
                    : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Toolbar */}
      <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs sm:p-5">
        <div className="flex flex-col gap-3.5">
          {/* Top row: Search & Level quick filter */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-xs">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                aria-hidden="true"
              />
              <input
                type="text"
                placeholder="Tìm bài nói theo tên, câu tiếng Anh..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="min-h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-3.5 text-xs text-slate-800 dark:text-slate-100 transition placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-purple-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500">Trình độ:</span>
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
                  className={`min-h-9 rounded-lg px-2.5 text-xs font-extrabold transition cursor-pointer ${
                    selectedDifficulty === lvl.id
                      ? "bg-purple-600 text-white shadow-2xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Secondary filter row: Sort & Status */}
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
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
              className="min-h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 transition focus:border-purple-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden cursor-pointer"
            >
              <option value="EASY_TO_HARD">Sắp xếp: Dễ → Khó</option>
              <option value="HARD_TO_EASY">Sắp xếp: Khó → Dễ</option>
              <option value="NEWEST">Sắp xếp: Mới nhất</option>
            </select>

            {/* Trạng thái (nếu đã đăng nhập) */}
            {user && (
              <select
                aria-label="Lọc theo trạng thái"
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="min-h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 transition focus:border-purple-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">Trạng thái: Tất cả</option>
                <option value="UNCOMPLETED">Chưa làm</option>
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
            <Loader2 size={32} className="animate-spin text-purple-600" aria-hidden="true" />
            <p className="mt-3 text-xs font-bold text-slate-500 dark:text-slate-400">Đang tải danh sách bài luyện nói...</p>
          </div>
        ) : filteredAndSortedExercises.length > 0 ? (
          <div className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {paginatedExercises.map((exercise) => (
                <SpeakingExerciseCard
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
