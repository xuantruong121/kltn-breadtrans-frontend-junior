"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Filter,
  Headphones,
  Loader2,
  PenLine,
  RotateCcw,
  Search,
  Volume2,
} from "lucide-react";
import { quizService, type ListeningPracticeCatalogItem } from "@/lib/api/services/quiz.service";
import { useAuthStore } from "@/stores/authStore";
import { AuthGateModal } from "@/components/auth/AuthGateModal";
import { ListeningExerciseCard } from "./components/ListeningExerciseCard";
import { PracticeLoadingScreen } from "@/components/practice/PracticeLoadingScreen";

const EMPTY_QUIZZES: ListeningPracticeCatalogItem[] = [];

function ListeningCatalogContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();

  const [authGate, setAuthGate] = useState<{
    open: boolean;
    quiz?: ListeningPracticeCatalogItem;
  }>({ open: false });

  const [launchingQuiz, setLaunchingQuiz] = useState<ListeningPracticeCatalogItem | null>(null);

  useEffect(() => {
    if (!launchingQuiz) return;

    let animId2: number;

    const animId1 = requestAnimationFrame(() => {
      animId2 = requestAnimationFrame(() => {
        router.push(`/practice/quizzes/${launchingQuiz.id}`);
      });
    });

    return () => {
      cancelAnimationFrame(animId1);
      if (animId2) cancelAnimationFrame(animId2);
    };
  }, [launchingQuiz, router]);

  const handleStartQuiz = (quiz: ListeningPracticeCatalogItem) => {
    if (!user) {
      setAuthGate({ open: true, quiz });
      return;
    }
    if (launchingQuiz) return;
    setLaunchingQuiz(quiz);
  };

  // Filter values from URL search params
  const modeParam = (searchParams.get("mode") || "ALL").toUpperCase();
  const levelParam = (searchParams.get("level") || "ALL").toUpperCase();
  const topicParam = searchParams.get("topic") || "ALL";
  const accentParam = (searchParams.get("accent") || "ALL").toUpperCase();
  const statusParam = (searchParams.get("status") || "ALL").toUpperCase();
  const searchQuery = searchParams.get("q") || "";

  // Fetch catalog
  const { data: quizzesData, isLoading, isError, refetch } = useQuery({
    queryKey: ["listeningPractices"],
    queryFn: quizService.getListeningPractices,
  });

  const quizzes = useMemo(() => {
    return Array.isArray(quizzesData) ? quizzesData : EMPTY_QUIZZES;
  }, [quizzesData]);

  // Helper to update query params
  const setQueryParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "ALL" || !value.trim()) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Derive unique topics across all available quizzes
  const allTopics = useMemo(() => {
    const set = new Set<string>();
    quizzes.forEach((q) => {
      if (Array.isArray(q.topics)) {
        q.topics.forEach((t) => {
          if (t && typeof t === "string") set.add(t);
        });
      }
    });
    return Array.from(set);
  }, [quizzes]);

  // Tab counts
  const comprehensionCount = useMemo(
    () => quizzes.filter((q) => (q.mode || "COMPREHENSION").toUpperCase() === "COMPREHENSION").length,
    [quizzes],
  );
  const dictationCount = useMemo(
    () => quizzes.filter((q) => (q.mode || "").toUpperCase() === "DICTATION").length,
    [quizzes],
  );

  // Filter quizzes
  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((q) => {
      // Mode filter
      const qMode = (q.mode || "COMPREHENSION").toUpperCase();
      if (modeParam === "COMPREHENSION" && qMode !== "COMPREHENSION") return false;
      if (modeParam === "DICTATION" && qMode !== "DICTATION") return false;

      // Level filter
      if (levelParam !== "ALL") {
        const qLevels = Array.isArray(q.levels) ? q.levels.map((l) => l.toUpperCase()) : [];
        if (!qLevels.includes(levelParam)) return false;
      }

      // Topic filter
      if (topicParam !== "ALL") {
        const qTopics = Array.isArray(q.topics) ? q.topics : [];
        if (!qTopics.includes(topicParam)) return false;
      }

      // Accent filter
      if (accentParam !== "ALL") {
        const qAccents = Array.isArray(q.accents) ? q.accents.map((a) => a.toUpperCase()) : [];
        if (!qAccents.includes(accentParam)) return false;
      }

      // Completion status filter
      if (statusParam === "COMPLETED" && !q.isCompleted) return false;
      if (statusParam === "UNCOMPLETED" && q.isCompleted) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = q.title?.toLowerCase().includes(query);
        const matchesDesc = q.description?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc) return false;
      }

      return true;
    });
  }, [quizzes, modeParam, levelParam, topicParam, accentParam, statusParam, searchQuery]);

  if (launchingQuiz) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center py-12">
        <PracticeLoadingScreen
          skill="listening"
          mainText="Đậu đang chuẩn bị bài luyện cho bạn"
          secondaryText={`Đang mở bài nghe: ${launchingQuiz.title}`}
          className="max-w-4xl"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 pt-2">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-sky-50 p-6 shadow-2xs sm:p-8">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-white/90 px-3 py-1 text-xs font-extrabold text-blue-700">
            <Headphones size={14} aria-hidden="true" />
            <span>Kỹ năng nghe hiểu tiếng Anh</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Luyện nghe theo ngữ cảnh thực tế
          </h1>
          <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">
            Nâng cao khả năng phản xạ và nắm bắt ý chính qua các đoạn hội thoại thường ngày, du lịch và công việc.
          </p>

          {/* Secondary link to TOEIC */}
          <div className="pt-1">
            <Link
              href="/practice/quizzes"
              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-blue-700 transition hover:text-blue-800 hover:underline"
            >
              Bạn muốn làm bài thi TOEIC đầy đủ? Đi đến Kho đề TOEIC
              <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* Mode Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setQueryParam("mode", "ALL")}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-black transition ${
              modeParam === "ALL"
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Headphones size={15} aria-hidden="true" />
            Tất cả bài nghe ({quizzes.length})
          </button>

          <button
            type="button"
            onClick={() => setQueryParam("mode", "COMPREHENSION")}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-black transition ${
              modeParam === "COMPREHENSION"
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Volume2 size={15} aria-hidden="true" />
            Nghe hiểu ({comprehensionCount})
          </button>

          <button
            type="button"
            onClick={() => setQueryParam("mode", "DICTATION")}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-black transition ${
              modeParam === "DICTATION"
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <PenLine size={15} aria-hidden="true" />
            Nghe chép ({dictationCount})
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs sm:p-5">
        <div className="flex flex-col gap-3.5">
          {/* Top filter row: Search & Level */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Search Input */}
            <div className="relative flex-1 sm:max-w-xs">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="text"
                placeholder="Tìm kiếm bài nghe..."
                value={searchQuery}
                onChange={(e) => setQueryParam("q", e.target.value)}
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 text-xs text-slate-800 transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden"
              />
            </div>

            {/* Level Quick Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-400">Trình độ:</span>
              {["ALL", "A1", "A2", "B1", "B2"].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setQueryParam("level", lvl)}
                  className={`min-h-9 rounded-lg px-2.5 text-xs font-extrabold transition ${
                    levelParam === lvl
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                  }`}
                >
                  {lvl === "ALL" ? "Tất cả" : lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Secondary filter row: Topic, Accent, Status */}
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500">
              <Filter size={13} aria-hidden="true" />
              Bộ lọc:
            </span>

            {/* Topic Select */}
            {allTopics.length > 0 && (
              <select
                aria-label="Lọc theo chủ đề"
                value={topicParam}
                onChange={(e) => setQueryParam("topic", e.target.value)}
                className="min-h-9 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold text-slate-700 transition focus:border-blue-500 focus:bg-white focus:outline-hidden"
              >
                <option value="ALL">Chủ đề: Tất cả</option>
                {allTopics.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>
            )}

            {/* Accent Select */}
            <select
              aria-label="Lọc theo giọng đọc"
              value={accentParam}
              onChange={(e) => setQueryParam("accent", e.target.value)}
              className="min-h-9 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold text-slate-700 transition focus:border-blue-500 focus:bg-white focus:outline-hidden"
            >
              <option value="ALL">Giọng đọc: Tất cả</option>
              <option value="US">Giọng Mỹ (US)</option>
              <option value="UK">Giọng Anh (UK)</option>
            </select>

            {/* Completion Status Select (if authenticated) */}
            {user && (
              <select
                aria-label="Lọc theo trạng thái"
                value={statusParam}
                onChange={(e) => setQueryParam("status", e.target.value)}
                className="min-h-9 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold text-slate-700 transition focus:border-blue-500 focus:bg-white focus:outline-hidden"
              >
                <option value="ALL">Trạng thái: Tất cả</option>
                <option value="UNCOMPLETED">Chưa làm</option>
                <option value="COMPLETED">Đã hoàn thành</option>
              </select>
            )}

            {/* Reset filters button */}
            {(levelParam !== "ALL" ||
              topicParam !== "ALL" ||
              accentParam !== "ALL" ||
              statusParam !== "ALL" ||
              Boolean(searchQuery)) && (
              <button
                type="button"
                onClick={() => {
                  const params = new URLSearchParams();
                  if (modeParam !== "ALL") params.set("mode", modeParam);
                  router.replace(`${pathname}?${params.toString()}`, { scroll: false });
                }}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
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
          <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <Loader2 size={32} className="animate-spin text-blue-600" aria-hidden="true" />
            <p className="mt-3 text-xs font-bold text-slate-500">Đang tải danh sách bài nghe...</p>
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <p className="text-sm font-bold text-slate-700">
              Không thể tải danh sách bài nghe. Vui lòng thử lại.
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-blue-600 px-5 text-xs font-extrabold text-white transition hover:bg-blue-700"
            >
              <RotateCcw size={14} aria-hidden="true" />
              Tải lại
            </button>
          </div>
        ) : modeParam === "DICTATION" && dictationCount === 0 ? (
          /* Honest Empty State for Dictation */
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center sm:p-16">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <PenLine size={28} aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-base font-extrabold text-slate-900 sm:text-lg">
              Chưa có bài tập Nghe chép chính tả
            </h2>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-600 sm:text-sm">
              Đội ngũ học thuật đang biên soạn nội dung nghe chép theo từng chủ đề. Bạn có thể luyện tập các bài Nghe hiểu trong khi chờ đợi.
            </p>
            <button
              type="button"
              onClick={() => setQueryParam("mode", "COMPREHENSION")}
              className="mt-6 inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-blue-600 px-5 text-xs font-extrabold text-white shadow-xs transition hover:bg-blue-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Khám phá bài Nghe hiểu
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
        ) : filteredQuizzes.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {filteredQuizzes.map((quiz) => (
              <ListeningExerciseCard
                key={quiz.id}
                quiz={quiz}
                isAuthenticated={Boolean(user)}
                onOpenAuthGate={(q) => setAuthGate({ open: true, quiz: q })}
                onStart={handleStartQuiz}
                isLaunching={Boolean(launchingQuiz)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <Headphones size={32} className="mx-auto text-slate-400" aria-hidden="true" />
            <h2 className="mt-3 text-base font-bold text-slate-800">
              Không tìm thấy bài nghe phù hợp
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Hãy thử chọn bộ lọc khác hoặc tìm kiếm với từ khóa khác.
            </p>
          </div>
        )}
      </section>

      {/* Guest AuthGateModal */}
      <AuthGateModal
        isOpen={authGate.open}
        onClose={() => setAuthGate({ open: false })}
        targetLabel={authGate.quiz?.title ? `bài nghe "${authGate.quiz.title}"` : "bài luyện nghe này"}
        targetRoute={authGate.quiz ? `/practice/quizzes/${authGate.quiz.id}` : "/practice/listening"}
        onOpenLogin={() => router.push("/login")}
        onOpenRegister={() => router.push("/register")}
      />
    </div>
  );
}

export default function ListeningPracticePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-72 items-center justify-center">
          <Loader2 size={32} className="animate-spin text-blue-600" aria-label="Đang tải trang luyện nghe" />
        </div>
      }
    >
      <ListeningCatalogContent />
    </Suspense>
  );
}
