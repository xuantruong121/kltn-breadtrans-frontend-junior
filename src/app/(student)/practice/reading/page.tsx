"use client";

import { useState, useMemo, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  BookOpenCheck,
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
import { useAuthStore } from "@/stores/authStore";
import { useGamificationStore } from "@/stores/gamificationStore";
import { AuthGateModal } from "@/components/auth/AuthGateModal";
import { ReadingTopicCard, type ReadingTopicItem } from "./components/ReadingTopicCard";
import {
  type DifficultyLevel,
  matchesReadingDifficulty,
} from "./components/readingCardLogic";
import { GrammarScreen } from "@/modules/grammar/screens/GrammarScreen";

const DIFFICULTY_OPTIONS: Array<{ id: DifficultyLevel; label: string }> = [
  { id: "ALL", label: "Tất cả" },
  { id: "BASIC", label: "Cơ bản" },
  { id: "INTERMEDIATE", label: "Trung cấp" },
  { id: "ADVANCED", label: "Nâng cao" },
];

function ReadingTopicsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeMode =
    searchParams.get("tab") === "grammar" || searchParams.get("mode") === "grammar"
      ? "grammar"
      : "reading";

  const handleModeChange = (mode: "reading" | "grammar") => {
    if (mode === "grammar") {
      router.push("/practice/reading?tab=grammar", { scroll: false });
    } else {
      router.push("/practice/reading", { scroll: false });
    }
  };

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

  const { data: topicsData, isLoading } = useQuery({
    queryKey: ["reading-topics"],
    queryFn: readingService.getTopics,
  });

  const topics: ReadingTopicItem[] = useMemo(() => {
    return Array.isArray(topicsData) ? (topicsData as ReadingTopicItem[]) : [];
  }, [topicsData]);

  // Counts
  const completedCount = useMemo(() => {
    return topics.filter(
      (t) => (t.completedArticles || 0) >= (t.totalArticles || 0) && (t.totalArticles || 0) > 0,
    ).length;
  }, [topics]);

  // Filter & Sort
  const filteredAndSortedTopics = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const list = topics.filter((t) => {
      const name = (t.name || t.title || "").toLowerCase();
      const viName = (t.vietnameseName || t.description || "").toLowerCase();
      const matchSearch = !q || name.includes(q) || viName.includes(q);

      const total = t.totalArticles || 0;
      const completed = t.completedArticles || 0;
      const isDone = completed >= total && total > 0;
      const isInProg = completed > 0 && completed < total;

      const matchDifficulty = matchesReadingDifficulty(t.level || "BEGINNER", selectedDifficulty);

      const matchStatus =
        selectedStatus === "ALL" ||
        (selectedStatus === "COMPLETED" && isDone) ||
        (selectedStatus === "IN_PROGRESS" && isInProg) ||
        (selectedStatus === "UNCOMPLETED" && !isDone && !isInProg);

      return matchSearch && matchDifficulty && matchStatus;
    });

    const sorted = list.sort((a, b) => {
      if (sortOrder === "NAME_ASC") {
        const nameA = a.name || a.title || "";
        const nameB = b.name || b.title || "";
        return nameA.localeCompare(nameB);
      }
      if (sortOrder === "PROGRESS_DESC") {
        const pctA = (a.totalArticles || 0) > 0 ? (a.completedArticles || 0) / (a.totalArticles || 1) : 0;
        const pctB = (b.totalArticles || 0) > 0 ? (b.completedArticles || 0) / (b.totalArticles || 1) : 0;
        return pctB - pctA;
      }
      return (a.id || 0) - (b.id || 0);
    });

    // Tag the first uncompleted item as Spotlight
    let spotlightAssigned = false;
    return sorted.map((item) => {
      const isDone = (item.completedArticles || 0) >= (item.totalArticles || 0) && (item.totalArticles || 0) > 0;
      if (!isDone && !spotlightAssigned) {
        spotlightAssigned = true;
        return { ...item, isSpotlight: true };
      }
      return item;
    });
  }, [topics, searchTerm, selectedDifficulty, selectedStatus, sortOrder]);

  const handleStartTopic = (topic: ReadingTopicItem) => {
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

  const globalCompletionPct = Math.round(
    (completedCount / Math.max(1, topics.length)) * 100,
  );

  return (
    <div className="space-y-6 pb-20 pt-2">
      {/* Mode Switcher Tabs: Luyện đọc vs Ngữ pháp */}
      <div
        role="tablist"
        aria-label="Chế độ học Đọc và Ngữ pháp"
        className="flex items-center gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-3"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeMode === "reading"}
          aria-controls="reading-practice-panel"
          onClick={() => handleModeChange("reading")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeMode === "reading"
              ? "bg-amber-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
          }`}
        >
          <BookOpen size={16} aria-hidden="true" />
          <span>Luyện đọc</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeMode === "grammar"}
          aria-controls="grammar-practice-panel"
          onClick={() => handleModeChange("grammar")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeMode === "grammar"
              ? "bg-amber-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
          }`}
        >
          <BookOpenCheck size={16} aria-hidden="true" />
          <span>Ngữ pháp</span>
        </button>
      </div>

      {activeMode === "grammar" ? (
        <section id="grammar-practice-panel" role="tabpanel" aria-label="Chuyên đề ngữ pháp">
          <GrammarScreen />
        </section>
      ) : (
        <div id="reading-practice-panel" role="tabpanel" aria-label="Luyện đọc hiểu" className="space-y-6">
          {/* Hero & Learning Progression Bar */}
          <section className="relative overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs sm:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 dark:border-violet-800/60 bg-violet-50/80 dark:bg-violet-950/40 px-3 py-1 text-xs font-bold text-violet-700 dark:text-violet-300">
              <BookOpen size={14} aria-hidden="true" />
              <span>Phòng Luyện Đọc & Tra Cứu Song Ngữ Thông Minh</span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
              Rèn luyện Đọc hiểu, Kỹ thuật Skim & Scan
            </h1>

            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 sm:text-sm">
              Phát triển vốn từ vựng học thuật, tư duy phân tích đoạn văn và kỹ năng đối chiếu dữ liệu ngữ cảnh theo chuẩn bài thi TOEIC & văn bản thương mại.
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
                  {completedCount}/{topics.length}
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  chủ đề hoàn thành
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${globalCompletionPct}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200/80 dark:border-slate-700/80 pt-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <span>Tổng số chủ đề: {topics.length}</span>
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
              placeholder="Tìm kiếm chủ đề đọc hiểu..."
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
            Hiển thị <span className="font-bold text-slate-900 dark:text-slate-100">{filteredAndSortedTopics.length}</span> chủ đề đọc hiểu
          </div>
        </div>

        {/* Row 2: Difficulty Chips, Status & Sort */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-3">
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

          {/* Sort, Status & Reset Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400">
              <Filter size={13} aria-hidden="true" />
              Bộ lọc:
            </span>

            {/* Sắp xếp */}
            <select
              aria-label="Sắp xếp chủ đề đọc"
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
                <option value="IN_PROGRESS">Đang đọc dở</option>
                <option value="COMPLETED">Đã hoàn thành</option>
              </select>
            )}

            {/* Đặt lại bộ lọc */}
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setSelectedDifficulty("ALL");
                setSortOrder("DEFAULT");
                setSelectedStatus("ALL");
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
              Đang tải danh sách chủ đề đọc hiểu...
            </p>
          </div>
        ) : filteredAndSortedTopics.length > 0 ? (
          <div className="grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredAndSortedTopics.map((topic) => (
              <ReadingTopicCard
                key={topic.id}
                topic={topic}
                isAuthenticated={Boolean(user)}
                onOpenAuthGate={() =>
                  setAuthGate({
                    open: true,
                    topicId: topic.id,
                    topicName: topic.name || topic.title,
                  })
                }
                onStart={handleStartTopic}
                isSpotlight={topic.isSpotlight}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-12 text-center">
            <BookOpen size={36} className="mx-auto text-slate-400 dark:text-slate-500 mb-3" aria-hidden="true" />
            <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200">
              Không tìm thấy chủ đề đọc hiểu phù hợp
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Hãy thử chọn bộ lọc khác hoặc tìm kiếm với từ khóa khác để khám phá các bài luyện có sẵn.
            </p>
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedDifficulty("ALL");
                  setSortOrder("DEFAULT");
                  setSelectedStatus("ALL");
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
        </div>
      )}

      {/* Guest AuthGateModal */}
      <AuthGateModal
        isOpen={authGate.open}
        onClose={() => setAuthGate({ open: false })}
        targetLabel={authGate.topicName ? `chủ đề "${authGate.topicName}"` : "chủ đề đọc hiểu này"}
        targetRoute={authGate.topicId ? `/practice/reading/${authGate.topicId}` : "/practice/reading"}
        onOpenLogin={() => router.push("/login")}
        onOpenRegister={() => router.push("/register")}
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
