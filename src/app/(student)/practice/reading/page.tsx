"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Award,
  BookOpen,
  Filter,
  Loader2,
  RotateCcw,
  Search,
} from "lucide-react";
import { readingService } from "@/lib/api/services/reading.service";
import { useAuthStore } from "@/stores/authStore";
import { AuthGateModal } from "@/components/auth/AuthGateModal";
import { ReadingTopicCard, type ReadingTopicItem } from "./components/ReadingTopicCard";

export default function ReadingTopicsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState<"ALL" | "IN_PROGRESS" | "COMPLETED">("ALL");
  const [sortOrder, setSortOrder] = useState<"DEFAULT" | "NAME_ASC" | "PROGRESS_DESC">("DEFAULT");
  const [authGate, setAuthGate] = useState<{
    open: boolean;
    topicId?: number;
    topicName?: string;
  }>({ open: false });

  const { data: topicsData, isLoading, isError, refetch } = useQuery({
    queryKey: ["reading-topics"],
    queryFn: readingService.getTopics,
  });

  const topics: ReadingTopicItem[] = useMemo(() => {
    return Array.isArray(topicsData) ? (topicsData as ReadingTopicItem[]) : [];
  }, [topicsData]);

  // Counts
  const completedCount = useMemo(() => {
    return topics.filter(
      (t) => (t.completedArticles || 0) >= (t.totalArticles || 0) && (t.totalArticles || 0) > 0
    ).length;
  }, [topics]);

  const inProgressCount = useMemo(() => {
    return topics.filter((t) => {
      const c = t.completedArticles || 0;
      const total = t.totalArticles || 0;
      return c > 0 && c < total;
    }).length;
  }, [topics]);

  // Filter & Sort
  const filteredTopics = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const list = topics.filter((t) => {
      const name = (t.name || t.title || "").toLowerCase();
      const viName = (t.vietnameseName || t.description || "").toLowerCase();
      const matchSearch = !q || name.includes(q) || viName.includes(q);

      const total = t.totalArticles || 0;
      const completed = t.completedArticles || 0;
      const isDone = completed >= total && total > 0;
      const isInProg = completed > 0 && completed < total;

      if (selectedTab === "COMPLETED") return matchSearch && isDone;
      if (selectedTab === "IN_PROGRESS") return matchSearch && isInProg;
      return matchSearch;
    });

    return list.sort((a, b) => {
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
  }, [topics, searchTerm, selectedTab, sortOrder]);

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

  return (
    <div className="space-y-6 pb-20 pt-2">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50 via-white to-teal-50/40 p-6 shadow-2xs sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white/90 px-3 py-1 text-xs font-extrabold text-emerald-700">
              <BookOpen size={14} aria-hidden="true" />
              <span>Kỹ năng đọc hiểu & Song ngữ Anh - Việt</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Luyện đọc hiểu theo ngữ cảnh thực tế
            </h1>
            <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">
              Phát triển vốn từ vựng, ngữ pháp và phản xạ đọc hiểu nhanh chóng thông qua các chủ đề song ngữ tuyển chọn theo từng cấp độ.
            </p>
            <div className="pt-1">
              <Link
                href="/practice/listening"
                className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-700 transition hover:text-emerald-800 hover:underline"
              >
                Bạn muốn luyện nghe hiểu theo ngữ cảnh? Đi đến Luyện nghe
                <ArrowRight size={13} aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* Right KPI Card */}
          <div className="flex items-center gap-3.5 rounded-2xl border border-emerald-200/90 bg-white/95 px-5 py-4 shadow-2xs self-start md:self-auto shrink-0">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Award size={24} aria-hidden="true" />
            </div>
            <div>
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                Tổng chủ đề đọc
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-slate-900">
                  {topics.length} chủ đề
                </span>
                {completedCount > 0 && (
                  <span className="text-xs font-bold text-emerald-600">
                    ({completedCount} đã xong)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedTab("ALL")}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-black transition whitespace-nowrap cursor-pointer ${
              selectedTab === "ALL"
                ? "border-emerald-600 text-emerald-900"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <BookOpen size={15} aria-hidden="true" />
            Tất cả chủ đề ({topics.length})
          </button>

          <button
            type="button"
            onClick={() => setSelectedTab("IN_PROGRESS")}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-black transition whitespace-nowrap cursor-pointer ${
              selectedTab === "IN_PROGRESS"
                ? "border-emerald-600 text-emerald-900"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            Đang học ({inProgressCount})
          </button>

          <button
            type="button"
            onClick={() => setSelectedTab("COMPLETED")}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-black transition whitespace-nowrap cursor-pointer ${
              selectedTab === "COMPLETED"
                ? "border-emerald-600 text-emerald-900"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            Đã hoàn thành ({completedCount})
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs sm:p-5">
        <div className="flex flex-col gap-3.5">
          {/* Top row: Search */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-xs">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="text"
                placeholder="Tìm kiếm chủ đề bài đọc..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 text-xs text-slate-800 transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          {/* Secondary filter row: Sort & Reset */}
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500">
              <Filter size={13} aria-hidden="true" />
              Bộ lọc:
            </span>

            {/* Sắp xếp */}
            <select
              aria-label="Sắp xếp chủ đề"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="min-h-9 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold text-slate-700 transition focus:border-emerald-500 focus:bg-white focus:outline-hidden cursor-pointer"
            >
              <option value="DEFAULT">Sắp xếp: Mặc định</option>
              <option value="NAME_ASC">Sắp xếp: Tên A → Z</option>
              <option value="PROGRESS_DESC">Sắp xếp: Tiến độ cao nhất</option>
            </select>

            {/* Reset filters */}
            {(selectedTab !== "ALL" || sortOrder !== "DEFAULT" || Boolean(searchTerm)) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedTab("ALL");
                  setSortOrder("DEFAULT");
                  setSearchTerm("");
                }}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
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
            <Loader2 size={32} className="animate-spin text-emerald-600" aria-hidden="true" />
            <p className="mt-3 text-xs font-bold text-slate-500">Đang tải danh sách bài đọc...</p>
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <p className="text-sm font-bold text-slate-700">
              Không thể tải danh sách bài đọc. Vui lòng thử lại.
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-emerald-600 px-5 text-xs font-extrabold text-white transition hover:bg-emerald-700 cursor-pointer"
            >
              <RotateCcw size={14} aria-hidden="true" />
              Tải lại
            </button>
          </div>
        ) : filteredTopics.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {filteredTopics.map((topic) => (
              <ReadingTopicCard
                key={topic.id}
                topic={topic}
                isAuthenticated={Boolean(user)}
                onOpenAuthGate={(t) =>
                  setAuthGate({
                    open: true,
                    topicId: t.id,
                    topicName: t.name || t.title,
                  })
                }
                onStart={handleStartTopic}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <BookOpen size={32} className="mx-auto text-slate-400" aria-hidden="true" />
            <h2 className="mt-3 text-base font-bold text-slate-800">
              Không tìm thấy chủ đề đọc phù hợp
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
        targetLabel={authGate.topicName ? `chủ đề "${authGate.topicName}"` : "bài đọc này"}
        targetRoute={authGate.topicId ? `/practice/reading/${authGate.topicId}` : "/practice/reading"}
        onOpenLogin={() => router.push("/login")}
        onOpenRegister={() => router.push("/register")}
      />
    </div>
  );
}
