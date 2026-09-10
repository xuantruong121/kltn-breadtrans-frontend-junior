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
  PenTool,
  RotateCcw,
  Search,
} from "lucide-react";
import { writingService } from "@/lib/api/services/writing.service";
import { PracticeLoadingScreen } from "@/components/practice/PracticeLoadingScreen";
import { useAuthStore } from "@/stores/authStore";
import { AuthGateModal } from "@/components/auth/AuthGateModal";
import { WritingTopicCard, type WritingTopicItem } from "./components/WritingTopicCard";

export default function WritingTopicsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState<"ALL" | "UNCOMPLETED" | "COMPLETED">("ALL");
  const [sortOrder, setSortOrder] = useState<"DEFAULT" | "NAME_ASC">("DEFAULT");
  const [launchingTopicId, setLaunchingTopicId] = useState<number | null>(null);
  const [authGate, setAuthGate] = useState<{
    open: boolean;
    topicId?: number;
    title?: string;
  }>({ open: false });

  useEffect(() => {
    if (!launchingTopicId) return;

    let animId2: number;

    const animId1 = requestAnimationFrame(() => {
      animId2 = requestAnimationFrame(() => {
        router.push(`/practice/writing/${launchingTopicId}`);
      });
    });

    return () => {
      cancelAnimationFrame(animId1);
      if (animId2) cancelAnimationFrame(animId2);
    };
  }, [launchingTopicId, router]);

  const { data: topicsData, isLoading, isError, refetch } = useQuery({
    queryKey: ["writing-topics"],
    queryFn: writingService.getTopics,
  });

  const topics: WritingTopicItem[] = useMemo(() => {
    const raw = (topicsData as any)?.quizzes || topicsData || [];
    return Array.isArray(raw) ? (raw as WritingTopicItem[]) : [];
  }, [topicsData]);

  // Completed count
  const completedCount = useMemo(() => {
    return topics.filter((t) => Boolean(t.isCompleted)).length;
  }, [topics]);

  // Filter & Sort
  const filteredTopics = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const list = topics.filter((t) => {
      const title = (t.topicName || t.title || "").toLowerCase();
      const desc = (t.description || "").toLowerCase();
      const matchSearch = !q || title.includes(q) || desc.includes(q);

      if (selectedTab === "COMPLETED") return matchSearch && Boolean(t.isCompleted);
      if (selectedTab === "UNCOMPLETED") return matchSearch && !t.isCompleted;
      return matchSearch;
    });

    return list.sort((a, b) => {
      if (sortOrder === "NAME_ASC") {
        const titleA = a.topicName || a.title || "";
        const titleB = b.topicName || b.title || "";
        return titleA.localeCompare(titleB);
      }
      return (a.id || 0) - (b.id || 0);
    });
  }, [topics, searchTerm, selectedTab, sortOrder]);

  const handleStartTopic = (topic: WritingTopicItem) => {
    if (!user) {
      setAuthGate({
        open: true,
        topicId: topic.id,
        title: topic.topicName || topic.title,
      });
      return;
    }
    if (launchingTopicId) return;
    setLaunchingTopicId(topic.id);
  };

  if (launchingTopicId) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center py-12">
        <PracticeLoadingScreen skill="writing" className="max-w-4xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 pt-2">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-rose-200/80 bg-gradient-to-r from-rose-50 via-white to-pink-50/40 p-6 shadow-2xs sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-white/90 px-3 py-1 text-xs font-extrabold text-rose-700">
              <PenTool size={14} aria-hidden="true" />
              <span>Kỹ năng viết chuẩn hóa & Phản xạ câu</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Luyện viết tiếng Anh thực chiến
            </h1>
            <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">
              Viết bài theo các chủ đề thực tế trong môi trường làm việc, nhận phân tích từ vựng, ngữ pháp và gợi ý chỉnh sửa chi tiết tức thì.
            </p>
            <div className="pt-1">
              <Link
                href="/practice/speaking"
                className="inline-flex items-center gap-1.5 text-xs font-extrabold text-rose-700 transition hover:text-rose-800 hover:underline"
              >
                Bạn muốn luyện phát âm trực tiếp? Đi đến Luyện nói
                <ArrowRight size={13} aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* Right KPI Card */}
          <div className="flex items-center gap-3.5 rounded-2xl border border-rose-200/90 bg-white/95 px-5 py-4 shadow-2xs self-start md:self-auto shrink-0">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
              <Award size={24} aria-hidden="true" />
            </div>
            <div>
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                Tổng bài luyện viết
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-slate-900">
                  {topics.length} đề bài
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
                ? "border-rose-600 text-rose-900"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <PenTool size={15} aria-hidden="true" />
            Tất cả bài viết ({topics.length})
          </button>

          <button
            type="button"
            onClick={() => setSelectedTab("UNCOMPLETED")}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-black transition whitespace-nowrap cursor-pointer ${
              selectedTab === "UNCOMPLETED"
                ? "border-rose-600 text-rose-900"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            Chưa làm ({topics.length - completedCount})
          </button>

          <button
            type="button"
            onClick={() => setSelectedTab("COMPLETED")}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-black transition whitespace-nowrap cursor-pointer ${
              selectedTab === "COMPLETED"
                ? "border-rose-600 text-rose-900"
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
                placeholder="Tìm kiếm đề bài viết..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 text-xs text-slate-800 transition placeholder:text-slate-400 focus:border-rose-500 focus:bg-white focus:outline-hidden"
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
              aria-label="Sắp xếp bài viết"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="min-h-9 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold text-slate-700 transition focus:border-rose-500 focus:bg-white focus:outline-hidden cursor-pointer"
            >
              <option value="DEFAULT">Sắp xếp: Mặc định</option>
              <option value="NAME_ASC">Sắp xếp: Tên A → Z</option>
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
            <Loader2 size={32} className="animate-spin text-rose-600" aria-hidden="true" />
            <p className="mt-3 text-xs font-bold text-slate-500">Đang tải danh sách bài viết...</p>
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <p className="text-sm font-bold text-slate-700">
              Không thể tải danh sách bài viết. Vui lòng thử lại.
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-rose-600 px-5 text-xs font-extrabold text-white transition hover:bg-rose-700 cursor-pointer"
            >
              <RotateCcw size={14} aria-hidden="true" />
              Tải lại
            </button>
          </div>
        ) : filteredTopics.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {filteredTopics.map((topic) => (
              <WritingTopicCard
                key={topic.id}
                topic={topic}
                isAuthenticated={Boolean(user)}
                onOpenAuthGate={(t) =>
                  setAuthGate({
                    open: true,
                    topicId: t.id,
                    title: t.topicName || t.title,
                  })
                }
                onStart={handleStartTopic}
                isLaunching={launchingTopicId === topic.id}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <PenTool size={32} className="mx-auto text-slate-400" aria-hidden="true" />
            <h2 className="mt-3 text-base font-bold text-slate-800">
              Không tìm thấy bài viết phù hợp
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
        targetLabel={authGate.title ? `bài luyện viết "${authGate.title}"` : "bài luyện viết này"}
        targetRoute={authGate.topicId ? `/practice/writing/${authGate.topicId}` : "/practice/writing"}
        onOpenLogin={() => router.push("/login")}
        onOpenRegister={() => router.push("/register")}
      />
    </div>
  );
}
